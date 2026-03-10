import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess, parsePaginationParams } from "@/lib/api-response";

// Get Audit Logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { memberships: { take: 1 } },
    });

    if (!user || !user.memberships[0]) {
      return ApiErrors.forbidden();
    }

    const membership = user.memberships[0];
    const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);

    if (!isAdmin) {
      return ApiErrors.forbidden("Admin access required");
    }

    const { searchParams } = new URL(request.url);
    const { page, pageSize, skip } = parsePaginationParams(searchParams);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const action = searchParams.get("action");
    const performedBy = searchParams.get("performedBy");
    const projectId = searchParams.get("projectId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {
      organizationId: membership.organizationId,
    };

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    if (performedBy) where.performedBy = performedBy;
    if (projectId) where.projectId = projectId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      db.auditLog.count({ where }),
    ]);

    return apiSuccess({
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    return ApiErrors.internal("Failed to get audit logs", error);
  }
}
