import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET /api/time-logs - Get time logs
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId");
    const projectId = searchParams.get("projectId");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let whereClause: any = {};

    if (ticketId) whereClause.ticketId = ticketId;
    if (projectId) {
      whereClause.ticket = { projectId };
    }
    if (userId) whereClause.userId = userId;
    if (startDate || endDate) {
      whereClause.loggedAt = {};
      if (startDate) whereClause.loggedAt.gte = new Date(startDate);
      if (endDate) whereClause.loggedAt.lte = new Date(endDate);
    }

    const timeLogs = await prisma.timeLog.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        ticket: {
          select: { id: true, key: true, title: true },
          include: { project: { select: { id: true, name: true, key: true } } },
        },
      },
      orderBy: { loggedAt: "desc" },
    });

    // Calculate totals
    const totalHours = timeLogs.reduce((sum, log) => sum + log.hours, 0);

    return NextResponse.json({ timeLogs, totalHours });
  } catch (error) {
    console.error("Error fetching time logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch time logs" },
      { status: 500 }
    );
  }
}

// POST /api/time-logs - Log time
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { ticketId, hours, description, loggedAt } = body;

    if (!ticketId || !hours || hours <= 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const timeLog = await prisma.timeLog.create({
      data: {
        ticketId,
        userId: user.id,
        hours,
        description,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        ticket: { select: { id: true, key: true, title: true } },
      },
    });

    // Create activity
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { project: true },
    });

    if (ticket) {
      await prisma.activity.create({
        data: {
          organizationId: ticket.project.organizationId,
          projectId: ticket.projectId,
          ticketId,
          userId: user.id,
          type: "TIME_LOGGED",
          description: `logged ${hours}h on ${ticket.key}`,
          metadata: { hours },
        },
      });
    }

    return NextResponse.json({ timeLog }, { status: 201 });
  } catch (error) {
    console.error("Error creating time log:", error);
    return NextResponse.json(
      { error: "Failed to create time log" },
      { status: 500 }
    );
  }
}

// PUT /api/time-logs - Approve/reject time log
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { id, approved } = body;

    const timeLog = await prisma.timeLog.findUnique({
      where: { id },
      include: { ticket: { include: { project: { include: { members: true } } } } },
    });

    if (!timeLog) {
      return NextResponse.json({ error: "Time log not found" }, { status: 404 });
    }

    // Check permission (manager or above)
    const member = timeLog.ticket.project.members.find((m) => m.userId === user.id);
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN" && member.role !== "MANAGER")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const updatedLog = await prisma.timeLog.update({
      where: { id },
      data: {
        approved,
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    });

    return NextResponse.json({ timeLog: updatedLog });
  } catch (error) {
    console.error("Error updating time log:", error);
    return NextResponse.json(
      { error: "Failed to update time log" },
      { status: 500 }
    );
  }
}
