export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";
import { auditService } from "@/lib/services/audit.service";
import bcrypt from "bcryptjs";

// GET - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            organization: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        projects: {
          include: {
            project: {
              select: { id: true, name: true, key: true },
            },
          },
        },
        _count: {
          select: {
            reportedTickets: true,
            assignedTickets: true,
            comments: true,
            timeLogs: true,
          },
        },
      },
    });

    if (!user) {
      return ApiErrors.notFound("User not found");
    }

    return apiSuccess({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return ApiErrors.internal("Failed to get user", error);
  }
}

// PATCH - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, password, isActive } = body;

    // Check if current user is admin
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { role: { in: ["OWNER", "ADMIN"] } },
        },
      },
    });

    if (!currentUser) {
      return ApiErrors.forbidden("Admin access required");
    }

    // Get existing user
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return ApiErrors.notFound("User not found");
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
    });

    // Log the action
    await auditService.log({
      organizationId: currentUser.memberships[0]?.organizationId,
      entityType: "USER",
      entityId: id,
      action: "UPDATE",
      oldValue: { name: existingUser.name, email: existingUser.email, isActive: existingUser.isActive },
      newValue: updateData,
      performedBy: currentUser.id,
    });

    return apiSuccess({ user: updatedUser });
  } catch (error) {
    console.error("Update user error:", error);
    return ApiErrors.internal("Failed to update user", error);
  }
}

// DELETE - Delete user (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;

    // Check if current user is admin
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { role: { in: ["OWNER", "ADMIN"] } },
        },
      },
    });

    if (!currentUser) {
      return ApiErrors.forbidden("Admin access required");
    }

    // Prevent deleting yourself
    if (currentUser.id === id) {
      return ApiErrors.badRequest("Cannot delete your own account");
    }

    // Get existing user for audit
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return ApiErrors.notFound("User not found");
    }

    // Soft delete user
    await db.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: currentUser.id,
      },
    });

    // Log the action
    await auditService.log({
      organizationId: currentUser.memberships[0]?.organizationId,
      entityType: "USER",
      entityId: id,
      action: "SOFT_DELETE",
      oldValue: { name: existingUser.name, email: existingUser.email },
      performedBy: currentUser.id,
    });

    return apiSuccess({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    return ApiErrors.internal("Failed to delete user", error);
  }
}
