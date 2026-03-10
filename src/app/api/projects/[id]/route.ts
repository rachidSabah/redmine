import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";
import { auditService } from "@/lib/services/audit.service";

// GET - Get project details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;

    const project = await db.project.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        milestones: {
          where: { deletedAt: null },
          orderBy: { dueDate: "asc" },
        },
        modules: {
          where: { deletedAt: null },
          orderBy: { name: "asc" },
        },
        components: {
          where: { deletedAt: null },
          orderBy: { name: "asc" },
        },
        sprints: {
          where: { deletedAt: null },
          orderBy: { startDate: "desc" },
        },
        kanbanColumns: {
          orderBy: { order: "asc" },
        },
        customFields: {
          where: { deletedAt: null },
        },
        _count: {
          select: { 
            tickets: { where: { deletedAt: null } },
            members: true,
          },
        },
      },
    });

    if (!project) {
      return ApiErrors.notFound("Project not found");
    }

    return apiSuccess({ project });
  } catch (error) {
    console.error("Error fetching project:", error);
    return ApiErrors.internal("Failed to fetch project", error);
  }
}

// PATCH - Update project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return ApiErrors.forbidden();
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      key,
      description,
      status,
      startDate,
      endDate,
      isPublic,
      color,
      icon,
    } = body;

    // Get existing project
    const existingProject = await db.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return ApiErrors.notFound("Project not found");
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (key !== undefined) updateData.key = key.toUpperCase();
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;

    // Check if key is unique if changed
    if (key && key.toUpperCase() !== existingProject.key) {
      const keyExists = await db.project.findFirst({
        where: {
          organizationId: existingProject.organizationId,
          key: key.toUpperCase(),
          NOT: { id },
        },
      });
      if (keyExists) {
        return ApiErrors.badRequest("Project key already exists");
      }
    }

    // Update project
    const project = await db.project.update({
      where: { id },
      data: updateData,
      include: {
        organization: {
          select: { id: true, name: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    // Create activity
    await db.activity.create({
      data: {
        organizationId: existingProject.organizationId,
        projectId: id,
        userId: user.id,
        type: "UPDATED",
        description: `Updated project ${existingProject.name}`,
        metadata: { changes: Object.keys(updateData) },
      },
    });

    // Log the action
    await auditService.log({
      organizationId: existingProject.organizationId,
      projectId: id,
      entityType: "PROJECT",
      entityId: id,
      action: "UPDATE",
      oldValue: { name: existingProject.name, key: existingProject.key },
      newValue: updateData,
      performedBy: user.id,
    });

    return apiSuccess({ project });
  } catch (error) {
    console.error("Error updating project:", error);
    return ApiErrors.internal("Failed to update project", error);
  }
}

// DELETE - Delete project (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return ApiErrors.forbidden();
    }

    const { id } = await params;

    // Get existing project
    const existingProject = await db.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return ApiErrors.notFound("Project not found");
    }

    // Soft delete project
    await db.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: user.id,
        status: "ARCHIVED",
      },
    });

    // Soft delete related tickets
    await db.ticket.updateMany({
      where: { projectId: id },
      data: {
        deletedAt: new Date(),
        deletedBy: user.id,
        status: "ARCHIVED",
      },
    });

    // Log the action
    await auditService.log({
      organizationId: existingProject.organizationId,
      entityType: "PROJECT",
      entityId: id,
      action: "SOFT_DELETE",
      oldValue: { name: existingProject.name, key: existingProject.key },
      performedBy: user.id,
    });

    return apiSuccess({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    return ApiErrors.internal("Failed to delete project", error);
  }
}
