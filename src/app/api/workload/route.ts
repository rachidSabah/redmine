import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET - Get workload profiles
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized", profiles: [] }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
      include: {
        organization: {
          include: {
            members: {
              where: { isActive: true },
              include: {
                user: { select: { id: true, name: true, email: true, image: true } },
              },
            },
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ profiles: [] });
    }

    // Get workload profiles for all org members
    const profiles = await prisma.workloadProfile.findMany({
      where: {
        organizationId: membership.organizationId,
        ...(userId ? { userId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    // Calculate workload for each user
    const enrichedProfiles = await Promise.all(
      profiles.map(async (profile) => {
        // Get assigned tickets with estimated hours
        const assignedTickets = await prisma.ticket.findMany({
          where: {
            assigneeId: profile.userId,
            status: { notIn: ["DONE", "CANCELLED", "ARCHIVED"] },
          },
          select: { estimatedHours: true },
        });

        const totalEstimated = assignedTickets.reduce(
          (sum, t) => sum + (t.estimatedHours || 0),
          0
        );

        // Get time logged this week
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const timeLogs = await prisma.timeLog.findMany({
          where: {
            userId: profile.userId,
            loggedAt: { gte: weekStart },
          },
          select: { hours: true },
        });

        const loggedThisWeek = timeLogs.reduce((sum, t) => sum + t.hours, 0);

        return {
          ...profile,
          assignedTickets: assignedTickets.length,
          totalEstimatedHours: totalEstimated,
          loggedThisWeek,
          utilization: profile.weeklyCapacity > 0 
            ? Math.round((totalEstimated / profile.weeklyCapacity) * 100) 
            : 0,
        };
      })
    );

    // Add profiles for users without workload profiles
    const profileUserIds = profiles.map((p) => p.userId);
    const missingMembers = membership.organization.members.filter(
      (m) => !profileUserIds.includes(m.userId)
    );

    const defaultProfiles = await Promise.all(
      missingMembers.map(async (member) => {
        const assignedTickets = await prisma.ticket.findMany({
          where: {
            assigneeId: member.userId,
            status: { notIn: ["DONE", "CANCELLED", "ARCHIVED"] },
          },
          select: { estimatedHours: true },
        });

        const totalEstimated = assignedTickets.reduce(
          (sum, t) => sum + (t.estimatedHours || 0),
          0
        );

        return {
          id: null,
          organizationId: membership.organizationId,
          userId: member.userId,
          weeklyCapacity: 40,
          workingDays: [1, 2, 3, 4, 5],
          workingHours: { start: "09:00", end: "17:00" },
          currentLoad: totalEstimated,
          user: member.user,
          assignedTickets: assignedTickets.length,
          totalEstimatedHours: totalEstimated,
          loggedThisWeek: 0,
          utilization: Math.round((totalEstimated / 40) * 100),
        };
      })
    );

    return NextResponse.json({ 
      profiles: [...enrichedProfiles, ...defaultProfiles] 
    });
  } catch (error) {
    console.error("Error fetching workload profiles:", error);
    return NextResponse.json({ error: "Failed to fetch workload profiles", profiles: [] }, { status: 500 });
  }
}

// POST - Create or update workload profile
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { userId, weeklyCapacity, workingDays, workingHours } = body;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const targetUserId = userId || user.id;

    // Upsert workload profile
    const profile = await prisma.workloadProfile.upsert({
      where: {
        organizationId_userId: {
          organizationId: membership.organizationId,
          userId: targetUserId,
        },
      },
      create: {
        organizationId: membership.organizationId,
        userId: targetUserId,
        weeklyCapacity: weeklyCapacity || 40,
        workingDays: workingDays || [1, 2, 3, 4, 5],
        workingHours: workingHours || { start: "09:00", end: "17:00" },
      },
      update: {
        weeklyCapacity: weeklyCapacity || 40,
        workingDays: workingDays || [1, 2, 3, 4, 5],
        workingHours: workingHours || { start: "09:00", end: "17:00" },
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error updating workload profile:", error);
    return NextResponse.json({ error: "Failed to update workload profile" }, { status: 500 });
  }
}
