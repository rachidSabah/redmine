export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";
import { twoFactorAuthService } from "@/lib/two-factor";

// GET - Get 2FA status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return ApiErrors.forbidden();
    }

    const status = await twoFactorAuthService.getStatus(user.id);

    return apiSuccess(status);
  } catch (error) {
    console.error("Get 2FA status error:", error);
    return ApiErrors.internal("Failed to get 2FA status", error);
  }
}

// POST - Setup 2FA
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return ApiErrors.forbidden();
    }

    const setup = await twoFactorAuthService.setup(user.id, user.email);

    return apiSuccess(setup, { status: 201 });
  } catch (error) {
    console.error("Setup 2FA error:", error);
    return ApiErrors.internal("Failed to setup 2FA", error);
  }
}

// DELETE - Disable 2FA
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return ApiErrors.forbidden();
    }

    const body = await request.json().catch(() => ({}));
    const result = await twoFactorAuthService.disable(user.id, body.password);

    if (!result.success) {
      return ApiErrors.badRequest(result.error || "Failed to disable 2FA");
    }

    return apiSuccess({ message: "2FA disabled" });
  } catch (error) {
    console.error("Disable 2FA error:", error);
    return ApiErrors.internal("Failed to disable 2FA", error);
  }
}
