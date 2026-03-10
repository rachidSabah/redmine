import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - List all organizations
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ organizations });
  } catch (error: any) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new organization
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== "OWNER" && currentUser.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, slug, description } = await request.json();

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    // Check if slug already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: slug.toLowerCase() },
    });

    if (existingOrg) {
      return NextResponse.json({ error: "Organization with this slug already exists" }, { status: 400 });
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        slug: slug.toLowerCase(),
        description,
        ownerId: currentUser.id,
        subscriptionPlan: "FREE",
        subscriptionStatus: "ACTIVE",
        maxMembers: 10,
        maxProjects: 5,
        maxStorageMB: 1000,
      },
    });

    // Add creator as owner
    await prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: currentUser.id,
        role: "OWNER",
        isActive: true,
      },
    });

    return NextResponse.json({ organization });
  } catch (error: any) {
    console.error("Error creating organization:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
