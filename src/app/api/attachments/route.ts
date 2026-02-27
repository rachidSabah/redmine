import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET /api/attachments - Get attachments
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId");
    const projectId = searchParams.get("projectId");

    let whereClause: any = {};
    if (ticketId) whereClause.ticketId = ticketId;
    if (projectId) whereClause.projectId = projectId;

    const attachments = await prisma.attachment.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error("Error fetching attachments:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}

// POST /api/attachments - Upload attachment
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const ticketId = formData.get("ticketId") as string | null;
    const projectId = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // For Vercel, we'd use Vercel Blob or similar
    // For now, simulate file storage
    const filename = `${Date.now()}-${file.name}`;
    const url = `/uploads/${filename}`; // In production, this would be a real URL

    const attachment = await prisma.attachment.create({
      data: {
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url,
        ticketId,
        projectId,
        userId: user.id,
      },
    });

    // Create activity
    if (ticketId) {
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
            type: "ATTACHMENT_ADDED",
            description: `attached ${file.name} to ${ticket.key}`,
          },
        });
      }
    }

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return NextResponse.json(
      { error: "Failed to upload attachment" },
      { status: 500 }
    );
  }
}

// DELETE /api/attachments - Delete attachment
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Attachment ID required" }, { status: 400 });
    }

    const attachment = await prisma.attachment.findUnique({ where: { id } });

    if (!attachment || attachment.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.attachment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
