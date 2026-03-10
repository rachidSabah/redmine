export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// GET - List attendance automations
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
      return apiSuccess({ automations: [] });
    }

    const organizationId = membership.organizationId;

    const automations = await db.attendanceAutomation.findMany({
      where: { organizationId },
      include: {
        template: {
          select: { id: true, name: true, category: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess({ automations });
  } catch (error) {
    console.error("Error fetching attendance automations:", error);
    return ApiErrors.internal("Failed to fetch attendance automations", error);
  }
}

// POST - Create attendance automation
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

    // Check admin role
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return ApiErrors.forbidden("Admin access required");
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const {
      name,
      description,
      triggerType,
      consecutiveDays,
      actionType,
      templateId,
      sendToParent,
      sendToDirector,
      directorEmail,
      sendDelay,
      isActive,
    } = body;

    if (!name || !triggerType || !actionType) {
      return ApiErrors.badRequest("Name, trigger type, and action type are required");
    }

    const automation = await db.attendanceAutomation.create({
      data: {
        organizationId,
        name,
        description,
        triggerType,
        consecutiveDays,
        actionType,
        templateId,
        sendToParent: sendToParent ?? true,
        sendToDirector: sendToDirector ?? false,
        directorEmail,
        sendDelay: sendDelay ?? 0,
        isActive: isActive ?? true,
        createdBy: user.id,
      },
      include: {
        template: {
          select: { id: true, name: true },
        },
      },
    });

    return apiSuccess({ automation, message: "Automation created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating attendance automation:", error);
    return ApiErrors.internal("Failed to create attendance automation", error);
  }
}

// PUT - Update attendance automation
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

    // Check admin role
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return ApiErrors.forbidden("Admin access required");
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const {
      id,
      name,
      description,
      triggerType,
      consecutiveDays,
      actionType,
      templateId,
      sendToParent,
      sendToDirector,
      directorEmail,
      sendDelay,
      isActive,
    } = body;

    if (!id) {
      return ApiErrors.badRequest("Automation ID is required");
    }

    // Verify automation belongs to organization
    const existingAutomation = await db.attendanceAutomation.findFirst({
      where: { id, organizationId },
    });

    if (!existingAutomation) {
      return ApiErrors.notFound("Automation not found");
    }

    const automation = await db.attendanceAutomation.update({
      where: { id },
      data: {
        name,
        description,
        triggerType,
        consecutiveDays,
        actionType,
        templateId,
        sendToParent,
        sendToDirector,
        directorEmail,
        sendDelay,
        isActive,
      },
      include: {
        template: {
          select: { id: true, name: true },
        },
      },
    });

    return apiSuccess({ automation, message: "Automation updated successfully" });
  } catch (error) {
    console.error("Error updating attendance automation:", error);
    return ApiErrors.internal("Failed to update attendance automation", error);
  }
}

// DELETE - Delete attendance automation
export async function DELETE(request: NextRequest) {
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

    // Check admin role
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return ApiErrors.forbidden("Admin access required");
    }

    const organizationId = membership.organizationId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return ApiErrors.badRequest("Automation ID is required");
    }

    // Verify automation belongs to organization
    const existingAutomation = await db.attendanceAutomation.findFirst({
      where: { id, organizationId },
    });

    if (!existingAutomation) {
      return ApiErrors.notFound("Automation not found");
    }

    await db.attendanceAutomation.delete({
      where: { id },
    });

    return apiSuccess({ message: "Automation deleted successfully" });
  } catch (error) {
    console.error("Error deleting attendance automation:", error);
    return ApiErrors.internal("Failed to delete attendance automation", error);
  }
}
