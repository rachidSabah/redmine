export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - List all sprints
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    // Get user's organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ sprints: [] });
    }

    const whereClause: any = {};
    if (projectId) {
      whereClause.projectId = projectId;
      // Verify project belongs to user's organization
      const project = await prisma.project.findFirst({
        where: { id: projectId, organizationId: membership.organizationId },
      });
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    } else {
      // Get all projects in organization
      const projects = await prisma.project.findMany({
        where: { organizationId: membership.organizationId },
        select: { id: true },
      });
      whereClause.projectId = { in: projects.map(p => p.id) };
    }

    const sprints = await prisma.sprint.findMany({
      where: whereClause,
      include: {
        project: { select: { id: true, name: true, key: true } },
        tickets: {
          select: { id: true, key: true, title: true, status: true, storyPoints: true },
        },
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({ sprints });
  } catch (error) {
    console.error("Failed to fetch sprints:", error);
    return NextResponse.json(
      { error: "Failed to fetch sprints" },
      { status: 500 }
    );
  }
}

// POST - Create a new sprint
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, goal, startDate, endDate, projectId } = body;

    if (!name || !startDate || !endDate || !projectId) {
      return NextResponse.json(
        { error: "Name, dates, and project are required" },
        { status: 400 }
      );
    }

    // Get user's organization and verify project access
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: membership.organizationId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const sprint = await prisma.sprint.create({
      data: {
        name,
        goal,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        projectId,
      },
      include: {
        project: { select: { id: true, name: true, key: true } },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        organizationId: membership.organizationId,
        projectId,
        userId: session.user.id,
        type: "CREATED",
        description: `Created sprint "${name}"`,
      },
    });

    return NextResponse.json({ sprint });
  } catch (error) {
    console.error("Failed to create sprint:", error);
    return NextResponse.json(
      { error: "Failed to create sprint" },
      { status: 500 }
    );
  }
}

// PUT - Update a sprint
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, goal, startDate, endDate, isActive, ticketIds } = body;

    if (!id) {
      return NextResponse.json({ error: "Sprint ID required" }, { status: 400 });
    }

    // Get user's organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Verify sprint belongs to user's organization
    const existingSprint = await prisma.sprint.findFirst({
      where: { id },
      include: { project: true },
    });

    if (!existingSprint || existingSprint.project.organizationId !== membership.organizationId) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (goal !== undefined) updateData.goal = goal;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) updateData.isActive = isActive;

    const sprint = await prisma.sprint.update({
      where: { id },
      data: updateData,
    });

    // Update ticket assignments if provided
    if (ticketIds) {
      await prisma.ticket.updateMany({
        where: { id: { in: ticketIds } },
        data: { sprintId: id },
      });
    }

    return NextResponse.json({ sprint });
  } catch (error) {
    console.error("Failed to update sprint:", error);
    return NextResponse.json(
      { error: "Failed to update sprint" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a sprint
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Sprint ID required" }, { status: 400 });
    }

    // Get user's organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Verify sprint belongs to user's organization
    const sprint = await prisma.sprint.findFirst({
      where: { id },
      include: { project: true },
    });

    if (!sprint || sprint.project.organizationId !== membership.organizationId) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Remove sprint from tickets
    await prisma.ticket.updateMany({
      where: { sprintId: id },
      data: { sprintId: null },
    });

    await prisma.sprint.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete sprint:", error);
    return NextResponse.json(
      { error: "Failed to delete sprint" },
      { status: 500 }
    );
  }
}
