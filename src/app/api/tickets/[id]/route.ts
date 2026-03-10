import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";
import { auditService } from "@/lib/services/audit.service";

// GET - Get ticket details
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

    const ticket = await db.ticket.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            organization: true,
          },
        },
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        reporter: {
          select: { id: true, name: true, email: true, image: true },
        },
        milestone: true,
        module: true,
        component: true,
        sprint: true,
        column: true,
        parent: {
          select: { id: true, key: true, title: true },
        },
        subtasks: {
          where: { deletedAt: null },
          select: { id: true, key: true, title: true, status: true },
        },
        comments: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        attachments: true,
        timeLogs: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { loggedAt: "desc" },
        },
        tags: true,
        dependencies: {
          include: {
            dependsOn: { select: { id: true, key: true, title: true, status: true } },
          },
        },
        dependents: {
          include: {
            ticket: { select: { id: true, key: true, title: true, status: true } },
          },
        },
        customFieldValues: {
          include: {
            customField: true,
          },
        },
        _count: {
          select: { comments: true, attachments: true, timeLogs: true, subtasks: true },
        },
      },
    });

    if (!ticket) {
      return ApiErrors.notFound("Ticket not found");
    }

    return apiSuccess({ ticket });
  } catch (error) {
    console.error("Get ticket error:", error);
    return ApiErrors.internal("Failed to get ticket", error);
  }
}

// PATCH - Update ticket
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
    const {
      title,
      description,
      status,
      priority,
      type,
      assigneeId,
      milestoneId,
      moduleId,
      componentId,
      sprintId,
      columnId,
      dueDate,
      storyPoints,
      estimatedHours,
      progress,
    } = body;

    // Get current user
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return ApiErrors.forbidden();
    }

    // Get existing ticket
    const existingTicket = await db.ticket.findUnique({
      where: { id },
    });

    if (!existingTicket) {
      return ApiErrors.notFound("Ticket not found");
    }

    // Build update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      if (status === "DONE") {
        updateData.completedAt = new Date();
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (type !== undefined) updateData.type = type;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
    if (milestoneId !== undefined) updateData.milestoneId = milestoneId || null;
    if (moduleId !== undefined) updateData.moduleId = moduleId || null;
    if (componentId !== undefined) updateData.componentId = componentId || null;
    if (sprintId !== undefined) updateData.sprintId = sprintId || null;
    if (columnId !== undefined) updateData.columnId = columnId || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (storyPoints !== undefined) updateData.storyPoints = storyPoints;
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
    if (progress !== undefined) updateData.progress = progress;

    // Update ticket
    const updatedTicket = await db.ticket.update({
      where: { id },
      data: updateData,
    });

    // Create activity record
    await db.activity.create({
      data: {
        organizationId: existingTicket.projectId ? (await db.project.findUnique({ where: { id: existingTicket.projectId } }))?.organizationId || "" : "",
        projectId: existingTicket.projectId,
        ticketId: id,
        userId: currentUser.id,
        type: "UPDATED",
        description: `Updated ticket ${existingTicket.key}`,
        metadata: { changes: updateData },
      },
    });

    // Log the action
    await auditService.log({
      projectId: existingTicket.projectId,
      entityType: "TICKET",
      entityId: id,
      action: "UPDATE",
      oldValue: existingTicket,
      newValue: updateData,
      performedBy: currentUser.id,
    });

    return apiSuccess({ ticket: updatedTicket });
  } catch (error) {
    console.error("Update ticket error:", error);
    return ApiErrors.internal("Failed to update ticket", error);
  }
}

// DELETE - Delete ticket (soft delete)
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

    // Get current user
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return ApiErrors.forbidden();
    }

    // Get existing ticket
    const existingTicket = await db.ticket.findUnique({
      where: { id },
    });

    if (!existingTicket) {
      return ApiErrors.notFound("Ticket not found");
    }

    // Soft delete ticket
    await db.ticket.update({
      where: { id },
      data: {
        status: "ARCHIVED",
        deletedAt: new Date(),
        deletedBy: currentUser.id,
      },
    });

    // Log the action
    await auditService.log({
      projectId: existingTicket.projectId,
      entityType: "TICKET",
      entityId: id,
      action: "SOFT_DELETE",
      oldValue: { key: existingTicket.key, title: existingTicket.title },
      performedBy: currentUser.id,
    });

    return apiSuccess({ message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("Delete ticket error:", error);
    return ApiErrors.internal("Failed to delete ticket", error);
  }
}
