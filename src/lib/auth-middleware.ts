import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission, ROLE_PERMISSIONS } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

export interface AuthContext {
  userId: string;
  organizationId: string;
  role: UserRole;
  permissions: string[];
}

/**
 * Get the current user's auth context with permissions
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, isActive: true },
      select: { organizationId: true, role: true },
    });

    if (!membership) return null;

    const permissions = ROLE_PERMISSIONS[membership.role] || [];

    return {
      userId: session.user.id,
      organizationId: membership.organizationId,
      role: membership.role,
      permissions,
    };
  } catch (error) {
    console.error("Error getting auth context:", error);
    return null;
  }
}

/**
 * Check if user has a specific permission
 */
export async function checkPermission(permission: string): Promise<boolean> {
  const ctx = await getAuthContext();
  if (!ctx) return false;
  return ctx.permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export async function checkAnyPermission(permissions: string[]): Promise<boolean> {
  const ctx = await getAuthContext();
  if (!ctx) return false;
  return permissions.some(p => ctx.permissions.includes(p));
}

/**
 * Middleware wrapper for API routes with permission checking
 */
export function withPermission(
  permission: string | string[], 
  handler: (request: NextRequest, ctx: AuthContext, ...args: unknown[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    const ctx = await getAuthContext();
    
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permissions = Array.isArray(permission) ? permission : [permission];
    const hasAccess = permissions.some(p => ctx.permissions.includes(p));

    if (!hasAccess) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    return handler(request, ctx, ...args);
  };
}

/**
 * Middleware wrapper for organization-scoped operations
 */
export function withOrganizationAccess(
  handler: (request: NextRequest, ctx: AuthContext, ...args: unknown[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    const ctx = await getAuthContext();
    
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(request, ctx, ...args);
  };
}

/**
 * Check project access
 */
export async function checkProjectAccess(projectId: string, requiredPermission?: string): Promise<{
  hasAccess: boolean;
  ctx: AuthContext | null;
  project: any | null;
}> {
  const ctx = await getAuthContext();
  
  if (!ctx) {
    return { hasAccess: false, ctx: null, project: null };
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: ctx.organizationId,
    },
  });

  if (!project) {
    return { hasAccess: false, ctx, project: null };
  }

  if (requiredPermission && !ctx.permissions.includes(requiredPermission)) {
    return { hasAccess: false, ctx, project };
  }

  return { hasAccess: true, ctx, project };
}

/**
 * Check ticket access
 */
export async function checkTicketAccess(ticketId: string): Promise<{
  hasAccess: boolean;
  ctx: AuthContext | null;
  ticket: any | null;
}> {
  const ctx = await getAuthContext();
  
  if (!ctx) {
    return { hasAccess: false, ctx: null, ticket: null };
  }

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      project: { organizationId: ctx.organizationId },
    },
    include: { project: true },
  });

  return { hasAccess: !!ticket, ctx, ticket };
}
