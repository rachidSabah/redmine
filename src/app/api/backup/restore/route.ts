export const runtime = 'edge';
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { hash } from "bcrypt";

// POST - Restore from backup
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized - Owner only" }, { status: 401 });
    }

    const { backupId, restoreOptions } = await request.json();

    // Get backup record
    const backup = await prisma.backup.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    // Read backup file
    const backupDir = path.join(process.cwd(), "backups");
    const filePath = path.join(backupDir, backup.filename);

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "Backup file not found" }, { status: 404 });
    }

    const fileContent = await readFile(filePath, "utf-8");
    const backupData = JSON.parse(fileContent);

    const results: any = {
      restored: {},
      errors: [],
    };

    const options = restoreOptions || {
      users: true,
      projects: true,
      tickets: true,
      wiki: true,
      settings: false, // Settings restore is off by default
    };

    // Update backup status
    await prisma.backup.update({
      where: { id: backupId },
      data: { status: "restoring" },
    });

    const orgId = user.organizationId;

    // Restore users
    if (options.users && backupData.users && orgId) {
      try {
        for (const userData of backupData.users) {
          // Check if user exists
          const existingUser = await prisma.user.findUnique({
            where: { email: userData.email },
          });

          if (!existingUser) {
            // Create user with temporary password
            const tempPassword = await hash(Math.random().toString(36), 12);
            
            await prisma.user.create({
              data: {
                email: userData.email,
                name: userData.name,
                image: userData.image,
                password: tempPassword,
                isActive: true,
                memberships: {
                  create: {
                    organizationId: orgId,
                    role: userData.role || "MEMBER",
                    isActive: true,
                  },
                },
              },
            });
          }
        }
        results.restored.users = backupData.users.length;
      } catch (e: any) {
        results.errors.push(`Users restore: ${e.message}`);
      }
    }

    // Restore projects
    if (options.projects && backupData.projects && orgId) {
      try {
        for (const projectData of backupData.projects) {
          const existingProject = await prisma.project.findUnique({
            where: { id: projectData.id },
          });

          if (!existingProject) {
            await prisma.project.create({
              data: {
                id: projectData.id,
                organizationId: orgId,
                name: projectData.name,
                key: projectData.key,
                description: projectData.description,
                color: projectData.color,
                visibility: projectData.visibility,
                progress: projectData.progress || 0,
              },
            });
          }
        }
        results.restored.projects = backupData.projects.length;
      } catch (e: any) {
        results.errors.push(`Projects restore: ${e.message}`);
      }
    }

    // Restore tickets
    if (options.tickets && backupData.tickets) {
      try {
        for (const ticketData of backupData.tickets) {
          const existingTicket = await prisma.ticket.findUnique({
            where: { id: ticketData.id },
          });

          if (!existingTicket) {
            await prisma.ticket.create({
              data: {
                id: ticketData.id,
                projectId: ticketData.projectId,
                number: ticketData.number,
                key: ticketData.key,
                title: ticketData.title,
                description: ticketData.description,
                type: ticketData.type,
                status: ticketData.status,
                priority: ticketData.priority,
                assigneeId: ticketData.assigneeId,
                reporterId: ticketData.reporterId || user.id,
                dueDate: ticketData.dueDate ? new Date(ticketData.dueDate) : null,
                progress: ticketData.progress || 0,
              },
            }).catch(() => {}); // Skip if project doesn't exist
          }
        }
        results.restored.tickets = backupData.tickets.length;
      } catch (e: any) {
        results.errors.push(`Tickets restore: ${e.message}`);
      }
    }

    // Restore wiki pages
    if (options.wiki && backupData.wikiPages && orgId) {
      try {
        for (const wikiData of backupData.wikiPages) {
          const existingWiki = await prisma.wikiPage.findUnique({
            where: { id: wikiData.id },
          });

          if (!existingWiki) {
            await prisma.wikiPage.create({
              data: {
                id: wikiData.id,
                organizationId: orgId,
                projectId: wikiData.projectId,
                title: wikiData.title,
                slug: wikiData.slug,
                content: wikiData.content,
                isPublished: wikiData.isPublished,
                authorId: wikiData.authorId || user.id,
              },
            }).catch(() => {}); // Skip if there's an error
          }
        }
        results.restored.wikiPages = backupData.wikiPages.length;
      } catch (e: any) {
        results.errors.push(`Wiki restore: ${e.message}`);
      }
    }

    // Update backup status
    await prisma.backup.update({
      where: { id: backupId },
      data: { status: "completed" },
    });

    return NextResponse.json({
      success: true,
      message: "Restore completed",
      results,
    });
  } catch (error: any) {
    console.error("Restore error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
