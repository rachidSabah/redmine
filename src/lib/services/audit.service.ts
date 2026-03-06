import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface AuditLogInput {
  organizationId?: string;
  projectId?: string;
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "ARCHIVE" | "RESTORE" | "SOFT_DELETE" | "ASSIGN" | "STATUS_CHANGE" | string;
  oldValue?: Prisma.JsonValue;
  newValue?: Prisma.JsonValue;
  changes?: Prisma.JsonValue;
  metadata?: Prisma.JsonValue;
  performedBy: string;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
}

export interface AuditLogQueryParams {
  organizationId?: string;
  projectId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  performedBy?: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Audit Service
 * Centralized audit logging for all entity changes
 */
export class AuditService {
  /**
   * Log an audit event
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          organizationId: input.organizationId,
          projectId: input.projectId,
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          oldValue: input.oldValue || null,
          newValue: input.newValue || null,
          changes: input.changes || null,
          metadata: input.metadata || null,
          performedBy: input.performedBy,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (error) {
      console.error("Failed to create audit log:", error);
      // Don't throw - audit logging should not break operations
    }
  }

  /**
   * Log a creation event
   */
  async logCreate(params: {
    organizationId?: string;
    projectId?: string;
    entityType: string;
    entityId: string;
    entity: Prisma.JsonValue;
    performedBy: string;
    metadata?: Prisma.JsonValue;
  }): Promise<void> {
    await this.log({
      ...params,
      action: "CREATE",
      newValue: params.entity,
    });
  }

  /**
   * Log an update event
   */
  async logUpdate(params: {
    organizationId?: string;
    projectId?: string;
    entityType: string;
    entityId: string;
    oldValue: Prisma.JsonValue;
    newValue: Prisma.JsonValue;
    performedBy: string;
    changes?: Prisma.JsonValue;
  }): Promise<void> {
    await this.log({
      ...params,
      action: "UPDATE",
    });
  }

  /**
   * Log a deletion event
   */
  async logDelete(params: {
    organizationId?: string;
    projectId?: string;
    entityType: string;
    entityId: string;
    entity: Prisma.JsonValue;
    performedBy: string;
    soft?: boolean;
  }): Promise<void> {
    await this.log({
      ...params,
      action: params.soft ? "SOFT_DELETE" : "DELETE",
      oldValue: params.entity,
    });
  }

  /**
   * Log a restore event
   */
  async logRestore(params: {
    organizationId?: string;
    projectId?: string;
    entityType: string;
    entityId: string;
    entity: Prisma.JsonValue;
    performedBy: string;
  }): Promise<void> {
    await this.log({
      ...params,
      action: "RESTORE",
      newValue: params.entity,
    });
  }

  /**
   * Log an archive event
   */
  async logArchive(params: {
    organizationId?: string;
    projectId?: string;
    entityType: string;
    entityId: string;
    entity: Prisma.JsonValue;
    performedBy: string;
  }): Promise<void> {
    await this.log({
      ...params,
      action: "ARCHIVE",
      oldValue: params.entity,
    });
  }

  /**
   * Get entity history
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    options?: { limit?: number; offset?: number }
  ) {
    return db.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  /**
   * Get organization audit logs
   */
  async getOrganizationLogs(params: AuditLogQueryParams) {
    return db.auditLog.findMany({
      where: {
        organizationId: params.organizationId,
        ...(params.projectId ? { projectId: params.projectId } : {}),
        ...(params.entityType ? { entityType: params.entityType } : {}),
        ...(params.action ? { action: params.action } : {}),
        ...(params.performedBy ? { performedBy: params.performedBy } : {}),
        ...(params.startDate ? { createdAt: { gte: params.startDate } } : {}),
        ...(params.endDate ? { createdAt: { lte: params.endDate } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: params.limit || 50,
      skip: params.offset || 0,
    });
  }

  /**
   * Get audit log statistics
   */
  async getStats(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalLogs, byAction, byEntityType, recentUsers] = await Promise.all([
      db.auditLog.count({
        where: { organizationId, createdAt: { gte: startDate } },
      }),
      db.auditLog.groupBy({
        by: ["action"],
        where: { organizationId, createdAt: { gte: startDate } },
        _count: true,
      }),
      db.auditLog.groupBy({
        by: ["entityType"],
        where: { organizationId, createdAt: { gte: startDate } },
        _count: true,
      }),
      db.auditLog.groupBy({
        by: ["performedBy"],
        where: { organizationId, createdAt: { gte: startDate } },
        _count: true,
        orderBy: { _count: { performedBy: "desc" } },
        take: 10,
      }),
    ]);

    return { totalLogs, byAction, byEntityType, recentUsers, period: `${days} days` };
  }

  /**
   * Get recent activity for an entity
   */
  async getRecentActivity(params: {
    organizationId?: string;
    projectId?: string;
    limit?: number;
  }) {
    return db.auditLog.findMany({
      where: {
        ...(params.organizationId ? { organizationId: params.organizationId } : {}),
        ...(params.projectId ? { projectId: params.projectId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: params.limit || 20,
    });
  }
}

export const auditService = new AuditService();
