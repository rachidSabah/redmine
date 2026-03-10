export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET - List components for a project
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    const components = await prisma.component.findMany({
      where: { projectId },
      include: {
        _count: { select: { tickets: true } },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ components });
  } catch (error) {
    console.error("Error fetching components:", error);
    return NextResponse.json({ error: "Failed to fetch components" }, { status: 500 });
  }
}

// POST - Create component
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { projectId, name, description, color, leadId, defaultAssigneeId } = body;

    if (!projectId || !name) {
      return NextResponse.json({ error: "Project ID and name are required" }, { status: 400 });
    }

    // Get max order
    const maxOrder = await prisma.component.findFirst({
      where: { projectId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const component = await prisma.component.create({
      data: {
        projectId,
        name,
        description,
        color: color || "#3B82F6",
        leadId,
        defaultAssigneeId,
        order: (maxOrder?.order || 0) + 1,
      },
    });

    return NextResponse.json({ component }, { status: 201 });
  } catch (error) {
    console.error("Error creating component:", error);
    return NextResponse.json({ error: "Failed to create component" }, { status: 500 });
  }
}

// PUT - Update component
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Component ID required" }, { status: 400 });
    }

    const component = await prisma.component.update({
      where: { id },
      data,
    });

    return NextResponse.json({ component });
  } catch (error) {
    console.error("Error updating component:", error);
    return NextResponse.json({ error: "Failed to update component" }, { status: 500 });
  }
}

// DELETE - Delete component
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Component ID required" }, { status: 400 });
    }

    // Remove component reference from tickets
    await prisma.ticket.updateMany({
      where: { componentId: id },
      data: { componentId: null },
    });

    await prisma.component.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting component:", error);
    return NextResponse.json({ error: "Failed to delete component" }, { status: 500 });
  }
}
