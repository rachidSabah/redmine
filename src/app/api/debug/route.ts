export const runtime = 'edge';
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    
    // Get all users count
    const userCount = await prisma.user.count();
    
    // Get admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: "ranelsabah@admin.synchropm.com" },
      include: {
        memberships: true
      }
    });

    return NextResponse.json({
      authenticated: !!session,
      session: session ? {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          organizationId: session.user.organizationId
        }
      } : null,
      database: {
        connected: true,
        userCount,
        adminUser: adminUser ? {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          isActive: adminUser.isActive,
          hasPassword: !!adminUser.password,
          memberships: adminUser.memberships.map(m => ({
            organizationId: m.organizationId,
            role: m.role,
            isActive: m.isActive
          }))
        } : null
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
