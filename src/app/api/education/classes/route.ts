export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// GET - List classes
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
      return apiSuccess({ classes: [] });
    }

    const organizationId = membership.organizationId;

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const teacherId = searchParams.get("teacherId");

    const where: any = {
      organizationId,
    };

    if (sessionId) {
      where.sessionId = sessionId;
    }
    if (teacherId) {
      where.teacherId = teacherId;
    }

    const classes = await db.eduClass.findMany({
      where,
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
        session: {
          select: { id: true, name: true },
        },
        _count: {
          select: { students: true },
        },
      },
      orderBy: [{ grade: "asc" }, { section: "asc" }],
    });

    return apiSuccess({ classes });
  } catch (error) {
    console.error("Error fetching classes:", error);
    return ApiErrors.internal("Failed to fetch classes", error);
  }
}

// POST - Create class
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
    const { name, grade, section, teacherId, sessionId, capacity, roomNumber, schedule } = body;

    if (!name) {
      return ApiErrors.badRequest("Class name is required");
    }

    const eduClass = await db.eduClass.create({
      data: {
        organizationId,
        name,
        grade,
        section,
        teacherId,
        sessionId,
        capacity: capacity || 30,
        roomNumber,
        schedule,
      },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        session: {
          select: { id: true, name: true },
        },
      },
    });

    return apiSuccess({ class: eduClass, message: "Class created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating class:", error);
    return ApiErrors.internal("Failed to create class", error);
  }
}

// PUT - Update class
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
    const { id, name, grade, section, teacherId, sessionId, capacity, roomNumber, schedule, isActive } = body;

    if (!id) {
      return ApiErrors.badRequest("Class ID is required");
    }

    // Verify class belongs to organization
    const existingClass = await db.eduClass.findFirst({
      where: { id, organizationId },
    });

    if (!existingClass) {
      return ApiErrors.notFound("Class not found");
    }

    const eduClass = await db.eduClass.update({
      where: { id },
      data: {
        name,
        grade,
        section,
        teacherId,
        sessionId,
        capacity,
        roomNumber,
        schedule,
        isActive,
      },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        session: {
          select: { id: true, name: true },
        },
      },
    });

    return apiSuccess({ class: eduClass, message: "Class updated successfully" });
  } catch (error) {
    console.error("Error updating class:", error);
    return ApiErrors.internal("Failed to update class", error);
  }
}

// DELETE - Delete class
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
      return ApiErrors.badRequest("Class ID is required");
    }

    // Verify class belongs to organization
    const existingClass = await db.eduClass.findFirst({
      where: { id, organizationId },
    });

    if (!existingClass) {
      return ApiErrors.notFound("Class not found");
    }

    await db.eduClass.delete({
      where: { id },
    });

    return apiSuccess({ message: "Class deleted successfully" });
  } catch (error) {
    console.error("Error deleting class:", error);
    return ApiErrors.internal("Failed to delete class", error);
  }
}
