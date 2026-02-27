import { NextRequest } from "next/server";
import { db } from "@/lib/db";

// GET - Test teachers API without auth (for debugging only)
export async function GET(request: NextRequest) {
  try {
    // Simulate what the teachers API does
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Get the first organization for testing
    const firstOrg = await db.organization.findFirst();
    
    if (!firstOrg) {
      return Response.json({ 
        error: "No organization found in database",
        hint: "Please log in and create an organization first"
      });
    }

    const where: any = {
      organizationId: firstOrg.id,
    };

    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
      ];
    }

    const teachers = await db.teacher.findMany({
      where,
      include: {
        classes: {
          select: { id: true, name: true, grade: true },
        },
        _count: {
          select: { classes: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return Response.json({ 
      success: true,
      teachers,
      organization: {
        id: firstOrg.id,
        name: firstOrg.name
      },
      count: teachers.length
    });
  } catch (error: any) {
    console.error("Test teachers API error:", error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

// POST - Test creating a teacher without auth
export async function POST(request: NextRequest) {
  try {
    // Get the first organization for testing
    const firstOrg = await db.organization.findFirst();
    
    if (!firstOrg) {
      return Response.json({ 
        error: "No organization found in database"
      });
    }

    const body = await request.json();
    const {
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      address,
      dateOfBirth,
      gender,
      qualification,
      specialization,
      joiningDate,
      status,
    } = body;

    if (!firstName || !lastName) {
      return Response.json({ error: "First name and last name are required" }, { status: 400 });
    }

    // Generate employeeId if not provided
    const finalEmployeeId = employeeId || `EMP-${Date.now()}`;

    // Check if employeeId already exists
    const existingTeacher = await db.teacher.findFirst({
      where: {
        organizationId: firstOrg.id,
        employeeId: finalEmployeeId,
      },
    });

    if (existingTeacher) {
      return Response.json({ error: "Employee ID already exists" }, { status: 400 });
    }

    const teacher = await db.teacher.create({
      data: {
        organizationId: firstOrg.id,
        employeeId: finalEmployeeId,
        firstName,
        lastName,
        email,
        phone,
        address,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        qualification,
        specialization,
        joiningDate: joiningDate ? new Date(joiningDate) : undefined,
        status: status || "active",
      },
    });

    return Response.json({ 
      success: true, 
      teacher,
      message: "Teacher created successfully" 
    }, { status: 201 });
  } catch (error: any) {
    console.error("Test create teacher error:", error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
