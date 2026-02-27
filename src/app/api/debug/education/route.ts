import { NextRequest } from "next/server";
import { db } from "@/lib/db";

// GET - Debug education tables (no auth for testing)
export async function GET(request: NextRequest) {
  const results: Record<string, any> = {};
  
  // Test 1: Check database connection
  try {
    await db.$queryRaw`SELECT 1 as test`;
    results.databaseConnection = "OK";
  } catch (e: any) {
    results.databaseConnection = `FAILED: ${e.message}`;
    return Response.json(results, { status: 500 });
  }

  // Test 2: Check if students table exists
  try {
    const studentCount = await db.student.count();
    results.studentsTable = { exists: true, count: studentCount };
  } catch (e: any) {
    results.studentsTable = { exists: false, error: e.message };
  }

  // Test 3: Check if teachers table exists
  try {
    const teacherCount = await db.teacher.count();
    results.teachersTable = { exists: true, count: teacherCount };
  } catch (e: any) {
    results.teachersTable = { exists: false, error: e.message };
  }

  // Test 4: Check if eduClass table exists
  try {
    const classCount = await db.eduClass.count();
    results.classesTable = { exists: true, count: classCount };
  } catch (e: any) {
    results.classesTable = { exists: false, error: e.message };
  }

  // Test 5: Check if eduSession table exists
  try {
    const sessionCount = await db.eduSession.count();
    results.sessionsTable = { exists: true, count: sessionCount };
  } catch (e: any) {
    results.sessionsTable = { exists: false, error: e.message };
  }

  // Test 6: Check if schoolSettings table exists
  try {
    const settingsCount = await db.schoolSettings.count();
    results.schoolSettingsTable = { exists: true, count: settingsCount };
  } catch (e: any) {
    results.schoolSettingsTable = { exists: false, error: e.message };
  }

  // Test 7: List available Prisma models
  try {
    const modelNames = Object.keys(db).filter(key => 
      !key.startsWith('_') && 
      !key.startsWith('$') &&
      typeof (db as any)[key] === 'object' && 
      (db as any)[key] !== null
    );
    results.availableModels = modelNames;
  } catch (e: any) {
    results.availableModels = `Error: ${e.message}`;
  }

  // Test 8: Try to query a student
  try {
    const students = await db.student.findMany({
      take: 1,
      include: {
        class: true,
        session: true,
      }
    });
    results.sampleStudentQuery = { success: true, data: students };
  } catch (e: any) {
    results.sampleStudentQuery = { success: false, error: e.message, stack: e.stack };
  }

  return Response.json(results);
}
