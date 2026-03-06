import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// GET - Get student promotion status
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
      return apiSuccess({ yearRecords: [] });
    }

    const organizationId = membership.organizationId;
    const { searchParams } = new URL(request.url);
    
    const studentId = searchParams.get("studentId");
    const academicYearId = searchParams.get("academicYearId");
    const yearStatus = searchParams.get("yearStatus");
    const studyYear = searchParams.get("studyYear");

    const where: any = {
      organizationId,
    };

    if (studentId) {
      where.studentId = studentId;
    }

    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    if (yearStatus) {
      where.yearStatus = yearStatus;
    }

    if (studyYear) {
      where.studyYear = parseInt(studyYear);
    }

    const yearRecords = await db.studentYearRecord.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            class: { select: { id: true, name: true } },
          },
        },
        academicYear: {
          select: { id: true, name: true, displayName: true },
        },
      },
      orderBy: [{ academicYear: { startDate: "desc" } }, { lastName: "asc" }],
    });

    return apiSuccess({ yearRecords });
  } catch (error) {
    console.error("Error fetching year records:", error);
    return ApiErrors.internal("Failed to fetch year records", error);
  }
}

// POST - Create or update student promotion status
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
    if (!membership || (membership.role !== "ADMIN" && membership.role !== "OWNER")) {
      return ApiErrors.forbidden("Only admins can manage promotions");
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const { 
      studentId, 
      academicYearId, 
      studyYear, 
      yearStatus, 
      statusNotes,
      finalGrade,
      finalGradeLetter,
      passedModules,
      failedModules 
    } = body;

    if (!studentId || !academicYearId) {
      return ApiErrors.badRequest("Student ID and Academic Year ID are required");
    }

    // Verify student belongs to organization
    const student = await db.student.findFirst({
      where: { id: studentId, organizationId },
    });

    if (!student) {
      return ApiErrors.notFound("Student not found");
    }

    // Check if record exists
    const existingRecord = await db.studentYearRecord.findUnique({
      where: {
        studentId_academicYearId: {
          studentId,
          academicYearId,
        },
      },
    });

    let yearRecord;

    if (existingRecord) {
      // Update existing record
      yearRecord = await db.studentYearRecord.update({
        where: { id: existingRecord.id },
        data: {
          studyYear,
          yearStatus,
          statusChangedAt: yearStatus !== existingRecord.yearStatus ? new Date() : existingRecord.statusChangedAt,
          statusChangedBy: yearStatus !== existingRecord.yearStatus ? user.id : existingRecord.statusChangedBy,
          statusNotes,
          finalGrade,
          finalGradeLetter,
          passedModules,
          failedModules,
        },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
            },
          },
          academicYear: {
            select: { id: true, name: true },
          },
        },
      });
    } else {
      // Create new record
      yearRecord = await db.studentYearRecord.create({
        data: {
          organizationId,
          studentId,
          academicYearId,
          studyYear: studyYear || 1,
          yearStatus,
          statusChangedAt: yearStatus ? new Date() : undefined,
          statusChangedBy: yearStatus ? user.id : undefined,
          statusNotes,
          finalGrade,
          finalGradeLetter,
          passedModules,
          failedModules,
        },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
            },
          },
          academicYear: {
            select: { id: true, name: true },
          },
        },
      });
    }

    // Log activity
    await db.activityLogEntry.create({
      data: {
        organizationId,
        action: "promotion_updated",
        entityType: "student",
        entityId: studentId,
        description: `Updated promotion status for ${student.firstName} ${student.lastName} to ${yearStatus}`,
        userId: user.id,
        userName: user.name,
        userRole: membership.role,
      },
    });

    return apiSuccess({ yearRecord, message: "Promotion status updated successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error updating promotion status:", error);
    return ApiErrors.internal("Failed to update promotion status", error);
  }
}

// PUT - Batch update promotion status for multiple students
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
    if (!membership || (membership.role !== "ADMIN" && membership.role !== "OWNER")) {
      return ApiErrors.forbidden("Only admins can manage promotions");
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const { promotions } = body as { promotions: Array<{ 
      studentId: string; 
      academicYearId: string; 
      studyYear?: number;
      yearStatus: string;
      statusNotes?: string;
    }> };

    if (!promotions || !Array.isArray(promotions)) {
      return ApiErrors.badRequest("Promotions array is required");
    }

    const results = [];

    for (const promo of promotions) {
      const { studentId, academicYearId, studyYear, yearStatus, statusNotes } = promo;

      // Verify student belongs to organization
      const student = await db.student.findFirst({
        where: { id: studentId, organizationId },
      });

      if (!student) continue;

      // Upsert year record
      const existingRecord = await db.studentYearRecord.findUnique({
        where: {
          studentId_academicYearId: {
            studentId,
            academicYearId,
          },
        },
      });

      let yearRecord;
      if (existingRecord) {
        yearRecord = await db.studentYearRecord.update({
          where: { id: existingRecord.id },
          data: {
            studyYear,
            yearStatus,
            statusChangedAt: new Date(),
            statusChangedBy: user.id,
            statusNotes,
          },
        });
      } else {
        yearRecord = await db.studentYearRecord.create({
          data: {
            organizationId,
            studentId,
            academicYearId,
            studyYear: studyYear || 1,
            yearStatus,
            statusChangedAt: new Date(),
            statusChangedBy: user.id,
            statusNotes,
          },
        });
      }

      results.push(yearRecord);

      // Log activity
      await db.activityLogEntry.create({
        data: {
          organizationId,
          action: "promotion_batch_updated",
          entityType: "student",
          entityId: studentId,
          description: `Batch updated promotion status to ${yearStatus}`,
          userId: user.id,
          userName: user.name,
          userRole: membership.role,
        },
      });
    }

    return apiSuccess({ results, message: `${results.length} promotion records updated` });
  } catch (error) {
    console.error("Error batch updating promotions:", error);
    return ApiErrors.internal("Failed to batch update promotions", error);
  }
}
