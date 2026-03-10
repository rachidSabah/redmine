import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";
import { auditService } from "@/lib/services/audit.service";
import bcrypt from "bcryptjs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const { id: targetUserId } = await params;

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

    // Get target user
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return ApiErrors.notFound("User not found");
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + "!Aa1";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update user password
    await db.user.update({
      where: { id: targetUserId },
      data: { password: hashedPassword },
    });

    // Log the action
    await auditService.log({
      organizationId: currentUser.memberships[0]?.organizationId,
      entityType: "USER",
      entityId: targetUserId,
      action: "PASSWORD_RESET",
      performedBy: currentUser.id,
      newValue: { resetBy: currentUser.email },
    });

    // In production, you would send an email with the new password
    // For now, return the temp password (remove in production!)
    return apiSuccess({
      message: "Password reset successfully",
      tempPassword: process.env.NODE_ENV === "development" ? tempPassword : undefined,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return ApiErrors.internal("Failed to reset password", error);
  }
}
