import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission, canManageRole } from "@/lib/permissions";

// GET - List team members for a project
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const organizationId = searchParams.get("organizationId");

    if (projectId) {
      // Get project members
      const members = await prisma.projectMember.findMany({
        where: { projectId },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      });

      return NextResponse.json({ members });
    } else if (organizationId) {
      // Get organization members
      const members = await prisma.organizationMember.findMany({
        where: { organizationId, isActive: true },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, lastLoginAt: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      });

      return NextResponse.json({ members });
    }

    // Default: get user's organization members
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, isActive: true },
      select: { organizationId: true, role: true },
    });

    if (!membership) {
      return NextResponse.json({ members: [] });
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: membership.organizationId, isActive: true },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, lastLoginAt: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json({ members, userRole: membership.role });
  } catch (error) {
    console.error("Failed to fetch team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

// POST - Add team member
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, role, projectId, organizationId } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    // Get user's role
    const userMembership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, isActive: true },
      include: { organization: true },
    });

    if (!userMembership) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Check permission
    if (!hasPermission(userMembership.role, "org.members.invite") && 
        !hasPermission(userMembership.role, "project.members.manage")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Find user by email
    const targetUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!targetUser) {
      // Create invitation instead
      const existingInvite = await prisma.organizationInvitation.findFirst({
        where: {
          organizationId: organizationId || userMembership.organizationId,
          email,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (existingInvite) {
        return NextResponse.json({ 
          error: "Pending invitation already exists for this email" 
        }, { status: 400 });
      }

      const invitation = await prisma.organizationInvitation.create({
        data: {
          organizationId: organizationId || userMembership.organizationId,
          email,
          role,
          invitedBy: session.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      return NextResponse.json({ 
        invitation,
        message: "Invitation sent to " + email 
      });
    }

    // Check if can manage this role
    if (!canManageRole(userMembership.role, role as any)) {
      return NextResponse.json(
        { error: "Cannot assign this role" },
        { status: 403 }
      );
    }

    // Add to organization
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organizationId || userMembership.organizationId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      // Update role
      const updated = await prisma.organizationMember.update({
        where: { id: existingMember.id },
        data: { role: role as any, isActive: true },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      });
      return NextResponse.json({ member: updated, message: "Member role updated" });
    }

    const member = await prisma.organizationMember.create({
      data: {
        organizationId: organizationId || userMembership.organizationId,
        userId: targetUser.id,
        role: role as any,
        invitedBy: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    // If projectId provided, also add to project
    if (projectId) {
      await prisma.projectMember.create({
        data: {
          projectId,
          userId: targetUser.id,
          role: role as any,
        },
      });
    }

    return NextResponse.json({ member, message: "Member added successfully" });
  } catch (error) {
    console.error("Failed to add team member:", error);
    return NextResponse.json(
      { error: "Failed to add team member" },
      { status: 500 }
    );
  }
}

// PUT - Update member role
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, role, projectId } = body;

    if (!memberId || !role) {
      return NextResponse.json(
        { error: "Member ID and role are required" },
        { status: 400 }
      );
    }

    // Get user's role
    const userMembership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, isActive: true },
    });

    if (!userMembership) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Check permission
    if (!hasPermission(userMembership.role, "org.members.manage") && 
        !hasPermission(userMembership.role, "project.members.manage")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    if (projectId) {
      // Update project member
      const targetMember = await prisma.projectMember.findFirst({
        where: { id: memberId, projectId },
      });

      if (!targetMember) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      if (!canManageRole(userMembership.role, targetMember.role)) {
        return NextResponse.json(
          { error: "Cannot manage this member" },
          { status: 403 }
        );
      }

      const updated = await prisma.projectMember.update({
        where: { id: memberId },
        data: { role: role as any },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      });

      return NextResponse.json({ member: updated });
    } else {
      // Update organization member
      const targetMember = await prisma.organizationMember.findFirst({
        where: { id: memberId, organizationId: userMembership.organizationId },
      });

      if (!targetMember) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      if (!canManageRole(userMembership.role, targetMember.role)) {
        return NextResponse.json(
          { error: "Cannot manage this member" },
          { status: 403 }
        );
      }

      const updated = await prisma.organizationMember.update({
        where: { id: memberId },
        data: { role: role as any },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      });

      return NextResponse.json({ member: updated });
    }
  } catch (error) {
    console.error("Failed to update member:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}

// DELETE - Remove team member
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const projectId = searchParams.get("projectId");

    if (!memberId) {
      return NextResponse.json({ error: "Member ID required" }, { status: 400 });
    }

    // Get user's role
    const userMembership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, isActive: true },
    });

    if (!userMembership) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Check permission
    if (!hasPermission(userMembership.role, "org.members.manage") && 
        !hasPermission(userMembership.role, "project.members.manage")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    if (projectId) {
      // Remove from project
      const targetMember = await prisma.projectMember.findFirst({
        where: { id: memberId, projectId },
      });

      if (!targetMember) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      if (!canManageRole(userMembership.role, targetMember.role)) {
        return NextResponse.json(
          { error: "Cannot remove this member" },
          { status: 403 }
        );
      }

      await prisma.projectMember.delete({ where: { id: memberId } });
      return NextResponse.json({ success: true, message: "Member removed from project" });
    } else {
      // Remove from organization
      const targetMember = await prisma.organizationMember.findFirst({
        where: { id: memberId, organizationId: userMembership.organizationId },
      });

      if (!targetMember) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      if (!canManageRole(userMembership.role, targetMember.role)) {
        return NextResponse.json(
          { error: "Cannot remove this member" },
          { status: 403 }
        );
      }

      await prisma.organizationMember.update({
        where: { id: memberId },
        data: { isActive: false },
      });

      return NextResponse.json({ success: true, message: "Member removed from organization" });
    }
  } catch (error) {
    console.error("Failed to remove member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
