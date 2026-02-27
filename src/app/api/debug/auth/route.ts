import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Debug auth and session
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return Response.json({
        authenticated: false,
        session: null,
        message: "No session found - user not logged in"
      });
    }

    // Get user with memberships
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            organization: {
              select: { id: true, name: true, slug: true }
            }
          }
        },
      },
    });

    if (!user) {
      return Response.json({
        authenticated: true,
        sessionEmail: session.user.email,
        userFound: false,
        message: "Session exists but user not found in database"
      });
    }

    return Response.json({
      authenticated: true,
      session: {
        email: session.user.email,
        name: session.user.name,
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
      },
      memberships: user.memberships.map(m => ({
        id: m.id,
        role: m.role,
        isActive: m.isActive,
        organization: m.organization,
      })),
      educationAccess: {
        hasOrganization: user.memberships.length > 0,
        organizationId: user.memberships[0]?.organizationId || null,
      }
    });
  } catch (error: any) {
    console.error("Debug auth error:", error);
    return Response.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
