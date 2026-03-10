import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

interface StudentRow {
  studentId?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  email?: string;
  phone?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianAddress?: string;
  guardianRelation?: string;
  guardian2Name?: string;
  guardian2Phone?: string;
  guardian2Email?: string;
  guardian2Address?: string;
  guardian2Relation?: string;
  className?: string;
  enrollmentDate?: string;
  sessionStartDate?: string;
  status?: string;
}

function parseCSV(content: string): StudentRow[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const rows: StudentRow[] = [];

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

    const row: StudentRow = {};
    headers.forEach((header, index) => {
      const value = values[index]?.replace(/^"|"$/g, '');
      if (value) {
        if (header === 'studentid' || header === 'student_id' || header === 'id') {
          row.studentId = value;
        } else if (header === 'firstname' || header === 'first_name' || header === 'fname') {
          row.firstName = value;
        } else if (header === 'lastname' || header === 'last_name' || header === 'lname') {
          row.lastName = value;
        } else if (header === 'dateofbirth' || header === 'dob' || header === 'birth_date') {
          row.dateOfBirth = value;
        } else if (header === 'gender' || header === 'sex') {
          row.gender = value;
        } else if (header === 'email' || header === 'emailaddress') {
          row.email = value;
        } else if (header === 'phone' || header === 'phonenumber' || header === 'mobile') {
          row.phone = value;
        } else if (header === 'address' || header === 'homeaddress') {
          row.address = value;
        } else if (header === 'guardianname' || header === 'parent_name' || header === 'guardian_name') {
          row.guardianName = value;
        } else if (header === 'guardianphone' || header === 'parent_phone' || header === 'guardian_phone') {
          row.guardianPhone = value;
        } else if (header === 'guardianemail' || header === 'parent_email' || header === 'guardian_email') {
          row.guardianEmail = value;
        } else if (header === 'guardianaddress' || header === 'parent_address' || header === 'guardian_address') {
          row.guardianAddress = value;
        } else if (header === 'guardianrelation' || header === 'parent_relation' || header === 'guardian_relation') {
          row.guardianRelation = value;
        } else if (header === 'guardian2name' || header === 'parent2_name' || header === 'guardian2_name') {
          row.guardian2Name = value;
        } else if (header === 'guardian2phone' || header === 'parent2_phone' || header === 'guardian2_phone') {
          row.guardian2Phone = value;
        } else if (header === 'guardian2email' || header === 'parent2_email' || header === 'guardian2_email') {
          row.guardian2Email = value;
        } else if (header === 'guardian2address' || header === 'parent2_address' || header === 'guardian2_address') {
          row.guardian2Address = value;
        } else if (header === 'guardian2relation' || header === 'parent2_relation' || header === 'guardian2_relation') {
          row.guardian2Relation = value;
        } else if (header === 'classname' || header === 'class' || header === 'class_name') {
          row.className = value;
        } else if (header === 'enrollmentdate' || header === 'enrollment_date' || header === 'enrolled') {
          row.enrollmentDate = value;
        } else if (header === 'sessionstartdate' || header === 'session_start' || header === 'session_date') {
          row.sessionStartDate = value;
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

  for (const _format of formats) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

// POST - Handle CSV file upload for bulk student import
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

    // Get all classes for this organization
    const classes = await db.eduClass.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });

    // Get current session
    const currentSession = await db.eduSession.findFirst({
      where: { organizationId, isCurrent: true },
    });

    // Get existing students to check for duplicates
    const existingStudents = await db.student.findMany({
      where: { organizationId },
      select: { studentId: true, email: true },
    });

    const existingStudentIds = new Set(existingStudents.map(s => s.studentId.toLowerCase()));
    const existingEmails = new Set(existingStudents.map(s => s.email?.toLowerCase()).filter(Boolean));

    const errors: { row: number; message: string }[] = [];
    const importedStudents: any[] = [];
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

        // Generate studentId if not provided
        const studentId = row.studentId || `STU${Date.now()}${i}`;

        // Check for duplicate studentId
        if (existingStudentIds.has(studentId.toLowerCase())) {
          errors.push({ row: rowNumber, message: `Student ID "${studentId}" already exists` });
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

        // Find class
        let classId: string | null = null;
        if (row.className) {
          const matchedClass = classes.find(c => 
            c.name.toLowerCase() === row.className!.toLowerCase()
          );
          if (matchedClass) {
            classId = matchedClass.id;
          }
        }

        // Parse dates
        const dateOfBirth = parseDate(row.dateOfBirth);
        const enrollmentDate = parseDate(row.enrollmentDate);
        const sessionStartDate = parseDate(row.sessionStartDate);

        // Create student
        const student = await db.student.create({
          data: {
            organizationId,
            studentId,
            firstName: row.firstName,
            lastName: row.lastName,
            dateOfBirth,
            gender: row.gender,
            email: row.email,
            phone: row.phone,
            address: row.address,
            guardianName: row.guardianName,
            guardianPhone: row.guardianPhone,
            guardianEmail: row.guardianEmail,
            guardianAddress: row.guardianAddress,
            guardianRelation: row.guardianRelation,
            guardian2Name: row.guardian2Name,
            guardian2Phone: row.guardian2Phone,
            guardian2Email: row.guardian2Email,
            guardian2Address: row.guardian2Address,
            guardian2Relation: row.guardian2Relation,
            classId,
            sessionId: currentSession?.id,
            enrollmentDate,
            sessionStartDate,
            status: row.status?.toLowerCase() || "active",
          },
        });

        importedStudents.push(student);
        existingStudentIds.add(studentId.toLowerCase());
        if (row.email) {
          existingEmails.add(row.email.toLowerCase());
        }
        successCount++;
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : "Failed to import";
        errors.push({ row: rowNumber, message: errorMsg });
        failCount++;
      }
    }

    // Log import
    const importLog = await db.studentImport.create({
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
      importedStudents,
    });
  } catch (error) {
    console.error("Error importing students:", error);
    return ApiErrors.internal("Failed to import students", error);
  }
}
