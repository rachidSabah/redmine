import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET - List roadmaps
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return NextResponse.json({ roadmaps: [] });
    }

    const where: any = { organizationId: membership.organizationId, isActive: true };
    if (projectId) where.projectId = projectId;

    const roadmaps = await prisma.roadmap.findMany({
      where,
      include: {
        milestones: {
          orderBy: { order: "asc" },
        },
        _count: { select: { milestones: true } },
      },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json({ roadmaps });
  } catch (error) {
    console.error("Error fetching roadmaps:", error);
    return NextResponse.json({ error: "Failed to fetch roadmaps" }, { status: 500 });
  }
}

// POST - Create roadmap
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, description, projectId, startDate, endDate, milestones } = body;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const roadmap = await prisma.roadmap.create({
      data: {
        organizationId: membership.organizationId,
        name,
        description,
        projectId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        milestones: milestones ? {
          create: milestones.map((m: any, index: number) => ({
            title: m.title,
            description: m.description,
            dueDate: new Date(m.dueDate),
            order: index,
          })),
        } : undefined,
      },
      include: {
        milestones: true,
      },
    });

    return NextResponse.json({ roadmap }, { status: 201 });
  } catch (error) {
    console.error("Error creating roadmap:", error);
    return NextResponse.json({ error: "Failed to create roadmap" }, { status: 500 });
  }
}

// PUT - Update roadmap
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Roadmap ID required" }, { status: 400 });
    }

    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const roadmap = await prisma.roadmap.update({
      where: { id },
      data,
      include: { milestones: true },
    });

    return NextResponse.json({ roadmap });
  } catch (error) {
    console.error("Error updating roadmap:", error);
    return NextResponse.json({ error: "Failed to update roadmap" }, { status: 500 });
  }
}

// DELETE - Delete roadmap
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Roadmap ID required" }, { status: 400 });
    }

    await prisma.roadmapMilestone.deleteMany({ where: { roadmapId: id } });
    await prisma.roadmap.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting roadmap:", error);
    return NextResponse.json({ error: "Failed to delete roadmap" }, { status: 500 });
  }
}
