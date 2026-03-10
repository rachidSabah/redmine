import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET /api/comments - Get comments for a ticket
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId");

    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
    }

    const comments = await prisma.comment.findMany({
      where: { ticketId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        replies: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST /api/comments - Create comment
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { ticketId, content, parentId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        ticketId,
        userId: user.id,
        content,
        parentId,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
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
          type: "COMMENTED",
          description: `commented on ${ticket.key}`,
        },
      });
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

// DELETE /api/comments - Delete comment
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Comment ID required" }, { status: 400 });
    }

    const comment = await prisma.comment.findUnique({ where: { id } });

    if (!comment || comment.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
