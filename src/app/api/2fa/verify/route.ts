import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";
import { twoFactorAuthService } from "@/lib/two-factor";

// POST - Verify 2FA code
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

    const body = await request.json();
    const { code, enable } = body;

    if (!code) {
      return ApiErrors.badRequest("Code is required");
    }

    let result;
    if (enable) {
      result = await twoFactorAuthService.verifyAndEnable(user.id, code);
    } else {
      result = await twoFactorAuthService.verify(user.id, code);
    }

    if (!result.verified) {
      return ApiErrors.badRequest(result.error || "Invalid code");
    }

    return apiSuccess({ verified: true });
  } catch (error) {
    console.error("Verify 2FA error:", error);
    return ApiErrors.internal("Failed to verify 2FA", error);
  }
}
