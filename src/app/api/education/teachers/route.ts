export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// GET - List teachers
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
      return apiSuccess({ teachers: [] });
    }

    const organizationId = membership.organizationId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {
      organizationId,
    };

    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
      ];
    }

    const teachers = await db.teacher.findMany({
      where,
      include: {
        classes: {
          select: { id: true, name: true, grade: true },
        },
        _count: {
          select: { classes: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return apiSuccess({ teachers });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    return ApiErrors.internal("Failed to fetch teachers", error);
  }
}

// POST - Create teacher
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
    const {
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      address,
      dateOfBirth,
      gender,
      qualification,
      specialization,
      joiningDate,
      status,
    } = body;

    if (!firstName || !lastName) {
      return ApiErrors.badRequest("First name and last name are required");
    }

    // Generate employeeId if not provided
    const finalEmployeeId = employeeId || `EMP-${Date.now()}`;

    // Check if employeeId already exists
    const existingTeacher = await db.teacher.findFirst({
      where: {
        organizationId,
        employeeId: finalEmployeeId,
      },
    });

    if (existingTeacher) {
      return ApiErrors.badRequest("Employee ID already exists");
    }

    const teacher = await db.teacher.create({
      data: {
        organizationId,
        employeeId: finalEmployeeId,
        firstName,
        lastName,
        email,
        phone,
        address,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        qualification,
        specialization,
        joiningDate: joiningDate ? new Date(joiningDate) : undefined,
        status: status || "active",
      },
    });

    return apiSuccess({ teacher, message: "Teacher created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating teacher:", error);
    return ApiErrors.internal("Failed to create teacher", error);
  }
}

// PUT - Update teacher
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
    const {
      id,
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      address,
      dateOfBirth,
      gender,
      qualification,
      specialization,
      joiningDate,
      status,
    } = body;

    if (!id) {
      return ApiErrors.badRequest("Teacher ID is required");
    }

    // Verify teacher belongs to organization
    const existingTeacher = await db.teacher.findFirst({
      where: { id, organizationId },
    });

    if (!existingTeacher) {
      return ApiErrors.notFound("Teacher not found");
    }

    const teacher = await db.teacher.update({
      where: { id },
      data: {
        employeeId,
        firstName,
        lastName,
        email,
        phone,
        address,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        qualification,
        specialization,
        joiningDate: joiningDate ? new Date(joiningDate) : undefined,
        status,
      },
      include: {
        classes: {
          select: { id: true, name: true, grade: true },
        },
      },
    });

    return apiSuccess({ teacher, message: "Teacher updated successfully" });
  } catch (error) {
    console.error("Error updating teacher:", error);
    return ApiErrors.internal("Failed to update teacher", error);
  }
}

// DELETE - Delete teacher
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
      return ApiErrors.badRequest("Teacher ID is required");
    }

    // Verify teacher belongs to organization
    const existingTeacher = await db.teacher.findFirst({
      where: { id, organizationId },
    });

    if (!existingTeacher) {
      return ApiErrors.notFound("Teacher not found");
    }

    await db.teacher.delete({
      where: { id },
    });

    return apiSuccess({ message: "Teacher deleted successfully" });
  } catch (error) {
    console.error("Error deleting teacher:", error);
    return ApiErrors.internal("Failed to delete teacher", error);
  }
}
