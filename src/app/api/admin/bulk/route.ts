import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";
import { auditService } from "@/lib/services/audit.service";

/**
 * Bulk Operations API
 * Handles bulk actions on multiple entities
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    // Check admin access
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { role: { in: ["OWNER", "ADMIN"] } },
        },
      },
    });

    if (!user) {
      return ApiErrors.forbidden("Admin access required");
    }

    const body = await request.json();
    const { action, entityType, ids, data } = body;

    // Validate request
    if (!action || !entityType || !ids || !Array.isArray(ids) || ids.length === 0) {
      return ApiErrors.badRequest("Invalid request: action, entityType, and ids[] are required");
    }

    // Limit bulk operations to prevent abuse
    if (ids.length > 100) {
      return ApiErrors.badRequest("Maximum 100 items allowed per bulk operation");
    }

    let result;
    const performedBy = user.id;

    switch (entityType) {
      case "users":
        result = await handleBulkUsers(action, ids, performedBy, user.memberships[0]?.organizationId);
        break;
      case "organizations":
        result = await handleBulkOrganizations(action, ids, performedBy);
        break;
      case "projects":
        result = await handleBulkProjects(action, ids, performedBy);
        break;
      case "tickets":
        result = await handleBulkTickets(action, ids, performedBy, data);
        break;
      default:
        return ApiErrors.badRequest(`Unknown entity type: ${entityType}`);
    }

    // Log the bulk action
    await auditService.log({
      organizationId: user.memberships[0]?.organizationId,
      entityType: "BULK_OPERATION",
      entityId: `${entityType}_${action}`,
      action: `BULK_${action.toUpperCase()}`,
      newValue: { entityType, ids, affected: result.count },
      performedBy,
    });

    return apiSuccess({
      success: true,
      action,
      entityType,
      affected: result.count,
      ids,
    });
  } catch (error) {
    console.error("Bulk operation error:", error);
    return ApiErrors.internal("Failed to perform bulk operation", error);
  }
}

/**
 * Handle bulk user operations
 */
async function handleBulkUsers(
  action: string,
  ids: string[],
  performedBy: string,
  organizationId?: string
) {
  switch (action) {
    case "delete":
    case "soft_delete":
      const deletedUsers = await db.user.updateMany({
        where: { id: { in: ids } },
        data: {
          isActive: false,
          deletedAt: new Date(),
          deletedBy: performedBy,
        },
      });
      return deletedUsers;

    case "restore":
      return db.user.updateMany({
        where: { id: { in: ids } },
        data: {
          isActive: true,
          deletedAt: null,
          deletedBy: null,
        },
      });

    case "suspend":
    case "deactivate":
      return db.user.updateMany({
        where: { id: { in: ids } },
        data: { isActive: false },
      });

    case "activate":
      return db.user.updateMany({
        where: { id: { in: ids } },
        data: { isActive: true },
      });

    case "archive":
      return db.user.updateMany({
        where: { id: { in: ids } },
        data: {
          isActive: false,
          archivedAt: new Date(),
          archivedBy: performedBy,
        },
      });

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Handle bulk organization operations
 */
async function handleBulkOrganizations(action: string, ids: string[], performedBy: string) {
  switch (action) {
    case "delete":
    case "soft_delete":
      return db.organization.updateMany({
        where: { id: { in: ids } },
        data: {
          isActive: false,
          deletedAt: new Date(),
          deletedBy: performedBy,
        },
      });

    case "restore":
      return db.organization.updateMany({
        where: { id: { in: ids } },
        data: {
          isActive: true,
          deletedAt: null,
          deletedBy: null,
        },
      });

    case "archive":
      return db.organization.updateMany({
        where: { id: { in: ids } },
        data: {
          isActive: false,
          archivedAt: new Date(),
          archivedBy: performedBy,
        },
      });

    case "activate":
      return db.organization.updateMany({
        where: { id: { in: ids } },
        data: { isActive: true },
      });

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Handle bulk project operations
 */
async function handleBulkProjects(action: string, ids: string[], performedBy: string) {
  switch (action) {
    case "delete":
    case "soft_delete":
      return db.project.updateMany({
        where: { id: { in: ids } },
        data: {
          isActive: false,
          deletedAt: new Date(),
          deletedBy: performedBy,
        },
      });

    case "restore":
      return db.project.updateMany({
        where: { id: { in: ids } },
        data: {
          isActive: true,
          deletedAt: null,
          deletedBy: null,
        },
      });

    case "archive":
      return db.project.updateMany({
        where: { id: { in: ids } },
        data: {
          isActive: false,
          archivedAt: new Date(),
          archivedBy: performedBy,
        },
      });

    case "close":
      return db.project.updateMany({
        where: { id: { in: ids } },
        data: { isActive: false },
      });

    case "activate":
      return db.project.updateMany({
        where: { id: { in: ids } },
        data: { isActive: true },
      });

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Handle bulk ticket operations
 */
async function handleBulkTickets(
  action: string,
  ids: string[],
  performedBy: string,
  data?: any
) {
  switch (action) {
    case "delete":
    case "soft_delete":
      return db.ticket.updateMany({
        where: { id: { in: ids } },
        data: {
          status: "ARCHIVED",
          deletedAt: new Date(),
          deletedBy: performedBy,
        },
      });

    case "restore":
      return db.ticket.updateMany({
        where: { id: { in: ids } },
        data: {
          status: "BACKLOG",
          deletedAt: null,
          deletedBy: null,
        },
      });

    case "archive":
      return db.ticket.updateMany({
        where: { id: { in: ids } },
        data: {
          status: "ARCHIVED",
          archivedAt: new Date(),
          archivedBy: performedBy,
        },
      });

    case "update_status":
      if (!data?.status) throw new Error("Status is required for update_status action");
      return db.ticket.updateMany({
        where: { id: { in: ids } },
        data: { status: data.status },
      });

    case "update_priority":
      if (!data?.priority) throw new Error("Priority is required for update_priority action");
      return db.ticket.updateMany({
        where: { id: { in: ids } },
        data: { priority: data.priority },
      });

    case "assign":
      if (!data?.assigneeId) throw new Error("AssigneeId is required for assign action");
      return db.ticket.updateMany({
        where: { id: { in: ids } },
        data: { assigneeId: data.assigneeId },
      });

    case "unassign":
      return db.ticket.updateMany({
        where: { id: { in: ids } },
        data: { assigneeId: null },
      });

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
