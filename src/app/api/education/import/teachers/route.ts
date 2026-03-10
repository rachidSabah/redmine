import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

interface TeacherRow {
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  qualification?: string;
  specialization?: string;
  joiningDate?: string;
  status?: string;
}

function parseCSV(content: string): TeacherRow[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const rows: TeacherRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: TeacherRow = {};
    headers.forEach((header, index) => {
      const value = values[index]?.replace(/^"|"$/g, '');
      if (value) {
        if (header === 'employeeid' || header === 'employee_id' || header === 'empid' || header === 'id') {
          row.employeeId = value;
        } else if (header === 'firstname' || header === 'first_name' || header === 'fname') {
          row.firstName = value;
        } else if (header === 'lastname' || header === 'last_name' || header === 'lname') {
          row.lastName = value;
        } else if (header === 'email' || header === 'emailaddress') {
          row.email = value;
        } else if (header === 'phone' || header === 'phonenumber' || header === 'mobile') {
          row.phone = value;
        } else if (header === 'address') {
          row.address = value;
        } else if (header === 'dateofbirth' || header === 'dob' || header === 'birth_date') {
          row.dateOfBirth = value;
        } else if (header === 'gender' || header === 'sex') {
          row.gender = value;
        } else if (header === 'qualification' || header === 'degree' || header === 'education') {
          row.qualification = value;
        } else if (header === 'specialization' || header === 'subject' || header === 'specialty') {
          row.specialization = value;
        } else if (header === 'joiningdate' || header === 'join_date' || header === 'joined') {
          row.joiningDate = value;
        } else if (header === 'status') {
          row.status = value;
        }
      }
    });
    rows.push(row);
  }

  return rows;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{2})-(\d{2})-(\d{4})$/,
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

// POST - Handle CSV file upload for bulk teacher import
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

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return ApiErrors.badRequest("No file provided");
    }

    const fileName = file.name;
    const content = await file.text();
    const rows = parseCSV(content);

    if (rows.length === 0) {
      return ApiErrors.badRequest("No valid data found in file");
    }

    // Get existing teachers to check for duplicates
    const existingTeachers = await db.teacher.findMany({
      where: { organizationId },
      select: { employeeId: true, email: true },
    });

    const existingEmployeeIds = new Set(existingTeachers.map(t => t.employeeId.toLowerCase()));
    const existingEmails = new Set(existingTeachers.map(t => t.email?.toLowerCase()).filter(Boolean));

    const errors: { row: number; message: string }[] = [];
    const importedTeachers: any[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      try {
        // Validate required fields
        if (!row.firstName || !row.lastName) {
          errors.push({ row: rowNumber, message: "First name and last name are required" });
          failCount++;
          continue;
        }

        // Generate employeeId if not provided
        const employeeId = row.employeeId || `EMP${Date.now()}${i}`;

        // Check for duplicate employeeId
        if (existingEmployeeIds.has(employeeId.toLowerCase())) {
          errors.push({ row: rowNumber, message: `Employee ID "${employeeId}" already exists` });
          failCount++;
          continue;
        }

        // Validate email if provided
        if (row.email && !validateEmail(row.email)) {
          errors.push({ row: rowNumber, message: `Invalid email format: ${row.email}` });
          failCount++;
          continue;
        }

        // Check for duplicate email
        if (row.email && existingEmails.has(row.email.toLowerCase())) {
          errors.push({ row: rowNumber, message: `Email "${row.email}" already exists` });
          failCount++;
          continue;
        }

        // Parse dates
        const dateOfBirth = parseDate(row.dateOfBirth);
        const joiningDate = parseDate(row.joiningDate);

        // Create teacher
        const teacher = await db.teacher.create({
          data: {
            organizationId,
            employeeId,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone,
            address: row.address,
            dateOfBirth,
            gender: row.gender,
            qualification: row.qualification,
            specialization: row.specialization,
            joiningDate,
            status: row.status?.toLowerCase() || "active",
          },
        });

        importedTeachers.push(teacher);
        existingEmployeeIds.add(employeeId.toLowerCase());
        if (row.email) {
          existingEmails.add(row.email.toLowerCase());
        }
        successCount++;
      } catch (error: any) {
        errors.push({ row: rowNumber, message: error.message || "Failed to import" });
        failCount++;
      }
    }

    // Log import
    const importLog = await db.teacherImport.create({
      data: {
        organizationId,
        fileName,
        totalRows: rows.length,
        successCount,
        failCount,
        errors: errors.length > 0 ? errors : null,
        importedBy: user.id,
      },
    });

    return apiSuccess({
      message: "Import completed",
      import: {
        id: importLog.id,
        fileName,
        totalRows: rows.length,
        successCount,
        failCount,
        errors,
      },
      importedTeachers,
    });
  } catch (error) {
    console.error("Error importing teachers:", error);
    return ApiErrors.internal("Failed to import teachers", error);
  }
}
