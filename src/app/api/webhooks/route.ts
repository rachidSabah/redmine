export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess, parsePaginationParams } from "@/lib/api-response";
import { webhookService } from "@/lib/webhooks";

// GET - List webhooks
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

    if (!user || !user.memberships[0]) {
      return ApiErrors.forbidden();
    }

    const membership = user.memberships[0];
    const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);

    if (!isAdmin) {
      return ApiErrors.forbidden("Admin access required");
    }

    const webhooks = await db.webhook.findMany({
      where: { organizationId: membership.organizationId },
      include: {
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Mask secrets
    const maskedWebhooks = webhooks.map(w => ({
      ...w,
      secret: w.secret ? "••••••••" : null,
    }));

    return apiSuccess({ webhooks: maskedWebhooks });
  } catch (error) {
    console.error("Get webhooks error:", error);
    return ApiErrors.internal("Failed to get webhooks", error);
  }
}

// POST - Create webhook
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

    if (!user || !user.memberships[0]) {
      return ApiErrors.forbidden();
    }

    const membership = user.memberships[0];
    const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);

    if (!isAdmin) {
      return ApiErrors.forbidden("Admin access required");
    }

    const body = await request.json();
    const { name, url, secret, events, headers } = body;

    if (!name || !url || !events || !Array.isArray(events)) {
      return ApiErrors.badRequest("Name, URL, and events are required");
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return ApiErrors.badRequest("Invalid URL format");
    }

    const webhook = await webhookService.createWebhook({
      organizationId: membership.organizationId,
      name,
      url,
      secret: secret || crypto.randomUUID(),
      events,
      headers,
      createdBy: user.id,
    });

    return apiSuccess({ webhook }, { status: 201 });
  } catch (error) {
    console.error("Create webhook error:", error);
    return ApiErrors.internal("Failed to create webhook", error);
  }
}
