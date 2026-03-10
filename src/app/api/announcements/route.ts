import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess, parsePaginationParams } from "@/lib/api-response";
import { auditService } from "@/lib/services/audit.service";

// GET - List announcements
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { memberships: { where: { isActive: true }, take: 1 } },
    });

    if (!user || !user.memberships[0]) {
      return ApiErrors.forbidden();
    }

    const organizationId = user.memberships[0].organizationId;
    const { searchParams } = new URL(request.url);
    const { page, pageSize, skip } = parsePaginationParams(searchParams);
    const projectId = searchParams.get("projectId");
    const pinnedOnly = searchParams.get("pinned") === "true";

    const where: any = {
      organizationId,
      isPublished: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };

    if (projectId) where.projectId = projectId;
    if (pinnedOnly) where.isPinned = true;

    const [announcements, total] = await Promise.all([
      db.announcement.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, image: true } },
          project: { select: { id: true, name: true, key: true } },
        },
        orderBy: [
          { isPinned: "desc" },
          { publishedAt: "desc" },
        ],
        skip,
        take: pageSize,
      }),
      db.announcement.count({ where }),
    ]);

    return apiSuccess({
      announcements,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Get announcements error:", error);
    return ApiErrors.internal("Failed to get announcements", error);
  }
}

// POST - Create announcement (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { memberships: { where: { isActive: true }, take: 1 } },
    });

    if (!user || !user.memberships[0]) {
      return ApiErrors.forbidden();
    }

    const membership = user.memberships[0];
    if (!["OWNER", "ADMIN"].includes(membership.role)) {
      return ApiErrors.forbidden("Admin access required");
    }

    const body = await request.json();
    const { title, content, summary, projectId, isPinned, expiresAt } = body;

    if (!title || !content) {
      return ApiErrors.badRequest("Title and content are required");
    }

    const announcement = await db.announcement.create({
      data: {
        organizationId: membership.organizationId,
        projectId: projectId || null,
        title,
        content,
        summary,
        isPinned: isPinned || false,
        isPublished: true,
        publishedAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        authorId: user.id,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    // Log audit
    await auditService.log({
      organizationId: membership.organizationId,
      projectId: projectId || undefined,
      entityType: "ANNOUNCEMENT",
      entityId: announcement.id,
      action: "CREATE",
      newValue: { title, isPinned },
      performedBy: user.id,
    });

    return apiSuccess({ announcement }, { status: 201 });
  } catch (error) {
    console.error("Create announcement error:", error);
    return ApiErrors.internal("Failed to create announcement", error);
  }
}
