export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - List wiki pages
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization membership
    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      // Return empty array instead of error for users without org
      return NextResponse.json({ success: true, data: { pages: [] } });
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

    return NextResponse.json({ success: true, data: { pages } });
  } catch (error: any) {
    console.error("Error fetching wiki pages:", error);
    
    // Check if it's a Prisma table not found error
    if (error?.code === "P2021" || error?.message?.includes("does not exist")) {
      return NextResponse.json({ success: true, data: { pages: [] } });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch wiki pages",
      details: process.env.NODE_ENV === "development" ? error?.message : undefined 
    }, { status: 500 });
  }
}

// POST - Create wiki page
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization membership
    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return NextResponse.json({ 
        success: false, 
        error: "You must be a member of an organization to create wiki pages" 
      }, { status: 400 });
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const { title, content, projectId, parentId, isPublished = true } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
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

    return NextResponse.json({ 
      success: true, 
      data: { page, message: "Wiki page created successfully" } 
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating wiki page:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to create wiki page",
      details: process.env.NODE_ENV === "development" ? error?.message : undefined 
    }, { status: 500 });
  }
}
