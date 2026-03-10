export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";
import { webhookService } from "@/lib/webhooks";

// GET - Get single webhook
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const webhook = await db.webhook.findFirst({
      where: {
        id,
        organizationId: user.memberships[0].organizationId,
      },
      include: {
        deliveries: {
          take: 50,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!webhook) {
      return ApiErrors.notFound("Webhook not found");
    }

    return apiSuccess({ webhook });
  } catch (error) {
    console.error("Get webhook error:", error);
    return ApiErrors.internal("Failed to get webhook", error);
  }
}

// PATCH - Update webhook
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();

    const webhook = await db.webhook.findFirst({
      where: {
        id,
        organizationId: user.memberships[0].organizationId,
      },
    });

    if (!webhook) {
      return ApiErrors.notFound("Webhook not found");
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.url !== undefined) updateData.url = body.url;
    if (body.secret !== undefined) updateData.secret = body.secret;
    if (body.events !== undefined) updateData.events = body.events;
    if (body.headers !== undefined) updateData.headers = body.headers;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const updated = await db.webhook.update({
      where: { id },
      data: updateData,
    });

    return apiSuccess({ webhook: updated });
  } catch (error) {
    console.error("Update webhook error:", error);
    return ApiErrors.internal("Failed to update webhook", error);
  }
}

// DELETE - Delete webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const webhook = await db.webhook.findFirst({
      where: {
        id,
        organizationId: user.memberships[0].organizationId,
      },
    });

    if (!webhook) {
      return ApiErrors.notFound("Webhook not found");
    }

    await db.webhook.delete({ where: { id } });

    return apiSuccess({ message: "Webhook deleted" });
  } catch (error) {
    console.error("Delete webhook error:", error);
    return ApiErrors.internal("Failed to delete webhook", error);
  }
}

// POST - Test webhook
export async function POST_TEST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const { id } = await params;

    const result = await webhookService.testWebhook(id);

    return apiSuccess(result);
  } catch (error) {
    console.error("Test webhook error:", error);
    return ApiErrors.internal("Failed to test webhook", error);
  }
}
