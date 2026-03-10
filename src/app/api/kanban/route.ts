export const runtime = 'edge';
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Get kanban columns with tickets
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get projects user has access to
    const projects = await prisma.project.findMany({
      where: user.organizationId ? { organizationId: user.organizationId } : {},
      select: { id: true },
    });

    const projectIds = projects.map((p) => p.id);

    // Get kanban columns for these projects
    const columns = await prisma.kanbanColumn.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        tickets: {
          include: {
            assignee: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
      orderBy: { order: "asc" },
    });

    // If no columns exist, create default ones
    if (columns.length === 0 && projectIds.length > 0) {
      const defaultColumns = [
        { name: "Backlog", color: "#6B7280", order: 0 },
        { name: "To Do", color: "#3B82F6", order: 1 },
        { name: "In Progress", color: "#F59E0B", order: 2 },
        { name: "Done", color: "#10B981", order: 3 },
      ];

      for (const col of defaultColumns) {
        await prisma.kanbanColumn.create({
          data: {
            projectId: projectIds[0],
            ...col,
          },
        });
      }

      // Fetch again
      const newColumns = await prisma.kanbanColumn.findMany({
        where: { projectId: { in: projectIds } },
        include: {
          tickets: {
            include: {
              assignee: {
                select: { id: true, name: true, image: true },
              },
            },
          },
        },
        orderBy: { order: "asc" },
      });

      return NextResponse.json({ columns: newColumns });
    }

    return NextResponse.json({ columns });
  } catch (error: any) {
    console.error("Error fetching kanban columns:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
