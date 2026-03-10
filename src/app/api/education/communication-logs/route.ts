import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, ApiErrors } from "@/lib/api-response";

// GET - List communication logs
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiErrors.unauthorized();
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return apiSuccess({ logs: [], stats: null });
    }

    const organizationId = membership.organizationId;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");
    const channel = searchParams.get("channel");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
    };

    if (studentId) {
      where.studentId = studentId;
    }

    if (status) {
      where.status = status;
    }

    if (channel) {
      where.channel = channel;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Get logs with pagination
    const [logs, total] = await Promise.all([
      db.communicationLog.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentId: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.communicationLog.count({ where }),
    ]);

    // Get stats
    const stats = await db.communicationLog.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: true,
    });

    const statsFormatted = {
      total: stats.reduce((sum, s) => sum + s._count, 0),
      sent: stats.find((s: any) => s.status === "sent")?._count || 0,
      delivered: stats.find((s: any) => s.status === "delivered")?._count || 0,
      failed: stats.find((s: any) => s.status === "failed")?._count || 0,
      pending: stats.find((s: any) => s.status === "pending")?._count || 0,
    };

    return apiSuccess({
      logs,
      stats: statsFormatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching communication logs:", error);
    return ApiErrors.internal("Failed to fetch communication logs", error);
  }
}

// POST - Create communication log (for manual messages)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiErrors.unauthorized();
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return ApiErrors.forbidden("You must be a member of an organization");
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const {
      studentId,
      teacherId,
      recipientPhone,
      recipientName,
      templateId,
      messageContent,
      channel,
      triggeredBy,
      triggerRefId,
    } = body;

    if (!recipientPhone || !messageContent) {
      return ApiErrors.badRequest("Recipient phone and message content are required");
    }

    const log = await db.communicationLog.create({
      data: {
        organizationId,
        studentId,
        teacherId,
        recipientPhone,
        recipientName,
        templateId,
        messageContent,
        channel: channel || "whatsapp",
        status: "pending",
        triggeredBy: triggeredBy || "manual",
        triggerRefId,
      },
    });

    return apiSuccess({ log, message: "Communication log created" }, { status: 201 });
  } catch (error) {
    console.error("Error creating communication log:", error);
    return ApiErrors.internal("Failed to create communication log", error);
  }
}

// PUT - Update communication log status (for webhook updates)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiErrors.unauthorized();
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return ApiErrors.forbidden("You must be a member of an organization");
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const {
      id,
      status,
      errorMessage,
      externalMessageId,
      deliveredAt,
      readAt,
    } = body;

    if (!id) {
      return ApiErrors.badRequest("Log ID is required");
    }

    // Verify log belongs to organization
    const existingLog = await db.communicationLog.findFirst({
      where: { id, organizationId },
    });

    if (!existingLog) {
      return ApiErrors.notFound("Communication log not found");
    }

    const log = await db.communicationLog.update({
      where: { id },
      data: {
        status,
        errorMessage,
        externalMessageId,
        deliveredAt: deliveredAt ? new Date(deliveredAt) : undefined,
        readAt: readAt ? new Date(readAt) : undefined,
        sentAt: status === "sent" ? new Date() : undefined,
      },
    });

    return apiSuccess({ log, message: "Communication log updated" });
  } catch (error) {
    console.error("Error updating communication log:", error);
    return ApiErrors.internal("Failed to update communication log", error);
  }
}
