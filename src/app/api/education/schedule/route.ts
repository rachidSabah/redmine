import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// GET - List schedules
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
      return apiSuccess({ schedules: [], entries: [] });
    }

    const organizationId = membership.organizationId;
    const { searchParams } = new URL(request.url);
    
    const classId = searchParams.get("classId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // If classId, month, and year are provided, get or create monthly schedule
    if (classId && month && year) {
      let schedule = await db.monthlySchedule.findUnique({
        where: {
          classId_month_year: {
            classId,
            month: parseInt(month),
            year: parseInt(year),
          },
        },
        include: {
          entries: {
            include: {
              teacher: {
                select: { id: true, firstName: true, lastName: true, employeeId: true },
              },
              module: {
                select: { id: true, code: true, name: true, color: true },
              },
              classroom: {
                select: { id: true, name: true, code: true },
              },
            },
            orderBy: { date: "asc" },
          },
        },
      });

      if (!schedule) {
        // Create the schedule if it doesn't exist
        schedule = await db.monthlySchedule.create({
          data: {
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
                module: {
                  select: { id: true, code: true, name: true, color: true },
                },
                classroom: {
                  select: { id: true, name: true, code: true },
                },
              },
              orderBy: { date: "asc" },
            },
          },
        });
      }

      return apiSuccess({ schedule, entries: schedule.entries });
    }

    // If startDate and endDate are provided, get entries in range
    if (startDate && endDate) {
      const entries = await db.scheduleEntry.findMany({
        where: {
          organizationId,
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        include: {
          schedule: {
            select: { classId: true, class: { select: { id: true, name: true } } },
          },
          teacher: {
            select: { id: true, firstName: true, lastName: true, employeeId: true },
          },
          module: {
            select: { id: true, code: true, name: true, color: true },
          },
          classroom: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { date: "asc" },
      });

      return apiSuccess({ entries });
    }

    // Get all schedules for the organization
    const schedules = await db.monthlySchedule.findMany({
      where: {
        organizationId,
      },
      include: {
        class: {
          select: { id: true, name: true, grade: true },
        },
        _count: {
          select: { entries: true },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return apiSuccess({ schedules });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return ApiErrors.internal("Failed to fetch schedules", error);
  }
}

// POST - Create schedule entry
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
    const { scheduleId, classId, month, year, date, startTime, endTime, teacherId, moduleId, classroomId, notes } = body;

    if (!date) {
      return ApiErrors.badRequest("Date is required");
    }

    let targetScheduleId = scheduleId;

    // If scheduleId not provided but classId, month, year are, get or create schedule
    if (!targetScheduleId && classId && month && year) {
      let schedule = await db.monthlySchedule.findUnique({
        where: {
          classId_month_year: {
            classId,
            month: parseInt(month),
            year: parseInt(year),
          },
        },
      });

      if (!schedule) {
        schedule = await db.monthlySchedule.create({
          data: {
            organizationId,
            classId,
            month: parseInt(month),
            year: parseInt(year),
          },
        });
      }

      targetScheduleId = schedule.id;
    }

    if (!targetScheduleId) {
      return ApiErrors.badRequest("Schedule ID or class/month/year is required");
    }

    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    const entry = await db.scheduleEntry.create({
      data: {
        organizationId,
        scheduleId: targetScheduleId,
        date: dateObj,
        dayOfWeek,
        startTime,
        endTime,
        teacherId,
        moduleId,
        classroomId,
        notes,
      },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
        module: {
          select: { id: true, code: true, name: true, color: true },
        },
        classroom: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return apiSuccess({ entry, message: "Schedule entry created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating schedule entry:", error);
    return ApiErrors.internal("Failed to create schedule entry", error);
  }
}

// PUT - Update schedule entry
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
    const { id, date, startTime, endTime, teacherId, moduleId, classroomId, notes } = body;

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

    const updateData: any = {
      startTime,
      endTime,
      teacherId,
      moduleId,
      classroomId,
      notes,
    };

    if (date) {
      const dateObj = new Date(date);
      updateData.date = dateObj;
      updateData.dayOfWeek = dateObj.getDay();
    }

    const entry = await db.scheduleEntry.update({
      where: { id },
      data: updateData,
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
        module: {
          select: { id: true, code: true, name: true, color: true },
        },
        classroom: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return apiSuccess({ entry, message: "Schedule entry updated successfully" });
  } catch (error) {
    console.error("Error updating schedule entry:", error);
    return ApiErrors.internal("Failed to update schedule entry", error);
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

    await db.scheduleEntry.delete({
      where: { id },
    });

    return apiSuccess({ message: "Schedule entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting schedule entry:", error);
    return ApiErrors.internal("Failed to delete schedule entry", error);
  }
}
