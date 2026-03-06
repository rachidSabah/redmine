import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// GET - List classrooms
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
      return apiSuccess({ classrooms: [] });
    }

    const organizationId = membership.organizationId;

    const classrooms = await db.classroom.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        _count: {
          select: { scheduleEntries: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return apiSuccess({ classrooms });
  } catch (error) {
    console.error("Error fetching classrooms:", error);
    return ApiErrors.internal("Failed to fetch classrooms", error);
  }
}

// POST - Create classroom
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
    const { name, code, capacity, building, floor, facilities } = body;

    if (!name) {
      return ApiErrors.badRequest("Classroom name is required");
    }

    // Check if classroom with same name exists
    const existing = await db.classroom.findFirst({
      where: { organizationId, name },
    });

    if (existing) {
      return ApiErrors.badRequest("Classroom with this name already exists");
    }

    const classroom = await db.classroom.create({
      data: {
        organizationId,
        name,
        code,
        capacity: capacity || 30,
        building,
        floor,
        facilities,
      },
    });

    return apiSuccess({ classroom, message: "Classroom created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating classroom:", error);
    return ApiErrors.internal("Failed to create classroom", error);
  }
}

// PUT - Update classroom
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
    const { id, name, code, capacity, building, floor, facilities, isActive } = body;

    if (!id) {
      return ApiErrors.badRequest("Classroom ID is required");
    }

    // Verify classroom belongs to organization
    const existingClassroom = await db.classroom.findFirst({
      where: { id, organizationId },
    });

    if (!existingClassroom) {
      return ApiErrors.notFound("Classroom not found");
    }

    const classroom = await db.classroom.update({
      where: { id },
      data: {
        name,
        code,
        capacity,
        building,
        floor,
        facilities,
        isActive,
      },
    });

    return apiSuccess({ classroom, message: "Classroom updated successfully" });
  } catch (error) {
    console.error("Error updating classroom:", error);
    return ApiErrors.internal("Failed to update classroom", error);
  }
}

// DELETE - Delete classroom
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
      return ApiErrors.badRequest("Classroom ID is required");
    }

    // Verify classroom belongs to organization
    const existingClassroom = await db.classroom.findFirst({
      where: { id, organizationId },
    });

    if (!existingClassroom) {
      return ApiErrors.notFound("Classroom not found");
    }

    // Soft delete by setting isActive to false
    await db.classroom.update({
      where: { id },
      data: { isActive: false },
    });

    return apiSuccess({ message: "Classroom deleted successfully" });
  } catch (error) {
    console.error("Error deleting classroom:", error);
    return ApiErrors.internal("Failed to delete classroom", error);
  }
}
