import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

// GET /api/projects - Get projects for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    // Get user's organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { joinedAt: "desc" },
    });

    if (!membership) {
      return NextResponse.json({ projects: [] });
    }

    const where: any = { organizationId: membership.organizationId };
    if (!includeArchived) {
      where.isActive = true;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        _count: { select: { members: true, tickets: true } },
        members: { where: { userId: user.id } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedProjects = projects.map((p) => ({
      id: p.id,
      name: p.name,
      key: p.key,
      description: p.description,
      color: p.color,
      icon: p.icon,
      visibility: p.visibility,
      progress: p.progress,
      startDate: p.startDate,
      endDate: p.endDate,
      isActive: p.isActive,
      isArchived: !p.isActive,
      memberCount: p._count.members,
      ticketCount: p._count.tickets,
      userRole: p.members[0]?.role || membership.role,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json({ projects: formattedProjects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, key, description, color } = body;

    if (!name || !key) {
      return NextResponse.json(
        { error: "Name and key are required" },
        { status: 400 }
      );
    }

    // Get user's organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { joinedAt: "desc" },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of any organization" },
        { status: 403 }
      );
    }

    if (!hasPermission(membership.role, "project.create")) {
      return NextResponse.json(
        { error: "Insufficient permissions to create projects" },
        { status: 403 }
      );
    }

    // Check if key exists in organization
    const existing = await prisma.project.findFirst({
      where: { organizationId: membership.organizationId, key: key.toUpperCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Project key already exists in this organization" },
        { status: 400 }
      );
    }

    // Create project with default Kanban columns
    const project = await prisma.project.create({
      data: {
        organizationId: membership.organizationId,
        name,
        key: key.toUpperCase().slice(0, 4),
        description,
        color: color || "#3B82F6",
        visibility: "PUBLIC",
        members: {
          create: { userId: user.id, role: "MANAGER" },
        },
      },
      include: {
        _count: { select: { members: true, tickets: true } },
      },
    });

    // Create default Kanban columns
    await prisma.kanbanColumn.createMany({
      data: [
        { projectId: project.id, name: "Backlog", color: "#6B7280", order: 0 },
        { projectId: project.id, name: "To Do", color: "#3B82F6", order: 1 },
        { projectId: project.id, name: "In Progress", color: "#F59E0B", order: 2 },
        { projectId: project.id, name: "Done", color: "#10B981", order: 3 },
      ],
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

// PUT /api/projects - Update project
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { id, ...data } = body;

    const projectMember = await prisma.projectMember.findFirst({
      where: { projectId: id, userId: user.id },
    });

    if (!projectMember || !hasPermission(projectMember.role, "project.settings")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const project = await prisma.project.update({
      where: { id },
      data,
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects - Delete project
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { members: { where: { userId: user.id } } },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user is admin or project manager
    const orgMembership = await prisma.organizationMember.findFirst({
      where: { organizationId: project.organizationId, userId: user.id },
    });

    const canDelete = project.members[0]?.role === "MANAGER" ||
                      project.members[0]?.role === "ADMIN" ||
                      (orgMembership && hasPermission(orgMembership.role, "project.delete"));

    if (!canDelete) {
      return NextResponse.json(
        { error: "Insufficient permissions to delete this project" },
        { status: 403 }
      );
    }

    // Soft delete
    await prisma.project.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
