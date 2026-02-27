import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// POST - Run database migrations (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin (you may want to add additional checks)
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const membership = user.memberships[0];
    if (!membership || (membership.role !== "ADMIN" && membership.role !== "OWNER")) {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    // Run prisma db push
    try {
      const { stdout, stderr } = await execAsync("npx prisma db push --accept-data-loss --skip-generate");
      
      return Response.json({
        success: true,
        message: "Database schema synchronized successfully",
        output: stdout,
        warnings: stderr || null,
      });
    } catch (execError: any) {
      console.error("Migration error:", execError);
      return Response.json({
        success: false,
        error: "Migration failed",
        details: execError.message,
        stderr: execError.stderr,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Error running migration:", error);
    return Response.json({
      error: "Failed to run migration",
      details: error.message,
    }, { status: 500 });
  }
}

// GET - Check migration status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    
    // Check if education tables exist by trying to query them
    const results = {
      students: false,
      teachers: false,
      classes: false,
      sessions: false,
      schoolSettings: false,
    };

    try {
      await prisma.student.count();
      results.students = true;
    } catch (e) {
      // Table doesn't exist
    }

    try {
      await prisma.teacher.count();
      results.teachers = true;
    } catch (e) {
      // Table doesn't exist
    }

    try {
      await prisma.eduClass.count();
      results.classes = true;
    } catch (e) {
      // Table doesn't exist
    }

    try {
      await prisma.eduSession.count();
      results.sessions = true;
    } catch (e) {
      // Table doesn't exist
    }

    try {
      await prisma.schoolSettings.count();
      results.schoolSettings = true;
    } catch (e) {
      // Table doesn't exist
    }

    const allTablesExist = Object.values(results).every(v => v);

    return Response.json({
      status: allTablesExist ? "complete" : "incomplete",
      tables: results,
      message: allTablesExist 
        ? "All Education module tables exist" 
        : "Some Education module tables are missing. Run POST /api/migrate to create them.",
    });
  } catch (error: any) {
    console.error("Error checking migration status:", error);
    return Response.json({
      error: "Failed to check migration status",
      details: error.message,
    }, { status: 500 });
  }
}
