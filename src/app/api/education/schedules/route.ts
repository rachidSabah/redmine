import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// GET - Get schedule by classId, month, year
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
      return apiSuccess({ schedule: null, entries: [] });
    }

    const organizationId = membership.organizationId;

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!classId || !month || !year) {
      return ApiErrors.badRequest("classId, month, and year are required");
    }

    // Find or create monthly schedule
    let schedule = await db.monthlySchedule.findFirst({
      where: {
        organizationId,
        classId,
        month: parseInt(month),
        year: parseInt(year),
      },
      include: {
        entries: {
          include: {
            teacher: {
              select: { id: true, firstName: true, lastName: true, employeeId: true },
            },
            eduModule: {
              select: { id: true, name: true, code: true, color: true },
            },
          },
          orderBy: { date: "asc" },
        },
        class: {
          select: { id: true, name: true, grade: true },
        },
      },
    });

    if (!schedule) {
      return apiSuccess({ schedule: null, entries: [] });
    }

    return apiSuccess({ schedule, entries: schedule.entries });
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return ApiErrors.internal("Failed to fetch schedule", error);
  }
}

// POST - Create/update monthly schedule with entries
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
    const { classId, month, year, schoolName, entries, isPublished } = body;

    if (!classId || !month || !year) {
      return ApiErrors.badRequest("classId, month, and year are required");
    }

    // Verify class belongs to organization
    const existingClass = await db.eduClass.findFirst({
      where: { id: classId, organizationId },
    });

    if (!existingClass) {
      return ApiErrors.notFound("Class not found");
    }

    // Find or create monthly schedule
    let schedule = await db.monthlySchedule.findFirst({
      where: {
        organizationId,
        classId,
        month,
        year,
      },
    });

    if (schedule) {
      // Update existing schedule
      schedule = await db.monthlySchedule.update({
        where: { id: schedule.id },
        data: {
          schoolName,
          isPublished: isPublished ?? schedule.isPublished,
        },
      });
    } else {
      // Create new schedule
      schedule = await db.monthlySchedule.create({
        data: {
          organizationId,
          classId,
          month,
          year,
          schoolName,
          isPublished: isPublished ?? false,
        },
      });
    }

    // Process entries if provided
    if (entries && Array.isArray(entries)) {
      // Delete existing entries for this schedule
      await db.scheduleEntry.deleteMany({
        where: { monthlyScheduleId: schedule.id },
      });

      // Create new entries
      const entriesToCreate = [];
      for (const entry of entries) {
        if (!entry.date) continue;

        // Validate teacher if provided
        if (entry.teacherId) {
          const teacher = await db.teacher.findFirst({
            where: { id: entry.teacherId, organizationId },
          });
          if (!teacher) {
            continue; // Skip invalid teacher
          }
        }

        // Validate eduModule if provided
        if (entry.moduleId) {
          const eduModule = await db.eduModule.findFirst({
            where: { id: entry.moduleId, organizationId },
          });
          if (!eduModule) {
            continue; // Skip invalid eduModule
          }
        }

        // Validate end time is after start time if both provided
        if (entry.startTime && entry.endTime) {
          if (entry.endTime <= entry.startTime) {
            continue; // Skip invalid time range
          }
        }

        const date = new Date(entry.date);
        entriesToCreate.push({
          organizationId,
          monthlyScheduleId: schedule.id,
          date,
          teacherId: entry.teacherId || null,
          moduleId: entry.moduleId || null,
          startTime: entry.startTime || null,
          endTime: entry.endTime || null,
          notes: entry.notes || null,
          dayOfWeek: date.getDay(),
        });
      }

      if (entriesToCreate.length > 0) {
        await db.scheduleEntry.createMany({
          data: entriesToCreate,
        });
      }
    }

    // Return updated schedule with entries
    const result = await db.monthlySchedule.findUnique({
      where: { id: schedule.id },
      include: {
        entries: {
          include: {
            teacher: {
              select: { id: true, firstName: true, lastName: true, employeeId: true },
            },
            eduModule: {
              select: { id: true, name: true, code: true, color: true },
            },
          },
          orderBy: { date: "asc" },
        },
      },
    });

    return apiSuccess({ schedule: result, message: "Schedule saved successfully" });
  } catch (error) {
    console.error("Error saving schedule:", error);
    return ApiErrors.internal("Failed to save schedule", error);
  }
}

// PUT - Update individual schedule entry
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
    const { id, teacherId, moduleId, startTime, endTime, notes } = body;

    if (!id) {
      return ApiErrors.badRequest("Entry ID is required");
    }

    // Verify entry belongs to organization
    const existingEntry = await db.scheduleEntry.findFirst({
      where: { id, organizationId },
    });

    if (!existingEntry) {
      return ApiErrors.notFound("Schedule entry not found");
    }

    // Validate teacher if provided
    if (teacherId) {
      const teacher = await db.teacher.findFirst({
        where: { id: teacherId, organizationId },
      });
      if (!teacher) {
        return ApiErrors.badRequest("Teacher not found");
      }
    }

    // Validate eduModule if provided
    if (moduleId) {
      const eduModule = await db.eduModule.findFirst({
        where: { id: moduleId, organizationId },
      });
      if (!eduModule) {
        return ApiErrors.badRequest("Module not found");
      }
    }

    // Validate end time is after start time if both provided
    if (startTime && endTime && endTime <= startTime) {
      return ApiErrors.badRequest("End time must be after start time");
    }

    const entry = await db.scheduleEntry.update({
      where: { id },
      data: {
        teacherId: teacherId || null,
        moduleId: moduleId || null,
        startTime: startTime || null,
        endTime: endTime || null,
        notes: notes || null,
      },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
        eduModule: {
          select: { id: true, name: true, code: true, color: true },
        },
      },
    });

    return apiSuccess({ entry, message: "Entry updated successfully" });
  } catch (error) {
    console.error("Error updating entry:", error);
    return ApiErrors.internal("Failed to update entry", error);
  }
}

// DELETE - Delete schedule entry
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
    const scheduleId = searchParams.get("scheduleId");

    if (id) {
      // Delete single entry
      const existingEntry = await db.scheduleEntry.findFirst({
        where: { id, organizationId },
      });

      if (!existingEntry) {
        return ApiErrors.notFound("Schedule entry not found");
      }

      await db.scheduleEntry.delete({
        where: { id },
      });

      return apiSuccess({ message: "Entry deleted successfully" });
    } else if (scheduleId) {
      // Delete entire schedule
      const existingSchedule = await db.monthlySchedule.findFirst({
        where: { id: scheduleId, organizationId },
      });

      if (!existingSchedule) {
        return ApiErrors.notFound("Schedule not found");
      }

      // Delete entries first
      await db.scheduleEntry.deleteMany({
        where: { monthlyScheduleId: scheduleId },
      });

      // Delete schedule
      await db.monthlySchedule.delete({
        where: { id: scheduleId },
      });

      return apiSuccess({ message: "Schedule deleted successfully" });
    } else {
      return ApiErrors.badRequest("Entry ID or Schedule ID is required");
    }
  } catch (error) {
    console.error("Error deleting:", error);
    return ApiErrors.internal("Failed to delete", error);
  }
}
