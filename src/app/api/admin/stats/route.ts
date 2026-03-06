import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Admin Statistics API
 * Provides comprehensive system statistics for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      
      // Organization stats
      prisma.organization.count(),
      prisma.organization.count({ where: { isActive: true } }),
      
      // Project stats
      prisma.project.count(),
      prisma.project.count({ where: { isActive: true } }),
      
      // Ticket stats
      prisma.ticket.count(),
      prisma.ticket.count({
        where: {
          status: { notIn: ["DONE", "CANCELLED", "ARCHIVED"] },
        },
      }),
      prisma.ticket.count({
        where: { status: "DONE" },
      }),
      prisma.ticket.count({
        where: {
          dueDate: { lt: new Date() },
          status: { notIn: ["DONE", "CANCELLED", "ARCHIVED"] },
        },
      }),
      
      // Ticket groupings
      prisma.ticket.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.ticket.groupBy({
        by: ["priority"],
        _count: true,
      }),
      prisma.ticket.groupBy({
        by: ["type"],
        _count: true,
      }),
      
      // Recent activity
      prisma.activity.findMany({
        take: 15,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      }),
      
      // Recent users
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, image: true, createdAt: true },
      }),
      
      // Storage calculation (sum of all attachments)
      prisma.attachment.aggregate({
        _sum: { size: true },
      }),
    ]);

    // Calculate trends (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [newUsers30Days, newUsersPrev30Days, newTickets30Days, newTicketsPrev30Days] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      prisma.ticket.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.ticket.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    ]);

    const userGrowth = newUsersPrev30Days > 0 
      ? Math.round(((newUsers30Days - newUsersPrev30Days) / newUsersPrev30Days) * 100) 
      : 100;
    
    const ticketGrowth = newTicketsPrev30Days > 0 
      ? Math.round(((newTickets30Days - newTicketsPrev30Days) / newTicketsPrev30Days) * 100) 
      : 100;

    return NextResponse.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    console.error("Failed to fetch admin stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
