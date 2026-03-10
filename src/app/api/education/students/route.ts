import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// GET - List students
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
      return apiSuccess({ students: [] });
    }

    const organizationId = membership.organizationId;

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const sessionId = searchParams.get("sessionId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {
      organizationId,
    };

    if (classId) {
      where.classId = classId;
    }
    if (sessionId) {
      where.sessionId = sessionId;
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { studentId: { contains: search, mode: "insensitive" } },
      ];
    }

    const students = await db.student.findMany({
      where,
      include: {
        class: {
          select: { id: true, name: true, grade: true },
        },
        session: {
          select: { id: true, name: true },
        },
        grades: {
          select: { id: true, subject: true, grade: true, score: true },
          take: 10,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { grades: true, attendance: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return apiSuccess({ students });
  } catch (error) {
    console.error("Error fetching students:", error);
    return ApiErrors.internal("Failed to fetch students", error);
  }
}

// POST - Create student
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
      studentId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      guardianName,
      guardianPhone,
      guardianEmail,
      guardianAddress,
      guardianRelation,
      guardian2Name,
      guardian2Phone,
      guardian2Email,
      guardian2Address,
      guardian2Relation,
      classId,
      sessionId,
      enrollmentDate,
      sessionStartDate,
      status,
    } = body;

    if (!firstName || !lastName) {
      return ApiErrors.badRequest("First name and last name are required");
    }

    // Generate studentId if not provided
    const finalStudentId = studentId || `STU-${Date.now()}`;

    // Check if studentId already exists
    const existingStudent = await db.student.findFirst({
      where: {
        organizationId,
        studentId: finalStudentId,
      },
    });

    if (existingStudent) {
      return ApiErrors.badRequest("Student ID already exists");
    }

    const student = await db.student.create({
      data: {
        organizationId,
        studentId: finalStudentId,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        email,
        phone,
        address,
        guardianName,
        guardianPhone,
        guardianEmail,
        guardianAddress,
        guardianRelation,
        guardian2Name,
        guardian2Phone,
        guardian2Email,
        guardian2Address,
        guardian2Relation,
        classId,
        sessionId,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : undefined,
        sessionStartDate: sessionStartDate ? new Date(sessionStartDate) : undefined,
        status: status || "active",
      },
      include: {
        class: {
          select: { id: true, name: true, grade: true },
        },
        session: {
          select: { id: true, name: true },
        },
      },
    });

    return apiSuccess({ student, message: "Student created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating student:", error);
    return ApiErrors.internal("Failed to create student", error);
  }
}

// PUT - Update student
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
      studentId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      guardianName,
      guardianPhone,
      guardianEmail,
      guardianAddress,
      guardianRelation,
      guardian2Name,
      guardian2Phone,
      guardian2Email,
      guardian2Address,
      guardian2Relation,
      classId,
      sessionId,
      enrollmentDate,
      sessionStartDate,
      status,
    } = body;

    if (!id) {
      return ApiErrors.badRequest("Student ID is required");
    }

    // Verify student belongs to organization
    const existingStudent = await db.student.findFirst({
      where: { id, organizationId },
    });

    if (!existingStudent) {
      return ApiErrors.notFound("Student not found");
    }

    const student = await db.student.update({
      where: { id },
      data: {
        studentId,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        email,
        phone,
        address,
        guardianName,
        guardianPhone,
        guardianEmail,
        guardianAddress,
        guardianRelation,
        guardian2Name,
        guardian2Phone,
        guardian2Email,
        guardian2Address,
        guardian2Relation,
        classId,
        sessionId,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : undefined,
        sessionStartDate: sessionStartDate ? new Date(sessionStartDate) : undefined,
        status,
      },
      include: {
        class: {
          select: { id: true, name: true, grade: true },
        },
        session: {
          select: { id: true, name: true },
        },
      },
    });

    return apiSuccess({ student, message: "Student updated successfully" });
  } catch (error) {
    console.error("Error updating student:", error);
    return ApiErrors.internal("Failed to update student", error);
  }
}

// DELETE - Delete student
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
      return ApiErrors.badRequest("Student ID is required");
    }

    // Verify student belongs to organization
    const existingStudent = await db.student.findFirst({
      where: { id, organizationId },
    });

    if (!existingStudent) {
      return ApiErrors.notFound("Student not found");
    }

    await db.student.delete({
      where: { id },
    });

    return apiSuccess({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    return ApiErrors.internal("Failed to delete student", error);
  }
}
