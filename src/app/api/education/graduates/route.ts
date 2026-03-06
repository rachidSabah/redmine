import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// GET - List graduates
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
      return apiSuccess({ graduates: [] });
    }

    const organizationId = membership.organizationId;
    const { searchParams } = new URL(request.url);
    
    const graduationYear = searchParams.get("graduationYear");
    const search = searchParams.get("search");

    const where: any = {
      organizationId,
    };

    if (graduationYear) {
      where.graduationYear = parseInt(graduationYear);
    }

    if (search) {
      where.OR = [
        { student: { firstName: { contains: search, mode: "insensitive" } } },
        { student: { lastName: { contains: search, mode: "insensitive" } } },
        { student: { studentId: { contains: search, mode: "insensitive" } } },
        { certificateNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const graduates = await db.graduateRecord.findMany({
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
      },
      orderBy: [{ graduationYear: "desc" }, { graduationDate: "desc" }],
    });

    return apiSuccess({ graduates });
  } catch (error) {
    console.error("Error fetching graduates:", error);
    return ApiErrors.internal("Failed to fetch graduates", error);
  }
}

// POST - Create graduate record
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
      graduationYear,
      graduationDate,
      certificateNumber,
      certificateIssued,
      certificateIssuedAt,
      finalGPA,
      finalGradeLetter,
      honors,
      programName,
      specialization,
      employed,
      employerName,
      employmentDate,
    } = body;

    if (!studentId) {
      return ApiErrors.badRequest("Student ID is required");
    }

    // Verify student belongs to organization
    const student = await db.student.findFirst({
      where: { id: studentId, organizationId },
    });

    if (!student) {
      return ApiErrors.notFound("Student not found");
    }

    // Check if graduate record already exists
    const existingRecord = await db.graduateRecord.findUnique({
      where: { studentId },
    });

    if (existingRecord) {
      return ApiErrors.badRequest("Graduate record already exists for this student");
    }

    const graduateRecord = await db.graduateRecord.create({
      data: {
        organizationId,
        studentId,
        graduationYear: graduationYear || new Date().getFullYear(),
        graduationDate: graduationDate ? new Date(graduationDate) : new Date(),
        certificateNumber,
        certificateIssued: certificateIssued || false,
        certificateIssuedAt: certificateIssuedAt ? new Date(certificateIssuedAt) : undefined,
        finalGPA,
        finalGradeLetter,
        honors,
        programName,
        specialization,
        employed,
        employerName,
        employmentDate: employmentDate ? new Date(employmentDate) : undefined,
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Update student status
    await db.student.update({
      where: { id: studentId },
      data: { status: "graduated" },
    });

    // Log activity
    await db.activityLogEntry.create({
      data: {
        organizationId,
        action: "graduate_created",
        entityType: "student",
        entityId: studentId,
        description: `Graduated student ${student.firstName} ${student.lastName}`,
        userId: user.id,
        userName: user.name,
        userRole: membership.role,
      },
    });

    return apiSuccess({ graduate: graduateRecord, message: "Graduate record created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating graduate record:", error);
    return ApiErrors.internal("Failed to create graduate record", error);
  }
}

// PUT - Update graduate record
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
      graduationYear,
      graduationDate,
      certificateNumber,
      certificateIssued,
      certificateIssuedAt,
      finalGPA,
      finalGradeLetter,
      honors,
      programName,
      specialization,
      employed,
      employerName,
      employmentDate,
    } = body;

    if (!id) {
      return ApiErrors.badRequest("Graduate record ID is required");
    }

    // Verify record belongs to organization
    const existingRecord = await db.graduateRecord.findFirst({
      where: { id, organizationId },
    });

    if (!existingRecord) {
      return ApiErrors.notFound("Graduate record not found");
    }

    const graduateRecord = await db.graduateRecord.update({
      where: { id },
      data: {
        graduationYear,
        graduationDate: graduationDate ? new Date(graduationDate) : undefined,
        certificateNumber,
        certificateIssued,
        certificateIssuedAt: certificateIssuedAt ? new Date(certificateIssuedAt) : undefined,
        finalGPA,
        finalGradeLetter,
        honors,
        programName,
        specialization,
        employed,
        employerName,
        employmentDate: employmentDate ? new Date(employmentDate) : undefined,
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return apiSuccess({ graduate: graduateRecord, message: "Graduate record updated successfully" });
  } catch (error) {
    console.error("Error updating graduate record:", error);
    return ApiErrors.internal("Failed to update graduate record", error);
  }
}

// DELETE - Delete graduate record
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
      return ApiErrors.badRequest("Graduate record ID is required");
    }

    // Verify record belongs to organization
    const existingRecord = await db.graduateRecord.findFirst({
      where: { id, organizationId },
      include: { student: true },
    });

    if (!existingRecord) {
      return ApiErrors.notFound("Graduate record not found");
    }

    // Update student status back to active
    await db.student.update({
      where: { id: existingRecord.studentId },
      data: { status: "active" },
    });

    await db.graduateRecord.delete({
      where: { id },
    });

    return apiSuccess({ message: "Graduate record deleted successfully" });
  } catch (error) {
    console.error("Error deleting graduate record:", error);
    return ApiErrors.internal("Failed to delete graduate record", error);
  }
}
