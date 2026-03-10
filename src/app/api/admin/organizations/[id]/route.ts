export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";
import { auditService } from "@/lib/services/audit.service";

// GET - Get organization details
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

    const organization = await db.organization.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        projects: {
          where: { deletedAt: null },
          select: { id: true, name: true, key: true, isActive: true },
        },
        _count: {
          select: { members: true, projects: true },
        },
      },
    });

    if (!organization) {
      return ApiErrors.notFound("Organization not found");
    }

    // Get org stats
    const stats = await db.ticket.count({
      where: {
        project: { organizationId: id },
        deletedAt: null,
      },
    });

    return apiSuccess({ 
      organization,
      stats: {
        totalTickets: stats,
      },
    });
  } catch (error) {
    console.error("Get organization error:", error);
    return ApiErrors.internal("Failed to get organization", error);
  }
}

// PATCH - Update organization
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, website, logo, isActive, subscriptionPlan, maxMembers, maxProjects } = body;

    // Check if current user is admin
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { role: { in: ["OWNER", "ADMIN"] } },
        },
      },
    });

    if (!currentUser) {
      return ApiErrors.forbidden("Admin access required");
    }

    // Get existing organization
    const existingOrg = await db.organization.findUnique({
      where: { id },
    });

    if (!existingOrg) {
      return ApiErrors.notFound("Organization not found");
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (website !== undefined) updateData.website = website;
    if (logo !== undefined) updateData.logo = logo;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (subscriptionPlan !== undefined) updateData.subscriptionPlan = subscriptionPlan;
    if (maxMembers !== undefined) updateData.maxMembers = maxMembers;
    if (maxProjects !== undefined) updateData.maxProjects = maxProjects;

    // Update organization
    const updatedOrg = await db.organization.update({
      where: { id },
      data: updateData,
    });

    // Log the action
    await auditService.log({
      organizationId: id,
      entityType: "ORGANIZATION",
      entityId: id,
      action: "UPDATE",
      oldValue: existingOrg,
      newValue: updateData,
      performedBy: currentUser.id,
    });

    return apiSuccess({ organization: updatedOrg });
  } catch (error) {
    console.error("Update organization error:", error);
    return ApiErrors.internal("Failed to update organization", error);
  }
}

// DELETE - Delete organization (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;

    // Check if current user is owner
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { role: "OWNER" },
        },
      },
    });

    if (!currentUser) {
      return ApiErrors.forbidden("Owner access required");
    }

    // Get existing organization
    const existingOrg = await db.organization.findUnique({
      where: { id },
    });

    if (!existingOrg) {
      return ApiErrors.notFound("Organization not found");
    }

    // Soft delete organization
    await db.organization.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: currentUser.id,
      },
    });

    // Soft delete all projects
    await db.project.updateMany({
      where: { organizationId: id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: currentUser.id,
      },
    });

    // Log the action
    await auditService.log({
      organizationId: id,
      entityType: "ORGANIZATION",
      entityId: id,
      action: "SOFT_DELETE",
      oldValue: { name: existingOrg.name },
      performedBy: currentUser.id,
    });

    return apiSuccess({ message: "Organization deleted successfully" });
  } catch (error) {
    console.error("Delete organization error:", error);
    return ApiErrors.internal("Failed to delete organization", error);
  }
}
