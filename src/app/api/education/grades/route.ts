export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, ApiErrors } from "@/lib/api-response";

// GET - List grades for a student
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiErrors.unauthorized();
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return apiSuccess({ grades: [], summary: null });
    }

    const organizationId = membership.organizationId;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const sessionId = searchParams.get("sessionId");
    const period = searchParams.get("period");
    const gradeType = searchParams.get("gradeType");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");

    const where: any = {
      organizationId,
    };

    if (studentId) {
      where.studentId = studentId;
    }

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (period) {
      where.period = parseInt(period);
    }

    if (gradeType) {
      where.gradeType = gradeType;
    }

    const skip = (page - 1) * limit;

    const [grades, total] = await Promise.all([
      db.studentGrade.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
              class: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: [{ period: "asc" }, { gradeType: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      db.studentGrade.count({ where }),
    ]);

    // Calculate summary if studentId is provided
    let summary: {
      period1: { CC: number; EFCF_T: number; EFCF_P: number; count: number };
      period2: { CC: number; EFCF_T: number; EFCF_P: number; count: number };
      combined: { CC: number; EFCF_T: number; EFCF_P: number };
      final: number;
    } | null = null;
    if (studentId && grades.length > 0) {
      // Group by period and type
      const period1 = grades.filter((g) => g.period === 1);
      const period2 = grades.filter((g) => g.period === 2);

      const calculatePeriodAverage = (
        periodGrades: typeof grades,
        type: string
      ) => {
        const typeGrades = periodGrades.filter((g) => g.gradeType === type);
        if (typeGrades.length === 0) return 0;
        const sum = typeGrades.reduce((acc, g) => acc + (g.score || 0), 0);
        return sum / typeGrades.length;
      };

      // Period 1 calculations
      const p1_CC = calculatePeriodAverage(period1, "CC");
      const p1_EFCF_T = calculatePeriodAverage(period1, "EFCF_T");
      const p1_EFCF_P = calculatePeriodAverage(period1, "EFCF_P");

      // Period 2 calculations
      const p2_CC = calculatePeriodAverage(period2, "CC");
      const p2_EFCF_T = calculatePeriodAverage(period2, "EFCF_T");
      const p2_EFCF_P = calculatePeriodAverage(period2, "EFCF_P");

      // Combined averages
      const combined_CC =
        period1.length > 0 && period2.length > 0
          ? (p1_CC + p2_CC) / 2
          : period1.length > 0
          ? p1_CC
          : p2_CC;
      const combined_EFCF_T =
        period1.length > 0 && period2.length > 0
          ? (p1_EFCF_T + p2_EFCF_T) / 2
          : period1.length > 0
          ? p1_EFCF_T
          : p2_EFCF_T;
      const combined_EFCF_P =
        period1.length > 0 && period2.length > 0
          ? (p1_EFCF_P + p2_EFCF_P) / 2
          : period1.length > 0
          ? p1_EFCF_P
          : p2_EFCF_P;

      // Final grade formula: (CC × 3 + EFCF_T × 2 + EFCF_P × 3 + Presentation × 2) / 10
      const presentation = 0; // Placeholder for presentation grade
      const finalGrade =
        (combined_CC * 3 +
          combined_EFCF_T * 2 +
          combined_EFCF_P * 3 +
          presentation * 2) /
        10;

      summary = {
        period1: {
          CC: p1_CC,
          EFCF_T: p1_EFCF_T,
          EFCF_P: p1_EFCF_P,
          count: period1.length,
        },
        period2: {
          CC: p2_CC,
          EFCF_T: p2_EFCF_T,
          EFCF_P: p2_EFCF_P,
          count: period2.length,
        },
        combined: {
          CC: combined_CC,
          EFCF_T: combined_EFCF_T,
          EFCF_P: combined_EFCF_P,
        },
        final: finalGrade,
      };
    }

    return apiSuccess({
      grades,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching grades:", error);
    return ApiErrors.internal("Failed to fetch grades", error);
  }
}

// POST - Create a grade
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiErrors.unauthorized();
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return ApiErrors.forbidden("You must be a member of an organization");
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const {
      studentId,
      sessionId,
      classId,
      subject,
      term,
      grade,
      score,
      maxScore,
      gradeType,
      period,
      comments,
    } = body;

    if (!studentId || !subject) {
      return ApiErrors.badRequest("Student ID and subject are required");
    }

    // Verify student belongs to organization
    const student = await db.student.findFirst({
      where: { id: studentId, organizationId },
    });

    if (!student) {
      return ApiErrors.notFound("Student not found");
    }

    // Create the grade
    const studentGrade = await db.studentGrade.create({
      data: {
        organizationId,
        studentId,
        sessionId,
        classId: classId || student.classId,
        subject,
        term,
        grade,
        score: score ? parseFloat(score) : null,
        maxScore: maxScore ? parseFloat(maxScore) : null,
        gradeType: gradeType || "CC",
        period: period ? parseInt(period) : 1,
        comments,
        gradedBy: user.id,
        gradedAt: new Date(),
      },
    });

    return apiSuccess(
      { grade: studentGrade, message: "Grade created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating grade:", error);
    return ApiErrors.internal("Failed to create grade", error);
  }
}

// PUT - Update a grade
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiErrors.unauthorized();
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return ApiErrors.forbidden("You must be a member of an organization");
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const {
      id,
      subject,
      term,
      grade,
      score,
      maxScore,
      gradeType,
      period,
      comments,
    } = body;

    if (!id) {
      return ApiErrors.badRequest("Grade ID is required");
    }

    // Verify grade belongs to organization
    const existingGrade = await db.studentGrade.findFirst({
      where: { id, organizationId },
    });

    if (!existingGrade) {
      return ApiErrors.notFound("Grade not found");
    }

    const updatedGrade = await db.studentGrade.update({
      where: { id },
      data: {
        subject,
        term,
        grade,
        score: score !== undefined ? parseFloat(score) : undefined,
        maxScore: maxScore !== undefined ? parseFloat(maxScore) : undefined,
        gradeType,
        period: period ? parseInt(period as string) : undefined,
        comments,
        gradedBy: user.id,
        gradedAt: new Date(),
      },
    });

    return apiSuccess({ grade: updatedGrade, message: "Grade updated successfully" });
  } catch (error) {
    console.error("Error updating grade:", error);
    return ApiErrors.internal("Failed to update grade", error);
  }
}

// DELETE - Delete a grade
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiErrors.unauthorized();
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return ApiErrors.forbidden("You must be a member of an organization");
    }

    const organizationId = membership.organizationId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return ApiErrors.badRequest("Grade ID is required");
    }

    // Verify grade belongs to organization
    const existingGrade = await db.studentGrade.findFirst({
      where: { id, organizationId },
    });

    if (!existingGrade) {
      return ApiErrors.notFound("Grade not found");
    }

    await db.studentGrade.delete({
      where: { id },
    });

    return apiSuccess({ message: "Grade deleted successfully" });
  } catch (error) {
    console.error("Error deleting grade:", error);
    return ApiErrors.internal("Failed to delete grade", error);
  }
}
