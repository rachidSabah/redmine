export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// GET - Export schedule to PDF/DOCX or templates
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
      return apiSuccess({ templates: [], schedule: null });
    }

    const organizationId = membership.organizationId;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'schedule', 'students-template', 'teachers-template'
    const classId = searchParams.get("classId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const format = searchParams.get("format") || "csv"; // 'csv', 'pdf', 'docx'

    if (type === "students-template") {
      // Return student import template CSV
      const template = [
        "studentId,firstName,lastName,dateOfBirth,gender,email,phone,address,",
        "guardianName,guardianPhone,guardianEmail,guardianAddress,guardianRelation,",
        "guardian2Name,guardian2Phone,guardian2Email,guardian2Address,guardian2Relation,",
        "className,enrollmentDate,sessionStartDate,status",
        "STU001,John,Doe,2010-05-15,Male,john.doe@example.com,1234567890,123 Main St,",
        "Jane Doe,1234567890,jane@example.com,123 Main St,Mother,",
        "John Doe Sr,0987654321,john.sr@example.com,123 Main St,Father,",
        "Class A,2024-09-01,2024-09-01,active",
        "STU002,Jane,Smith,2011-03-20,Female,jane.smith@example.com,0987654321,456 Oak Ave,",
        "Bob Smith,5551234567,bob@example.com,456 Oak Ave,Father,,,,Class A,2024-09-01,2024-09-01,active",
      ].join("\n");

      return new Response(template, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=student_import_template.csv",
        },
      });
    }

    if (type === "teachers-template") {
      // Return teacher import template CSV
      const template = [
        "employeeId,firstName,lastName,email,phone,address,dateOfBirth,gender,qualification,specialization,joiningDate,status",
        "EMP001,John,Teacher,john.teacher@example.com,1234567890,123 School St,1985-06-15,Male,Ph.D,Mathematics,2020-09-01,active",
        "EMP002,Jane,Instructor,jane.instructor@example.com,0987654321,456 Education Ave,1990-03-20,Female,M.Sc,Science,2021-01-15,active",
      ].join("\n");

      return new Response(template, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=teacher_import_template.csv",
        },
      });
    }

    if (type === "schedule") {
      if (!classId || !month || !year) {
        return ApiErrors.badRequest("classId, month, and year are required for schedule export");
      }

      // Get schedule data
      const schedule = await db.monthlySchedule.findFirst({
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
        return ApiErrors.notFound("Schedule not found");
      }

      if (format === "csv") {
        // Generate CSV
        const csvRows = [
          "Date,Day,Teacher,Module,Start Time,End Time,Notes",
          ...schedule.entries.map(entry => {
            const date = new Date(entry.date);
            const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
            const dateStr = date.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
            const teacher = entry.teacher 
              ? `${entry.teacher.firstName} ${entry.teacher.lastName} (${entry.teacher.employeeId})`
              : "Not Assigned";
            const eduModule = entry.eduModule 
              ? `${entry.eduModule.name} (${entry.eduModule.code || "N/A"})`
              : "Not Assigned";
            
            return `${dateStr},${dayName},"${teacher}","${eduModule}",${entry.startTime || ""},${entry.endTime || ""},"${entry.notes || ""}"`;
          }),
        ];

        const csv = csvRows.join("\n");

        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=schedule_${schedule.class?.name}_${month}_${year}.csv`,
          },
        });
      }

      // For PDF/DOCX, return JSON data (frontend will handle formatting)
      return apiSuccess({ schedule });
    }

    return ApiErrors.badRequest("Invalid export type. Use 'schedule', 'students-template', or 'teachers-template'");
  } catch (error) {
    console.error("Error exporting:", error);
    return ApiErrors.internal("Failed to export", error);
  }
}
