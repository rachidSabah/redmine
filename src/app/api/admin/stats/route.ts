export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

/**
 * Admin Statistics API
 * Provides comprehensive system statistics for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    // Get user with admin check
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!user) {
      return ApiErrors.forbidden("User not found");
    }

    // Get comprehensive stats
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalOrganizations,
      activeOrganizations,
      totalProjects,
      activeProjects,
      totalTickets,
      openTickets,
      completedTickets,
      overdueTickets,
      ticketsByStatus,
      ticketsByPriority,
      ticketsByType,
      recentActivity,
      recentUsers,
      storageUsed,
    ] = await Promise.all([
      // User stats
      db.user.count(),
      db.user.count({ where: { isActive: true, deletedAt: null } }),
      db.user.count({ where: { OR: [{ isActive: false }, { deletedAt: { not: null } }] } }),
      
      // Organization stats
      db.organization.count(),
      db.organization.count({ where: { isActive: true, deletedAt: null } }),
      
      // Project stats
      db.project.count(),
      db.project.count({ where: { isActive: true, deletedAt: null } }),
      
      // Ticket stats
      db.ticket.count({ where: { deletedAt: null } }),
      db.ticket.count({
        where: {
          deletedAt: null,
          status: { notIn: ["DONE", "CANCELLED", "ARCHIVED"] },
        },
      }),
      db.ticket.count({
        where: { deletedAt: null, status: "DONE" },
      }),
      db.ticket.count({
        where: {
          deletedAt: null,
          dueDate: { lt: new Date() },
          status: { notIn: ["DONE", "CANCELLED", "ARCHIVED"] },
        },
      }),
      
      // Ticket groupings
      db.ticket.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        _count: true,
      }),
      db.ticket.groupBy({
        by: ["priority"],
        where: { deletedAt: null },
        _count: true,
      }),
      db.ticket.groupBy({
        by: ["type"],
        where: { deletedAt: null },
        _count: true,
      }),
      
      // Recent activity
      db.activity.findMany({
        take: 15,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      }),
      
      // Recent users
      db.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, image: true, createdAt: true },
      }),
      
      // Storage calculation (sum of all attachments)
      db.attachment.aggregate({
        _sum: { size: true },
      }),
    ]);

    // Calculate trends (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [newUsers30Days, newUsersPrev30Days, newTickets30Days, newTicketsPrev30Days] = await Promise.all([
      db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.user.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      db.ticket.count({ where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null } }),
      db.ticket.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, deletedAt: null } }),
    ]);

    const userGrowth = newUsersPrev30Days > 0 
      ? Math.round(((newUsers30Days - newUsersPrev30Days) / newUsersPrev30Days) * 100) 
      : 100;
    
    const ticketGrowth = newTicketsPrev30Days > 0 
      ? Math.round(((newTickets30Days - newTicketsPrev30Days) / newTicketsPrev30Days) * 100) 
      : 100;

    return apiSuccess({
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        newLast30Days: newUsers30Days,
        growthPercent: userGrowth,
      },
      organizations: {
        total: totalOrganizations,
        active: activeOrganizations,
      },
      projects: {
        total: totalProjects,
        active: activeProjects,
      },
      tickets: {
        total: totalTickets,
        open: openTickets,
        completed: completedTickets,
        overdue: overdueTickets,
        newLast30Days: newTickets30Days,
        growthPercent: ticketGrowth,
        byStatus: ticketsByStatus.map(s => ({ status: s.status, count: s._count })),
        byPriority: ticketsByPriority.map(p => ({ priority: p.priority, count: p._count })),
        byType: ticketsByType.map(t => ({ type: t.type, count: t._count })),
      },
      storage: {
        totalBytes: storageUsed._sum.size || 0,
        totalMB: Math.round((storageUsed._sum.size || 0) / (1024 * 1024)),
      },
      recentActivity,
      recentUsers,
    });
  } catch (error) {
    console.error("Failed to fetch admin stats:", error);
    return ApiErrors.internal("Failed to fetch statistics", error);
  }
}
