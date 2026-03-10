export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

/**
 * Dashboard Analytics API
 * Provides comprehensive analytics for the main dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          include: { organization: true },
        },
        projects: {
          include: { project: true },
        },
      },
    });

    if (!user) {
      return ApiErrors.forbidden();
    }

    const organizationId = user.memberships[0]?.organizationId;
    const userId = user.id;

    // Get date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all stats in parallel
    const [
      assignedTickets,
      recentActivity,
      projectStats,
      workloadData,
      upcomingDeadlines,
      recentComments,
      notifications,
    ] = await Promise.all([
      // Assigned tickets
      db.ticket.findMany({
        where: {
          assigneeId: userId,
          deletedAt: null,
          status: { notIn: ["DONE", "CANCELLED", "ARCHIVED"] },
        },
        include: {
          project: { select: { id: true, name: true, key: true } },
          reporter: { select: { id: true, name: true } },
        },
        orderBy: [
          { priority: "desc" },
          { dueDate: "asc" },
        ],
        take: 20,
      }),

      // Recent activity
      db.activity.findMany({
        where: {
          organizationId,
          createdAt: { gte: sevenDaysAgo },
        },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          ticket: { select: { id: true, key: true, title: true } },
          project: { select: { id: true, name: true, key: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),

      // Project stats
      db.project.findMany({
        where: {
          organizationId,
          isActive: true,
          deletedAt: null,
          OR: [
            { members: { some: { userId } } },
            { visibility: "PUBLIC" },
          ],
        },
        include: {
          _count: {
            select: {
              tickets: { where: { deletedAt: null } },
              members: true,
            },
          },
        },
        take: 10,
      }),

      // Workload data (tickets by status for assigned user)
      db.ticket.groupBy({
        by: ["status"],
        where: {
          assigneeId: userId,
          deletedAt: null,
        },
        _count: true,
      }),

      // Upcoming deadlines
      db.ticket.findMany({
        where: {
          assigneeId: userId,
          deletedAt: null,
          dueDate: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
          status: { notIn: ["DONE", "CANCELLED", "ARCHIVED"] },
        },
        include: {
          project: { select: { id: true, name: true, key: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),

      // Recent comments on user's tickets
      db.comment.findMany({
        where: {
          ticket: {
            reporterId: userId,
          },
        },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          ticket: { select: { id: true, key: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Unread notifications
      db.notification.findMany({
        where: {
          userId,
          isRead: false,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // Calculate summary stats
    const totalAssigned = assignedTickets.length;
    const overdueCount = assignedTickets.filter(t => 
      t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE"
    ).length;
    const highPriorityCount = assignedTickets.filter(t => 
      t.priority === "CRITICAL" || t.priority === "HIGH"
    ).length;
    const completedThisWeek = await db.ticket.count({
      where: {
        assigneeId: userId,
        status: "DONE",
        completedAt: { gte: sevenDaysAgo },
        deletedAt: null,
      },
    });

    // Time tracking stats
    const timeLogs = await db.timeLog.findMany({
      where: {
        userId,
        loggedAt: { gte: sevenDaysAgo },
      },
    });
    const hoursThisWeek = timeLogs.reduce((sum, log) => sum + log.hours, 0);

    // Build response
    return apiSuccess({
      summary: {
        totalAssigned,
        overdueCount,
        highPriorityCount,
        completedThisWeek,
        hoursThisWeek,
      },
      assignedTickets,
      recentActivity,
      projects: projectStats.map(p => ({
        id: p.id,
        name: p.name,
        key: p.key,
        ticketCount: p._count.tickets,
        memberCount: p._count.members,
      })),
      workload: {
        byStatus: workloadData.map(w => ({
          status: w.status,
          count: w._count,
        })),
      },
      upcomingDeadlines,
      recentComments,
      notifications,
    });
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    return ApiErrors.internal("Failed to fetch dashboard analytics", error);
  }
}
