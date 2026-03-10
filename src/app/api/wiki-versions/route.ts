import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - List versions for a wiki page
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("pageId");

    if (!pageId) {
      return NextResponse.json({ error: "Page ID required" }, { status: 400 });
    }

    // Verify access to the page
    const page = await prisma.wikiPage.findFirst({
      where: { id: pageId },
      include: {
        organization: {
          include: {
            members: {
              where: { userId: session.user.id },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!page || page.organization.members.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const versions = await prisma.wikiVersion.findMany({
      where: { pageId },
      include: {
        page: {
          select: { title: true, slug: true },
        },
      },
      orderBy: { version: "desc" },
      take: 50,
    });

    return NextResponse.json({ versions });
  } catch (error) {
    console.error("Failed to fetch wiki versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch wiki versions" },
      { status: 500 }
    );
  }
}

// POST - Create a new version (automatically called when updating a page)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pageId, title, content, changeSummary } = body;

    if (!pageId || !title || !content) {
      return NextResponse.json(
        { error: "Page ID, title, and content are required" },
        { status: 400 }
      );
    }

    // Verify access
    const page = await prisma.wikiPage.findFirst({
      where: { id: pageId },
      include: {
        organization: {
          include: {
            members: {
              where: { userId: session.user.id },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!page || page.organization.members.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get current max version
    const latestVersion = await prisma.wikiVersion.findFirst({
      where: { pageId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (latestVersion?.version || 0) + 1;

    // Create new version
    const version = await prisma.wikiVersion.create({
      data: {
        pageId,
        version: nextVersion,
        title,
        content,
        editedBy: session.user.id,
        changeSummary,
      },
    });

    // Update the page
    await prisma.wikiPage.update({
      where: { id: pageId },
      data: {
        title,
        content,
        lastEditorId: session.user.id,
      },
    });

    return NextResponse.json({ version });
  } catch (error) {
    console.error("Failed to create wiki version:", error);
    return NextResponse.json(
      { error: "Failed to create wiki version" },
      { status: 500 }
    );
  }
}
