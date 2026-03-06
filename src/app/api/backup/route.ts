import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - List backups
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backups = await prisma.backup.findMany({
      where: { organizationId: user.organizationId || undefined },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ backups });
  } catch (error: any) {
    console.error("Error fetching backups:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch backups" }, { status: 500 });
  }
}

// POST - Create backup
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      storage = "LOCAL",
      includeUsers = true,
      includeProjects = true,
      includeTickets = true,
      includeWiki = true,
      includeSettings = true,
      includeAttachments = true,
    } = await request.json();

    const orgId = user.organizationId;
    
    // Create backup record with pending status
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.json`;

    // Collect data based on options (simplified for serverless)
    const backupData: any = {
      metadata: {
        version: "1.0",
        createdAt: new Date().toISOString(),
        organizationId: orgId,
        createdBy: user.id,
      },
    };

    // Collect data based on options
    if (includeUsers && orgId) {
      const members = await prisma.organizationMember.findMany({
        where: { organizationId: orgId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              isActive: true,
            },
          },
        },
      });
      backupData.users = members.map((m) => ({
        ...m.user,
        role: m.role,
        joinedAt: m.joinedAt,
      }));
    }

    if (includeProjects && orgId) {
      const projects = await prisma.project.findMany({
        where: { organizationId: orgId },
        include: {
          members: true,
          milestones: true,
          kanbanColumns: true,
        },
      });
      backupData.projects = projects;

      // Get tickets for each project
      if (includeTickets) {
        const projectIds = projects.map((p) => p.id);
        const tickets = await prisma.ticket.findMany({
          where: { projectId: { in: projectIds } },
          include: {
            comments: true,
            timeLogs: true,
          },
        });
        backupData.tickets = tickets;
      }
    }

    if (includeWiki && orgId) {
      const wikiPages = await prisma.wikiPage.findMany({
        where: { organizationId: orgId },
      });
      backupData.wikiPages = wikiPages;
    }

    if (includeSettings && orgId) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          name: true,
          slug: true,
          description: true,
          settings: true,
        },
      });
      backupData.organization = org;
    }

    // Calculate size (approximate)
    const dataSize = JSON.stringify(backupData).length;

    // Create backup record
    const backup = await prisma.backup.create({
      data: {
        organizationId: orgId || "system",
        name: name || `Backup ${timestamp}`,
        type: "MANUAL",
        storage: storage as any,
        filename,
        fileSize: dataSize,
        fileUrl: null,
        status: "completed",
        completedAt: new Date(),
        includeUsers,
        includeProjects,
        includeTickets,
        includeWiki,
        includeSettings,
        includeAttachments,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ 
      backup, 
      data: backupData,
      message: "Backup created successfully"
    });
  } catch (error: any) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: error.message || "Backup failed" }, { status: 500 });
  }
}
