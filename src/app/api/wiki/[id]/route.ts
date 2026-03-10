import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";
import { auditService } from "@/lib/services/audit.service";

// GET - Get single wiki page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const membership = user.memberships[0];
    if (!membership) {
      return ApiErrors.forbidden("You are not a member of any organization");
    }

    const { id } = await params;

    const page = await db.wikiPage.findFirst({
      where: {
        id,
        deletedAt: null,
        organizationId: membership.organizationId,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
        lastEditor: {
          select: { id: true, name: true, email: true },
        },
        children: {
          where: { deletedAt: null },
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            slug: true,
            order: true,
          },
        },
        attachments: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        parent: {
          select: { id: true, title: true, slug: true },
        },
        project: {
          select: { id: true, name: true, key: true },
        },
        _count: {
          select: { 
            children: true, 
            attachments: true, 
            versions: true 
          },
        },
      },
    });

    if (!page) {
      return ApiErrors.notFound("Page not found");
    }

    return apiSuccess({ page });
  } catch (error) {
    console.error("Error fetching wiki page:", error);
    return ApiErrors.internal("Failed to fetch wiki page", error);
  }
}

// PATCH - Update wiki page
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const membership = user.memberships[0];
    if (!membership) {
      return ApiErrors.forbidden("You are not a member of any organization");
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content, isPublished, order, changeSummary } = body;

    // Get existing page
    const existingPage = await db.wikiPage.findFirst({
      where: { 
        id, 
        deletedAt: null,
        organizationId: membership.organizationId,
      },
    });

    if (!existingPage) {
      return ApiErrors.notFound("Page not found");
    }

    // Check if content actually changed
    const contentChanged = 
      (title !== undefined && title !== existingPage.title) ||
      (content !== undefined && content !== existingPage.content);

    // Build update data
    const updateData: any = {
      lastEditorId: user.id,
    };
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (order !== undefined) updateData.order = order;

    // Update slug if title changed
    if (title && title.trim() !== existingPage.title) {
      const baseSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 100);
      
      const existingSlug = await db.wikiPage.findFirst({
        where: {
          organizationId: existingPage.organizationId,
          slug: baseSlug,
          deletedAt: null,
          NOT: { id },
        },
      });
      
      updateData.slug = existingSlug ? `${baseSlug}-${Date.now()}` : baseSlug;
    }

    // Update the page
    const page = await db.wikiPage.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
        lastEditor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create version history if content changed
    if (contentChanged) {
      try {
        // Get the latest version number
        const latestVersion = await db.wikiVersion.findFirst({
          where: { pageId: id },
          orderBy: { version: "desc" },
          select: { version: true },
        });

        const newVersion = (latestVersion?.version || 0) + 1;

        await db.wikiVersion.create({
          data: {
            pageId: id,
            version: newVersion,
            title: page.title,
            content: page.content,
            editedBy: user.id,
            changeSummary: changeSummary || `Updated to version ${newVersion}`,
          },
        });
      } catch (versionError) {
        console.error("Failed to create wiki version:", versionError);
        // Don't fail the request
      }
    }

    // Log the action
    try {
      await auditService.log({
        organizationId: existingPage.organizationId,
        projectId: existingPage.projectId || undefined,
        entityType: "WIKI_PAGE",
        entityId: id,
        action: "UPDATE",
        oldValue: { 
          title: existingPage.title, 
          contentChanged,
        },
        newValue: updateData,
        performedBy: user.id,
      });
    } catch (auditError) {
      console.error("Failed to log audit:", auditError);
    }

    return apiSuccess({ page, contentChanged, message: "Wiki page updated successfully" });
  } catch (error) {
    console.error("Error updating wiki page:", error);
    return ApiErrors.internal("Failed to update wiki page", error);
  }
}

// DELETE - Delete wiki page (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const membership = user.memberships[0];
    if (!membership) {
      return ApiErrors.forbidden("You are not a member of any organization");
    }

    const { id } = await params;

    // Get existing page
    const existingPage = await db.wikiPage.findFirst({
      where: { 
        id, 
        deletedAt: null,
        organizationId: membership.organizationId,
      },
    });

    if (!existingPage) {
      return ApiErrors.notFound("Page not found");
    }

    // Soft delete
    await db.wikiPage.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: user.id,
      },
    });

    // Log the action
    try {
      await auditService.log({
        organizationId: existingPage.organizationId,
        projectId: existingPage.projectId || undefined,
        entityType: "WIKI_PAGE",
        entityId: id,
        action: "SOFT_DELETE",
        oldValue: { title: existingPage.title, slug: existingPage.slug },
        performedBy: user.id,
      });
    } catch (auditError) {
      console.error("Failed to log audit:", auditError);
    }

    return apiSuccess({ message: "Page deleted successfully" });
  } catch (error) {
    console.error("Error deleting wiki page:", error);
    return ApiErrors.internal("Failed to delete wiki page", error);
  }
}
