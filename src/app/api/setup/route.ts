import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as bcrypt from "bcrypt";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { setupKey } = body;

    // Simple security check
    if (setupKey !== "synchro-pm-setup-2024") {
      return NextResponse.json({ error: "Invalid setup key" }, { status: 401 });
    }

    const adminEmail = "ranelsabah@admin.synchropm.com";
    const adminPassword = "Santafee@@@@@1972";
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create or update admin user
    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: hashedPassword,
        isActive: true,
        name: "Ranelsabah",
        emailVerified: new Date(),
      },
      create: {
        email: adminEmail,
        name: "Ranelsabah",
        password: hashedPassword,
        isActive: true,
        emailVerified: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
      }
    });

    // Create default organization if not exists
    let organization = await prisma.organization.findFirst({
      where: { slug: "default-org" },
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: "Default Organization",
          slug: "default-org",
          description: "Default organization for system administration",
          ownerId: adminUser.id,
          subscriptionPlan: "ENTERPRISE",
          subscriptionStatus: "ACTIVE",
          maxMembers: 1000,
          maxProjects: 1000,
          maxStorageMB: 100000,
        },
      });
    }

    // Add admin as owner of the organization
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: adminUser.id,
        },
      },
      update: {
        role: "OWNER",
        isActive: true,
      },
      create: {
        organizationId: organization.id,
        userId: adminUser.id,
        role: "OWNER",
        isActive: true,
      },
    });

    // Create default Kanban columns if no projects exist
    const existingProjects = await prisma.project.count();

    if (existingProjects === 0) {
      const defaultProject = await prisma.project.create({
        data: {
          organizationId: organization.id,
          name: "Getting Started",
          key: "GS",
          description: "A default project to help you get started with Synchro PM",
          color: "#3B82F6",
          visibility: "PUBLIC",
          progress: 0,
        },
      });

      // Create Kanban columns
      await prisma.kanbanColumn.createMany({
        data: [
          { projectId: defaultProject.id, name: "Backlog", color: "#6B7280", order: 0 },
          { projectId: defaultProject.id, name: "To Do", color: "#3B82F6", order: 1 },
          { projectId: defaultProject.id, name: "In Progress", color: "#F59E0B", order: 2 },
          { projectId: defaultProject.id, name: "Done", color: "#10B981", order: 3 },
        ],
      });

      // Create default chat channel
      await prisma.chatChannel.create({
        data: {
          organizationId: organization.id,
          name: "General",
          description: "General team discussions",
          type: "public",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Setup completed successfully",
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
      },
      organization: {
        id: organization.id,
        name: organization.name,
      },
    });
  } catch (error: any) {
    console.error("Setup error:", error);
    return NextResponse.json({
      error: error.message,
    }, { status: 500 });
  }
}
