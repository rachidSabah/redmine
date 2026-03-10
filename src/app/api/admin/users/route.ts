export const runtime = 'edge';
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import * as bcrypt from "bcrypt";

// GET - List all users
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      include: {
        memberships: {
          include: {
            organization: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new user
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== "OWNER" && currentUser.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, password, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: hashedPassword,
        isActive: true,
        emailVerified: new Date(),
      },
    });

    // Get default organization
    const defaultOrg = await prisma.organization.findFirst({
      where: { slug: "default-org" },
    });

    if (defaultOrg) {
      await prisma.organizationMember.create({
        data: {
          organizationId: defaultOrg.id,
          userId: newUser.id,
          role: role || "MEMBER",
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
