import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { TicketStatus, TicketPriority, TicketType } from "@prisma/client";

// GET /api/tickets - Get tickets for current user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assigneeId = searchParams.get("assigneeId");
    const search = searchParams.get("search");

    // Get user's organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { joinedAt: "desc" },
    });

    if (!membership) {
      return NextResponse.json({ tickets: [] });
    }

    let whereClause: any = {
      project: { organizationId: membership.organizationId }
    };

    if (projectId) {
      whereClause.projectId = projectId;
    }

    if (status) {
      whereClause.status = status as TicketStatus;
    }
    if (priority) {
      whereClause.priority = priority as TicketPriority;
    }
    if (assigneeId) {
      whereClause.assigneeId = assigneeId;
    }
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { key: { contains: search, mode: "insensitive" } },
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        reporter: { select: { id: true, name: true, email: true, image: true } },
        project: { select: { id: true, name: true, key: true, color: true } },
        module: { select: { id: true, name: true, color: true } },
        milestone: { select: { id: true, name: true } },
        _count: { select: { comments: true, attachments: true, subtasks: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create ticket
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const {
      projectId,
      title,
      description,
      type = "TASK",
      status = "BACKLOG",
      priority = "MEDIUM",
      assigneeId,
      dueDate,
      estimatedHours,
      storyPoints,
      milestoneId,
      moduleId,
      parentId,
    } = body;

    if (!projectId || !title) {
      return NextResponse.json(
        { error: "Project ID and title are required" },
        { status: 400 }
      );
    }

    // Check project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { where: { userId: user.id } },
        organization: {
          include: { members: { where: { userId: user.id } } }
        }
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectMember = project.members[0];
    const orgMember = project.organization.members[0];

    if (!projectMember && !orgMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get next ticket number
    const lastTicket = await prisma.ticket.findFirst({
      where: { projectId },
      orderBy: { number: "desc" },
      select: { number: true },
    });

    const number = (lastTicket?.number || 0) + 1;
    const key = `${project.key}-${number}`;

    // Get the default Kanban column for the status
    const defaultColumn = await prisma.kanbanColumn.findFirst({
      where: { projectId },
      orderBy: { order: "asc" },
    });

    const ticket = await prisma.ticket.create({
      data: {
        projectId,
        number,
        key,
        title,
        description,
        type: type as TicketType,
        status: status as TicketStatus,
        priority: priority as TicketPriority,
        assigneeId: assigneeId || user.id,
        reporterId: user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours,
        storyPoints,
        milestoneId,
        moduleId,
        parentId,
        columnId: defaultColumn?.id,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        reporter: { select: { id: true, name: true, email: true, image: true } },
        project: { select: { id: true, name: true, key: true, color: true } },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        organizationId: project.organizationId,
        projectId,
        ticketId: ticket.id,
        userId: user.id,
        type: "CREATED",
        description: `created ticket ${key}`,
      },
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}

// PUT /api/tickets - Update ticket
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { id, ...data } = body;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Handle status change
    if (data.status && data.status !== ticket.status) {
      if (data.status === "DONE") {
        data.completedAt = new Date();
        data.progress = 100;
      }
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        reporter: { select: { id: true, name: true, email: true, image: true } },
        project: { select: { id: true, name: true, key: true, color: true } },
      },
    });

    // Create activity for status change
    if (data.status && data.status !== ticket.status) {
      await prisma.activity.create({
        data: {
          organizationId: ticket.project.organizationId,
          projectId: ticket.projectId,
          ticketId: ticket.id,
          userId: user.id,
          type: "STATUS_CHANGED",
          description: `changed status from ${ticket.status} to ${data.status}`,
          metadata: { from: ticket.status, to: data.status },
        },
      });
    }

    return NextResponse.json({ ticket: updatedTicket });
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets - Delete ticket
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            members: { where: { userId: user.id } },
            organization: {
              include: { members: { where: { userId: user.id } } }
            }
          }
        }
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const projectMember = ticket.project.members[0];
    const orgMember = ticket.project.organization.members[0];

    // Allow delete if user is project member with permission or org admin
    const canDelete = (projectMember && hasPermission(projectMember.role, "ticket.delete")) ||
                      (orgMember && hasPermission(orgMember.role, "ticket.delete"));

    if (!canDelete) {
      return NextResponse.json(
        { error: "Insufficient permissions to delete this ticket" },
        { status: 403 }
      );
    }

    await prisma.ticket.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return NextResponse.json(
      { error: "Failed to delete ticket" },
      { status: 500 }
    );
  }
}
