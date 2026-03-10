export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

// GET - Get ticket relations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId");

    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
    }

    // Verify access
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, isActive: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        project: { organizationId: membership.organizationId },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Get dependencies (this ticket depends on others)
    const dependencies = await prisma.ticketDependency.findMany({
      where: { ticketId },
      include: {
        dependsOn: {
          include: {
            project: { select: { name: true, key: true } },
            assignee: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Get dependents (others depend on this ticket)
    const dependents = await prisma.ticketDependency.findMany({
      where: { dependsOnId: ticketId },
      include: {
        ticket: {
          include: {
            project: { select: { name: true, key: true } },
            assignee: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Get parent and subtasks
    const parent = ticket.parentId
      ? await prisma.ticket.findFirst({
          where: { id: ticket.parentId },
          include: {
            project: { select: { name: true, key: true } },
          },
        })
      : null;

    const subtasks = await prisma.ticket.findMany({
      where: { parentId: ticketId },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    // Get related tickets (same epic/milestone/component)
    const related = await prisma.ticket.findMany({
      where: {
        id: { not: ticketId },
        projectId: ticket.projectId,
        OR: [
          { milestoneId: ticket.milestoneId },
          { componentId: ticket.componentId },
          { sprintId: ticket.sprintId },
        ].filter(Boolean),
      },
      take: 10,
      include: {
        project: { select: { name: true, key: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      dependencies: dependencies.map(d => ({
        id: d.id,
        type: d.type,
        ticket: {
          id: d.dependsOn.id,
          key: d.dependsOn.key,
          title: d.dependsOn.title,
          status: d.dependsOn.status,
          priority: d.dependsOn.priority,
          project: d.dependsOn.project,
          assignee: d.dependsOn.assignee,
        },
      })),
      dependents: dependents.map(d => ({
        id: d.id,
        type: d.type,
        ticket: {
          id: d.ticket.id,
          key: d.ticket.key,
          title: d.ticket.title,
          status: d.ticket.status,
          priority: d.ticket.priority,
          project: d.ticket.project,
          assignee: d.ticket.assignee,
        },
      })),
      parent: parent
        ? {
            id: parent.id,
            key: parent.key,
            title: parent.title,
            status: parent.status,
            project: parent.project,
          }
        : null,
      subtasks: subtasks.map(s => ({
        id: s.id,
        key: s.key,
        title: s.title,
        status: s.status,
        progress: s.progress,
        assignee: s.assignee,
      })),
      related: related.map(r => ({
        id: r.id,
        key: r.key,
        title: r.title,
        status: r.status,
        priority: r.priority,
        project: r.project,
        assignee: r.assignee,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch ticket relations:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket relations" },
      { status: 500 }
    );
  }
}

// POST - Create a ticket relation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, dependsOnId, type, parentId } = body;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, isActive: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Handle parent/subtask relationship
    if (parentId !== undefined) {
      const ticket = await prisma.ticket.findFirst({
        where: {
          id: ticketId,
          project: { organizationId: membership.organizationId },
        },
      });

      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }

      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { parentId: parentId || null },
      });

      return NextResponse.json({ ticket: updated });
    }

    // Handle dependency relationship
    if (!ticketId || !dependsOnId) {
      return NextResponse.json(
        { error: "Ticket ID and dependsOnId are required" },
        { status: 400 }
      );
    }

    // Prevent self-reference
    if (ticketId === dependsOnId) {
      return NextResponse.json(
        { error: "Cannot create circular dependency" },
        { status: 400 }
      );
    }

    // Verify both tickets exist and user has access
    const [ticket, dependsOnTicket] = await Promise.all([
      prisma.ticket.findFirst({
        where: {
          id: ticketId,
          project: { organizationId: membership.organizationId },
        },
      }),
      prisma.ticket.findFirst({
        where: {
          id: dependsOnId,
          project: { organizationId: membership.organizationId },
        },
      }),
    ]);

    if (!ticket || !dependsOnTicket) {
      return NextResponse.json({ error: "Ticket(s) not found" }, { status: 404 });
    }

    // Check for existing relation
    const existing = await prisma.ticketDependency.findUnique({
      where: {
        ticketId_dependsOnId: { ticketId, dependsOnId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Relation already exists" },
        { status: 400 }
      );
    }

    const relation = await prisma.ticketDependency.create({
      data: {
        ticketId,
        dependsOnId,
        type: type || "blocks",
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        organizationId: membership.organizationId,
        projectId: ticket.projectId,
        ticketId,
        userId: session.user.id,
        type: "UPDATED",
        description: `Added ${type || "blocks"} relation to ${dependsOnTicket.key}`,
      },
    });

    return NextResponse.json({ relation });
  } catch (error) {
    console.error("Failed to create ticket relation:", error);
    return NextResponse.json(
      { error: "Failed to create ticket relation" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a ticket relation
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const relationId = searchParams.get("id");

    if (!relationId) {
      return NextResponse.json({ error: "Relation ID required" }, { status: 400 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, isActive: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Verify relation exists and user has access
    const relation = await prisma.ticketDependency.findFirst({
      where: { id: relationId },
      include: {
        ticket: { include: { project: true } },
      },
    });

    if (!relation) {
      return NextResponse.json({ error: "Relation not found" }, { status: 404 });
    }

    if (relation.ticket.project.organizationId !== membership.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.ticketDependency.delete({ where: { id: relationId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete ticket relation:", error);
    return NextResponse.json(
      { error: "Failed to delete ticket relation" },
      { status: 500 }
    );
  }
}
