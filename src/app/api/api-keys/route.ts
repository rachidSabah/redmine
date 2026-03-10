import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";
import { randomBytes } from "crypto";

// GET - List API keys
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

    const isAdmin = ["OWNER", "ADMIN"].includes(user.memberships[0].role);
    if (!isAdmin) {
      return ApiErrors.forbidden("Admin access required");
    }

    const apiKeys = await db.apiKey.findMany({
      where: { organizationId: user.memberships[0].organizationId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess({ apiKeys });
  } catch (error) {
    console.error("Get API keys error:", error);
    return ApiErrors.internal("Failed to get API keys", error);
  }
}

// POST - Create API key
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

    const isAdmin = ["OWNER", "ADMIN"].includes(user.memberships[0].role);
    if (!isAdmin) {
      return ApiErrors.forbidden("Admin access required");
    }

    const body = await request.json();
    const { name, scopes, rateLimit, expiresAt } = body;

    if (!name) {
      return ApiErrors.badRequest("Name is required");
    }

    // Generate API key
    const keyBytes = randomBytes(32);
    const key = `sk_${keyBytes.toString("base64url")}`;
    const keyPrefix = key.substring(0, 11);

    const apiKey = await db.apiKey.create({
      data: {
        organizationId: user.memberships[0].organizationId,
        userId: user.id,
        name,
        key,
        keyPrefix,
        scopes: scopes || ["read"],
        rateLimit: rateLimit || 1000,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    // Return the full key only once
    return apiSuccess({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key, // Only returned on creation
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        rateLimit: apiKey.rateLimit,
        expiresAt: apiKey.expiresAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Create API key error:", error);
    return ApiErrors.internal("Failed to create API key", error);
  }
}

// DELETE - Revoke API key
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return ApiErrors.badRequest("API key ID is required");
    }

    // Delete only if it belongs to user's organization
    await db.apiKey.deleteMany({
      where: {
        id,
        organizationId: user.memberships[0].organizationId,
      },
    });

    return apiSuccess({ message: "API key revoked" });
  } catch (error) {
    console.error("Delete API key error:", error);
    return ApiErrors.internal("Failed to delete API key", error);
  }
}
