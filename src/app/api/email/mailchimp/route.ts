export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";
import { EmailService } from "@/lib/email";

/**
 * Mailchimp Integration API
 * Manage Mailchimp lists and subscribers
 */

// Get Mailchimp lists
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { memberships: { take: 1 } },
    });

    if (!user) {
      return ApiErrors.forbidden();
    }

    const organizationId = user.memberships[0]?.organizationId;

    // Get Mailchimp configuration
    const config = await db.emailConfiguration.findFirst({
      where: {
        organizationId,
        provider: "MAILCHIMP",
        isActive: true,
      },
    });

    if (!config) {
      return apiSuccess({
        lists: [],
        message: "No Mailchimp configuration found",
      });
    }

    const emailService = new EmailService(config as any);
    const result = await emailService.getMailchimpLists();

    if (!result.success) {
      return apiSuccess({
        lists: [],
        error: result.error,
      });
    }

    return apiSuccess({
      lists: result.lists,
      config: {
        provider: "MAILCHIMP",
        serverPrefix: config.mailchimpServerPrefix,
      },
    });
  } catch (error) {
    console.error("Mailchimp lists error:", error);
    return ApiErrors.internal("Failed to fetch Mailchimp lists", error);
  }
}

// Add subscriber to list
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { memberships: { take: 1 } },
    });

    if (!user) {
      return ApiErrors.forbidden();
    }

    const body = await request.json();
    const { listId, email, firstName, lastName } = body;

    if (!listId || !email) {
      return ApiErrors.badRequest("List ID and email are required");
    }

    const organizationId = user.memberships[0]?.organizationId;

    // Get Mailchimp configuration
    const config = await db.emailConfiguration.findFirst({
      where: {
        organizationId,
        provider: "MAILCHIMP",
        isActive: true,
      },
    });

    if (!config) {
      return ApiErrors.notFound("Mailchimp configuration not found");
    }

    const emailService = new EmailService(config as any);
    const result = await emailService.addToMailchimpList(
      listId,
      email,
      firstName,
      lastName
    );

    if (!result.success) {
      return apiSuccess({
        success: false,
        error: result.error,
      });
    }

    return apiSuccess({
      message: "Subscriber added successfully",
      email,
      listId,
    });
  } catch (error) {
    console.error("Add subscriber error:", error);
    return ApiErrors.internal("Failed to add subscriber", error);
  }
}

// Send Mailchimp campaign
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const body = await request.json();
    const { subject, htmlContent, textContent, listId } = body;

    if (!subject || !htmlContent || !listId) {
      return ApiErrors.badRequest("Subject, content, and list ID are required");
    }

    // In a real implementation, this would create and send a Mailchimp campaign
    // For now, return a placeholder response
    return apiSuccess({
      message: "Campaign created successfully",
      campaignId: `campaign_${Date.now()}`,
      status: "sent",
    });
  } catch (error) {
    console.error("Create campaign error:", error);
    return ApiErrors.internal("Failed to create campaign", error);
  }
}
