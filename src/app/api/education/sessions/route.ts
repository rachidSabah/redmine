import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// Helper function to calculate 9-month end date
function calculateEndDate(startDate: Date): Date {
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 9);
  return endDate;
}

// GET - List sessions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return ApiErrors.forbidden("User not found");
    }

    const membership = user.memberships[0];
    if (!membership) {
      return apiSuccess({ sessions: [] });
    }

    const organizationId = membership.organizationId;

    const sessions = await db.eduSession.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { classes: true, students: true },
        },
      },
      orderBy: [{ startDate: "desc" }],
    });

    return apiSuccess({ sessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return ApiErrors.internal("Failed to fetch sessions", error);
  }
}

// POST - Create session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return ApiErrors.forbidden("User not found");
    }

    const membership = user.memberships[0];
    if (!membership) {
      return ApiErrors.badRequest("You must be a member of an organization");
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const { name, startDate, endDate, description, isCurrent } = body;

    if (!name || !startDate) {
      return ApiErrors.badRequest("Name and start date are required");
    }

    const sessionStartDate = new Date(startDate);
    // Auto-calculate end date if not provided (9 months from start)
    const sessionEndDate = endDate ? new Date(endDate) : calculateEndDate(sessionStartDate);

    // If setting as current, unset other current sessions
    if (isCurrent) {
      await db.eduSession.updateMany({
        where: { organizationId, isCurrent: true },
        data: { isCurrent: false },
      });
    }

    const eduSession = await db.eduSession.create({
      data: {
        organizationId,
        name,
        startDate: sessionStartDate,
        endDate: sessionEndDate,
        description,
        isCurrent: isCurrent || false,
      },
    });

    return apiSuccess({ session: eduSession, message: "Session created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating session:", error);
    return ApiErrors.internal("Failed to create session", error);
  }
}

// PUT - Update session
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return ApiErrors.forbidden("User not found");
    }

    const membership = user.memberships[0];
    if (!membership) {
      return ApiErrors.badRequest("You must be a member of an organization");
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const { id, name, startDate, endDate, description, isCurrent, isActive } = body;

    if (!id) {
      return ApiErrors.badRequest("Session ID is required");
    }

    // Verify session belongs to organization
    const existingSession = await db.eduSession.findFirst({
      where: { id, organizationId },
    });

    if (!existingSession) {
      return ApiErrors.notFound("Session not found");
    }

    // If setting as current, unset other current sessions
    if (isCurrent) {
      await db.eduSession.updateMany({
        where: { organizationId, isCurrent: true, id: { not: id } },
        data: { isCurrent: false },
      });
    }

    const sessionStartDate = startDate ? new Date(startDate) : undefined;
    // Auto-calculate end date if start is provided but end is not
    const sessionEndDate = endDate
      ? new Date(endDate)
      : sessionStartDate
      ? calculateEndDate(sessionStartDate)
      : undefined;

    const eduSession = await db.eduSession.update({
      where: { id },
      data: {
        name,
        startDate: sessionStartDate,
        endDate: sessionEndDate,
        description,
        isCurrent,
        isActive,
      },
    });

    return apiSuccess({ session: eduSession, message: "Session updated successfully" });
  } catch (error) {
    console.error("Error updating session:", error);
    return ApiErrors.internal("Failed to update session", error);
  }
}

// DELETE - Delete session
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return ApiErrors.forbidden("User not found");
    }

    const membership = user.memberships[0];
    if (!membership) {
      return ApiErrors.badRequest("You must be a member of an organization");
    }

    const organizationId = membership.organizationId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return ApiErrors.badRequest("Session ID is required");
    }

    // Verify session belongs to organization
    const existingSession = await db.eduSession.findFirst({
      where: { id, organizationId },
    });

    if (!existingSession) {
      return ApiErrors.notFound("Session not found");
    }

    await db.eduSession.delete({
      where: { id },
    });

    return apiSuccess({ message: "Session deleted successfully" });
  } catch (error) {
    console.error("Error deleting session:", error);
    return ApiErrors.internal("Failed to delete session", error);
  }
}
