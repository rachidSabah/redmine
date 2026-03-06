import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// GET - List archived students
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
      return apiSuccess({ archived: [] });
    }

    const organizationId = membership.organizationId;
    const { searchParams } = new URL(request.url);
    
    const archiveYear = searchParams.get("archiveYear");
    const archiveReason = searchParams.get("archiveReason");
    const finalStatus = searchParams.get("finalStatus");
    const search = searchParams.get("search");

    const where: any = {
      organizationId,
    };

    if (archiveYear) {
      where.archiveYear = parseInt(archiveYear);
    }

    if (archiveReason) {
      where.archiveReason = archiveReason;
    }

    if (finalStatus) {
      where.finalStatus = finalStatus;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { studentIdNumber: { contains: search, mode: "insensitive" } },
        { searchName: { contains: search.toLowerCase() } },
      ];
    }

    const archived = await db.archivedStudent.findMany({
      where,
      orderBy: [{ archiveYear: "desc" }, { lastName: "asc" }],
    });

    return apiSuccess({ archived });
  } catch (error) {
    console.error("Error fetching archived students:", error);
    return ApiErrors.internal("Failed to fetch archived students", error);
  }
}

// POST - Archive a student
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
    const { studentId, archiveReason, graduationYear, certificateNumber } = body;

    if (!studentId) {
      return ApiErrors.badRequest("Student ID is required");
    }

    // Get student
    const student = await db.student.findFirst({
      where: { id: studentId, organizationId },
      include: {
        class: { select: { name: true } },
      },
    });

    if (!student) {
      return ApiErrors.notFound("Student not found");
    }

    // Check if already archived
    const existingArchive = await db.archivedStudent.findFirst({
      where: { originalStudentId: studentId },
    });

    if (existingArchive) {
      return ApiErrors.badRequest("Student is already archived");
    }

    // Create archived record
    const archived = await db.archivedStudent.create({
      data: {
        organizationId,
        originalStudentId: student.id,
        studentIdNumber: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        guardianEmail: student.guardianEmail,
        className: student.class?.name,
        sessionId: student.sessionId,
        archiveYear: new Date().getFullYear(),
        archiveReason: archiveReason || "completed",
        finalStatus: student.status,
        graduationYear,
        certificateNumber,
        searchName: `${student.firstName} ${student.lastName}`.toLowerCase(),
      },
    });

    // Log activity
    await db.activityLogEntry.create({
      data: {
        organizationId,
        action: "student_archived",
        entityType: "student",
        entityId: studentId,
        description: `Archived student ${student.firstName} ${student.lastName}`,
        userId: user.id,
        userName: user.name,
        userRole: membership.role,
      },
    });

    return apiSuccess({ archived, message: "Student archived successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error archiving student:", error);
    return ApiErrors.internal("Failed to archive student", error);
  }
}

// DELETE - Restore archived student (optional)
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
      return ApiErrors.badRequest("Archived student ID is required");
    }

    // Verify record belongs to organization
    const existingArchive = await db.archivedStudent.findFirst({
      where: { id, organizationId },
    });

    if (!existingArchive) {
      return ApiErrors.notFound("Archived student not found");
    }

    await db.archivedStudent.delete({
      where: { id },
    });

    return apiSuccess({ message: "Archived record deleted successfully" });
  } catch (error) {
    console.error("Error deleting archived record:", error);
    return ApiErrors.internal("Failed to delete archived record", error);
  }
}
