import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// Simple encryption for tokens (in production, use proper encryption)
const encryptToken = (token: string): string => {
  // In production, use proper encryption like AES
  return Buffer.from(token).toString('base64');
};

const decryptToken = (encrypted: string): string => {
  // In production, use proper decryption
  return Buffer.from(encrypted, 'base64').toString('utf-8');
};

// GET - Get WhatsApp configuration
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiErrors.unauthorized();
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return apiSuccess({ config: null });
    }

    const organizationId = membership.organizationId;

    // Check if user has admin role
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return ApiErrors.forbidden("Admin access required");
    }

    const config = await db.whatsAppConfig.findUnique({
      where: { organizationId },
      select: {
        id: true,
        organizationId: true,
        phoneNumberId: true,
        businessAccountId: true,
        isActive: true,
        lastTestAt: true,
        lastTestStatus: true,
        dailyLimit: true,
        dailySent: true,
        limitResetAt: true,
        createdAt: true,
        updatedAt: true,
        // Don't expose accessToken for security
        accessToken: false,
        webhookVerifyToken: false,
      },
    });

    return apiSuccess({ config, hasToken: !!config });
  } catch (error) {
    console.error("Error fetching WhatsApp config:", error);
    return ApiErrors.internal("Failed to fetch WhatsApp configuration", error);
  }
}

// POST - Create or Update WhatsApp configuration
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiErrors.unauthorized();
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return ApiErrors.forbidden("You must be a member of an organization");
    }

    // Check if user has admin role
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return ApiErrors.forbidden("Admin access required");
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const {
      accessToken,
      phoneNumberId,
      businessAccountId,
      webhookVerifyToken,
      dailyLimit,
    } = body;

    if (!accessToken || !phoneNumberId || !businessAccountId) {
      return ApiErrors.badRequest("Access token, phone number ID, and business account ID are required");
    }

    // Encrypt the access token before storing
    const encryptedToken = encryptToken(accessToken);
    const encryptedWebhookToken = webhookVerifyToken ? encryptToken(webhookVerifyToken) : null;

    const config = await db.whatsAppConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        accessToken: encryptedToken,
        phoneNumberId,
        businessAccountId,
        webhookVerifyToken: encryptedWebhookToken,
        dailyLimit: dailyLimit || 1000,
        isActive: true,
      },
      update: {
        accessToken: encryptedToken,
        phoneNumberId,
        businessAccountId,
        webhookVerifyToken: encryptedWebhookToken,
        dailyLimit: dailyLimit || 1000,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        organizationId,
        entityType: "WHATSAPP_CONFIG",
        entityId: config.id,
        action: "UPDATE",
        performedBy: user.id,
        newValue: { phoneNumberId, businessAccountId, dailyLimit },
      },
    });

    return apiSuccess({
      config: {
        id: config.id,
        phoneNumberId: config.phoneNumberId,
        businessAccountId: config.businessAccountId,
        isActive: config.isActive,
        dailyLimit: config.dailyLimit,
      },
      message: "WhatsApp configuration saved successfully"
    });
  } catch (error) {
    console.error("Error saving WhatsApp config:", error);
    return ApiErrors.internal("Failed to save WhatsApp configuration", error);
  }
}

// DELETE - Delete WhatsApp configuration
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiErrors.unauthorized();
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return ApiErrors.forbidden("You must be a member of an organization");
    }

    // Check if user has admin role
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return ApiErrors.forbidden("Admin access required");
    }

    const organizationId = membership.organizationId;

    await db.whatsAppConfig.delete({
      where: { organizationId },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        organizationId,
        entityType: "WHATSAPP_CONFIG",
        entityId: organizationId,
        action: "DELETE",
        performedBy: user.id,
      },
    });

    return apiSuccess({ message: "WhatsApp configuration deleted successfully" });
  } catch (error) {
    console.error("Error deleting WhatsApp config:", error);
    return ApiErrors.internal("Failed to delete WhatsApp configuration", error);
  }
}
