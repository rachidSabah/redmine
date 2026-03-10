import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const orgId = membership.organizationId;

    // Get all projects in organization
    const projects = await prisma.project.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, key: true, progress: true, createdAt: true },
    });

    const projectIds = projects.map(p => p.id);

    // Ticket status distribution
    const ticketsByStatus = await prisma.ticket.groupBy({
      by: ['status'],
      where: { projectId: { in: projectIds } },
      _count: true,
    });

    // Ticket priority distribution
    const ticketsByPriority = await prisma.ticket.groupBy({
      by: ['priority'],
      where: { projectId: { in: projectIds } },
      _count: true,
    });

    // Tickets created per week (last 8 weeks)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const recentTickets = await prisma.ticket.findMany({
      where: {
        projectId: { in: projectIds },
        createdAt: { gte: eightWeeksAgo },
      },
      select: { createdAt: true, status: true },
    });

    // Group by week
    const ticketsPerWeek: { week: string; count: number; completed: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekTickets = recentTickets.filter(t => 
        t.createdAt >= weekStart && t.createdAt < weekEnd
      );
      const completed = weekTickets.filter(t => t.status === 'DONE').length;

      ticketsPerWeek.push({
        week: weekStart.toISOString().split('T')[0],
        count: weekTickets.length,
        completed,
      });
    }

    // Total tickets and completed
    const totalTickets = await prisma.ticket.count({
      where: { projectId: { in: projectIds } },
    });

    const completedTickets = await prisma.ticket.count({
      where: { 
        projectId: { in: projectIds },
        status: 'DONE',
      },
    });

    // Average time to completion (tickets with completedAt)
    const completedWithDates = await prisma.ticket.findMany({
      where: {
        projectId: { in: projectIds },
        status: 'DONE',
        completedAt: { not: null },
      },
      select: { createdAt: true, completedAt: true },
    });

    let avgResolutionTime = 0;
    if (completedWithDates.length > 0) {
      const totalDays = completedWithDates.reduce((sum, t) => {
        if (t.completedAt) {
          const days = Math.ceil((t.completedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }
        return sum;
      }, 0);
      avgResolutionTime = Math.round(totalDays / completedWithDates.length);
    }

    // Time logged this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const timeLogs = await prisma.timeLog.findMany({
      where: {
        ticket: { projectId: { in: projectIds } },
        loggedAt: { gte: monthStart },
      },
      select: { hours: true },
    });

    const totalTimeLogged = timeLogs.reduce((sum, log) => sum + log.hours, 0);

    // Team member activity
    const memberActivity = await prisma.activity.groupBy({
      by: ['userId'],
      where: { organizationId: orgId },
      _count: true,
    });

    const activeUsers = await prisma.user.findMany({
      where: { id: { in: memberActivity.map(m => m.userId) } },
      select: { id: true, name: true, email: true, image: true },
    });

    const teamActivity = memberActivity.map(m => {
      const user = activeUsers.find(u => u.id === m.userId);
      return {
        user,
        activityCount: m._count,
      };
    }).sort((a, b) => b.activityCount - a.activityCount).slice(0, 10);

    // Project progress summary
    const projectProgress = projects.map(p => {
      const progress = p.progress || 0;
      return {
        id: p.id,
        name: p.name,
        key: p.key,
        progress,
      };
    });

    return NextResponse.json({
      summary: {
        totalProjects: projects.length,
        totalTickets,
        completedTickets,
        pendingTickets: totalTickets - completedTickets,
        completionRate: totalTickets > 0 ? Math.round((completedTickets / totalTickets) * 100) : 0,
        avgResolutionTime,
        totalTimeLogged,
      },
      ticketsByStatus: ticketsByStatus.map(t => ({ status: t.status, count: t._count })),
      ticketsByPriority: ticketsByPriority.map(t => ({ priority: t.priority, count: t._count })),
      ticketsPerWeek,
      teamActivity,
      projectProgress,
    });
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
