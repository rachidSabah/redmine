import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, readFile, unlink } from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import path from "path";

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
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    // Create backup directory
    const backupDir = path.join(process.cwd(), "backups");
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.json`;
    const filePath = path.join(backupDir, filename);

    const orgId = user.organizationId;
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
            dependencies: true,
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
          subscriptionPlan: true,
        },
      });
      backupData.organization = org;

      const emailConfigs = await prisma.emailConfiguration.findMany({
        where: { organizationId: orgId },
      });
      backupData.emailConfigurations = emailConfigs;
    }

    // Write backup file
    await writeFile(filePath, JSON.stringify(backupData, null, 2));

    // Get file size
    const stats = await readFile(filePath);
    const fileSize = Buffer.byteLength(stats);

    // Create backup record
    const backup = await prisma.backup.create({
      data: {
        organizationId: orgId || "system",
        name: name || `Backup ${timestamp}`,
        type: "MANUAL",
        storage,
        filename,
        fileSize,
        fileUrl: `/api/backup/download/${filename}`,
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

    return NextResponse.json({ backup, downloadUrl: `/api/backup/download/${filename}` });
  } catch (error: any) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
