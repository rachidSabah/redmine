import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";
import { auditService } from "@/lib/services/audit.service";

// GET - List wiki pages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return ApiErrors.forbidden("User not found");
    }

    // Get user's organization - require membership
    const membership = user.memberships[0];
    if (!membership) {
      // Return empty array instead of error for users without org
      return apiSuccess({ pages: [], message: "You are not a member of any organization" });
    }

    const organizationId = membership.organizationId;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const parentId = searchParams.get("parentId");
    const search = searchParams.get("search");
    const includeContent = searchParams.get("includeContent") === "true";

    const where: any = {
      deletedAt: null,
      organizationId,
    };

    if (projectId && projectId !== "none") {
      where.projectId = projectId;
    }
    if (parentId === "none" || parentId === "null") {
      where.parentId = null;
    } else if (parentId) {
      where.parentId = parentId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    const pages = await db.wikiPage.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        content: includeContent,
        isPublished: true,
        order: true,
        projectId: true,
        parentId: true,
        authorId: true,
        lastEditorId: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
        lastEditor: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { children: true, attachments: true, versions: true },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return apiSuccess({ pages });
  } catch (error) {
    console.error("Error fetching wiki pages:", error);
    return ApiErrors.internal("Failed to fetch wiki pages", error);
  }
}

// POST - Create wiki page
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return ApiErrors.forbidden("User not found");
    }

    // Get user's organization - require membership
    const membership = user.memberships[0];
    if (!membership) {
      return ApiErrors.badRequest("You must be a member of an organization to create wiki pages");
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const { title, content, projectId, parentId, isPublished = true } = body;

    if (!title || !title.trim()) {
      return ApiErrors.badRequest("Title is required");
    }

    // Generate slug
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 100);

    // Check if slug exists
    const existingPage = await db.wikiPage.findFirst({
      where: {
        organizationId,
        slug: baseSlug,
        deletedAt: null,
      },
    });

    const slug = existingPage ? `${baseSlug}-${Date.now()}` : baseSlug;

    // Create wiki page
    const page = await db.wikiPage.create({
      data: {
        organizationId,
        projectId: projectId || null,
        title: title.trim(),
        slug,
        content: content || "",
        parentId: parentId || null,
        isPublished,
        authorId: user.id,
        lastEditorId: user.id,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    // Create initial version
    try {
      await db.wikiVersion.create({
        data: {
          pageId: page.id,
          version: 1,
          title: page.title,
          content: page.content,
          editedBy: user.id,
          changeSummary: "Initial version",
        },
      });
    } catch (versionError) {
      console.error("Failed to create wiki version:", versionError);
      // Don't fail the request if version creation fails
    }

    // Log the action
    try {
      await auditService.log({
        organizationId,
        projectId: projectId || undefined,
        entityType: "WIKI_PAGE",
        entityId: page.id,
        action: "CREATE",
        newValue: { title: page.title, slug: page.slug },
        performedBy: user.id,
      });
    } catch (auditError) {
      console.error("Failed to log audit:", auditError);
      // Don't fail the request if audit logging fails
    }

    return apiSuccess({ page, message: "Wiki page created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating wiki page:", error);
    return ApiErrors.internal("Failed to create wiki page", error);
  }
}
