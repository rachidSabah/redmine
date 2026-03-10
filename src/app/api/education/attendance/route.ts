export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, ApiErrors } from "@/lib/api-response";

// GET - List attendance records
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
      return apiSuccess({ attendance: [], stats: null });
    }

    const organizationId = membership.organizationId;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const classId = searchParams.get("classId");
    const sessionId = searchParams.get("sessionId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const date = searchParams.get("date");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");

    const where: any = {
      organizationId,
    };

    if (studentId) {
      where.studentId = studentId;
    }

    if (classId) {
      where.classId = classId;
    }

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (status) {
      where.status = status;
    }

    if (date) {
      where.date = new Date(date);
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [attendance, total] = await Promise.all([
      db.studentAttendance.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
              class: {
                select: { id: true, name: true, grade: true },
              },
            },
          },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      db.studentAttendance.count({ where }),
    ]);

    // Calculate stats
    const stats = await db.studentAttendance.groupBy({
      by: ["status"],
      where: {
        organizationId,
        ...(date ? { date: new Date(date) } : {}),
        ...(startDate || endDate
          ? {
              date: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      },
      _count: true,
    });

    const statsFormatted = {
      total: stats.reduce((sum, s) => sum + s._count, 0),
      present: stats.find(s => s.status === "present")?._count || 0,
      absent: stats.find(s => s.status === "absent")?._count || 0,
      late: stats.find(s => s.status === "late")?._count || 0,
      excused: stats.find(s => s.status === "excused")?._count || 0,
    };

    return apiSuccess({
      attendance,
      stats: statsFormatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return ApiErrors.internal("Failed to fetch attendance", error);
  }
}

// POST - Create attendance record(s)
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
    const { records, singleRecord } = body;

    // Support both single record and bulk records
    const attendanceRecords = singleRecord ? [singleRecord] : records;

    if (!attendanceRecords || !Array.isArray(attendanceRecords)) {
      return ApiErrors.badRequest("Attendance records are required");
    }

    const results: any[] = [];
    const automationTriggers: {
      attendanceId: string;
      studentId: string;
      status: string;
      guardianPhone: string | null;
      guardianName: string | null;
      studentName: string;
      date: Date;
    }[] = [];

    for (const record of attendanceRecords) {
      const {
        studentId,
        classId,
        sessionId,
        date,
        status,
        remarks,
      } = record;

      if (!studentId || !date || !status) {
        continue;
      }

      // Get student info first
      const student = await db.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          guardianPhone: true,
          guardianName: true,
        },
      });

      if (!student) continue;

      // Upsert attendance record
      const attendance = await db.studentAttendance.upsert({
        where: {
          studentId_date: {
            studentId,
            date: new Date(date),
          },
        },
        create: {
          organizationId,
          studentId,
          classId,
          sessionId,
          date: new Date(date),
          status,
          remarks,
          markedBy: user.id,
        },
        update: {
          status,
          remarks,
          markedBy: user.id,
        },
      });

      results.push({ ...attendance, student });

      // Check if automation should trigger
      if (status === "absent" || status === "late") {
        automationTriggers.push({
          attendanceId: attendance.id,
          studentId,
          status,
          guardianPhone: student.guardianPhone,
          guardianName: student.guardianName,
          studentName: `${student.firstName} ${student.lastName}`,
          date: attendance.date,
        });
      }
    }

    // Process automation triggers
    if (automationTriggers.length > 0) {
      // Get active automations
      const automations = await db.attendanceAutomation.findMany({
        where: {
          organizationId,
          isActive: true,
        },
      });

      for (const trigger of automationTriggers) {
        for (const automation of automations) {
          const shouldTrigger =
            (automation.triggerType === "absence" && trigger.status === "absent") ||
            (automation.triggerType === "late" && trigger.status === "late") ||
            (automation.triggerType === "both" &&
              (trigger.status === "absent" || trigger.status === "late"));

          if (shouldTrigger && trigger.guardianPhone) {
            // Get default template for this type
            const template = await db.messageTemplate.findFirst({
              where: {
                organizationId,
                category: trigger.status === "absent" ? "absence" : "delay",
                isActive: true,
                isDefault: true,
              },
            });

            if (template) {
              // Replace variables in template
              let message = template.body;
              message = message.replace(/\{\{student_name\}\}/g, trigger.studentName);
              message = message.replace(/\{\{date\}\}/g, new Date(trigger.date).toLocaleDateString());
              message = message.replace(/\{\{status\}\}/g, trigger.status);

              // Create communication log
              await db.communicationLog.create({
                data: {
                  organizationId,
                  studentId: trigger.studentId,
                  recipientPhone: trigger.guardianPhone,
                  recipientName: trigger.guardianName,
                  templateId: template.id,
                  messageContent: message,
                  channel: "whatsapp",
                  status: "pending",
                  triggeredBy: "attendance_automation",
                  triggerRefId: trigger.attendanceId,
                },
              });

              // Update template usage count
              await db.messageTemplate.update({
                where: { id: template.id },
                data: {
                  usageCount: { increment: 1 },
                  lastUsedAt: new Date(),
                },
              });

              // Update automation execution count
              await db.attendanceAutomation.update({
                where: { id: automation.id },
                data: {
                  executionCount: { increment: 1 },
                  lastExecutedAt: new Date(),
                },
              });
            }
          }
        }
      }
    }

    return apiSuccess({
      attendance: results,
      automationTriggers: automationTriggers.length,
      message: `Saved ${results.length} attendance records`,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating attendance:", error);
    return ApiErrors.internal("Failed to create attendance", error);
  }
}

// PUT - Update attendance record
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
    const { id, status, remarks } = body;

    if (!id) {
      return ApiErrors.badRequest("Attendance ID is required");
    }

    // Verify attendance belongs to organization
    const existingAttendance = await db.studentAttendance.findFirst({
      where: { id, organizationId },
    });

    if (!existingAttendance) {
      return ApiErrors.notFound("Attendance record not found");
    }

    const attendance = await db.studentAttendance.update({
      where: { id },
      data: {
        status,
        remarks,
        markedBy: user.id,
      },
    });

    return apiSuccess({ attendance, message: "Attendance updated successfully" });
  } catch (error) {
    console.error("Error updating attendance:", error);
    return ApiErrors.internal("Failed to update attendance", error);
  }
}

// DELETE - Delete attendance record
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
      return ApiErrors.badRequest("Attendance ID is required");
    }

    // Verify attendance belongs to organization
    const existingAttendance = await db.studentAttendance.findFirst({
      where: { id, organizationId },
    });

    if (!existingAttendance) {
      return ApiErrors.notFound("Attendance record not found");
    }

    await db.studentAttendance.delete({
      where: { id },
    });

    return apiSuccess({ message: "Attendance record deleted successfully" });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    return ApiErrors.internal("Failed to delete attendance", error);
  }
}
