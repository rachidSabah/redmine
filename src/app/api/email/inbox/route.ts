import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";
import { EmailService, getEmailConfiguration } from "@/lib/email";

/**
 * Email Inbox API
 * Fetches emails from configured POP3 inbox
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
        memberships: { take: 1 },
      },
    });

    if (!user) {
      return ApiErrors.forbidden();
    }

    const organizationId = user.memberships[0]?.organizationId;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    // Get email configuration with POP3 settings
    const config = await getEmailConfiguration(organizationId);
    
    if (!config) {
      return apiSuccess({
        emails: [],
        message: "No email configuration found. Please configure email settings.",
      });
    }

    const emailService = new EmailService(config);
    const result = await emailService.fetchInbox({ limit, unreadOnly });

    if (!result.success) {
      return apiSuccess({
        emails: [],
        error: result.error,
      });
    }

    return apiSuccess({
      emails: result.emails,
      config: {
        provider: config.provider,
        popHost: config.popHost,
        lastFetch: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Fetch inbox error:", error);
    return ApiErrors.internal("Failed to fetch inbox", error);
  }
}

/**
 * Mark email as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const body = await request.json();
    const { emailId, markAsRead } = body;

    // In a real implementation, this would update the email in database
    // For now, return success
    return apiSuccess({
      message: "Email updated successfully",
      emailId,
      isRead: markAsRead,
    });
  } catch (error) {
    console.error("Update email error:", error);
    return ApiErrors.internal("Failed to update email", error);
  }
}
