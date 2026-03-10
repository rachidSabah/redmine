export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";
import { storageService } from "@/lib/cloud-storage";
import { rateLimiters } from "@/lib/middleware/rate-limiter";

// POST - Upload file attachment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return ApiErrors.forbidden();
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimiters.upload(request, user.id);
    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const ticketId = formData.get("ticketId") as string | null;
    const projectId = formData.get("projectId") as string | null;
    const chatMessageId = formData.get("chatMessageId") as string | null;
    const wikiPageId = formData.get("wikiPageId") as string | null;
    const folder = formData.get("folder") as string | undefined;

    if (!file) {
      return ApiErrors.badRequest("No file provided");
    }

    // Validate file size (max 25MB)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return ApiErrors.badRequest("File size exceeds 25MB limit");
    }

    // Validate file type
    const blockedTypes = [
      "application/x-executable",
      "application/x-msdos-program",
      "application/x-msdownload",
    ];
    if (blockedTypes.includes(file.type)) {
      return ApiErrors.badRequest("File type not allowed");
    }

    // Upload to cloud storage
    const uploadResult = await storageService.upload(file, {
      filename: file.name,
      folder: folder || "attachments",
      mimeType: file.type,
      isPublic: true,
    });

    if (!uploadResult.success) {
      return ApiErrors.internal(uploadResult.error || "Upload failed");
    }

    // Create attachment record
    const attachment = await db.attachment.create({
      data: {
        filename: uploadResult.key || file.name,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: uploadResult.url || "",
        ticketId: ticketId || null,
        projectId: projectId || null,
        chatMessageId: chatMessageId || null,
        wikiPageId: wikiPageId || null,
        userId: user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return apiSuccess({ attachment }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return ApiErrors.internal("Upload failed", error);
  }
}

// GET - List attachments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return ApiErrors.forbidden();
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId");
    const projectId = searchParams.get("projectId");
    const wikiPageId = searchParams.get("wikiPageId");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    if (ticketId) where.ticketId = ticketId;
    if (projectId) where.projectId = projectId;
    if (wikiPageId) where.wikiPageId = wikiPageId;

    const attachments = await db.attachment.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return apiSuccess({ attachments });
  } catch (error) {
    console.error("Error fetching attachments:", error);
    return ApiErrors.internal("Failed to fetch attachments", error);
  }
}

// DELETE - Delete attachment
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return ApiErrors.forbidden();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return ApiErrors.badRequest("Attachment ID is required");
    }

    const attachment = await db.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return ApiErrors.notFound("Attachment not found");
    }

    // Only the uploader or admin can delete
    if (attachment.userId !== user.id) {
      const membership = await db.organizationMember.findFirst({
        where: { userId: user.id },
      });
      if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
        return ApiErrors.forbidden("Not authorized to delete this attachment");
      }
    }

    // Delete from storage
    if (attachment.filename) {
      await storageService.delete(attachment.filename).catch(() => {});
    }

    // Delete from database
    await db.attachment.delete({ where: { id } });

    return apiSuccess({ message: "Attachment deleted" });
  } catch (error) {
    console.error("Delete attachment error:", error);
    return ApiErrors.internal("Failed to delete attachment", error);
  }
}
