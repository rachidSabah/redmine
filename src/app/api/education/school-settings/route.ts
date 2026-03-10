export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// GET - Get school settings
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
      return apiSuccess({ settings: null });
    }

    const organizationId = membership.organizationId;

    const settings = await db.schoolSettings.findUnique({
      where: { organizationId },
    });

    return apiSuccess({ settings });
  } catch (error) {
    console.error("Error fetching school settings:", error);
    return ApiErrors.internal("Failed to fetch school settings", error);
  }
}

// POST - Create or update school settings
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
      schoolName,
      schoolLogo,
      schoolAddress,
      schoolPhone,
      schoolEmail,
      principalName,
      academicYearStart,
      academicYearEnd,
      gradingScale,
    } = body;

    if (!schoolName) {
      return ApiErrors.badRequest("School name is required");
    }

    // Check if settings already exist
    const existingSettings = await db.schoolSettings.findUnique({
      where: { organizationId },
    });

    let settings;
    if (existingSettings) {
      // Update existing settings
      settings = await db.schoolSettings.update({
        where: { organizationId },
        data: {
          schoolName,
          schoolLogo,
          schoolAddress,
          schoolPhone,
          schoolEmail,
          principalName,
          academicYearStart,
          academicYearEnd,
          gradingScale,
        },
      });
    } else {
      // Create new settings
      settings = await db.schoolSettings.create({
        data: {
          organizationId,
          schoolName,
          schoolLogo,
          schoolAddress,
          schoolPhone,
          schoolEmail,
          principalName,
          academicYearStart,
          academicYearEnd,
          gradingScale,
        },
      });
    }

    return apiSuccess({ settings, message: "School settings saved successfully" });
  } catch (error) {
    console.error("Error saving school settings:", error);
    return ApiErrors.internal("Failed to save school settings", error);
  }
}

// PUT - Update school settings
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
      schoolName,
      schoolLogo,
      schoolAddress,
      schoolPhone,
      schoolEmail,
      principalName,
      academicYearStart,
      academicYearEnd,
      gradingScale,
    } = body;

    const existingSettings = await db.schoolSettings.findUnique({
      where: { organizationId },
    });

    if (!existingSettings) {
      return ApiErrors.notFound("School settings not found");
    }

    const settings = await db.schoolSettings.update({
      where: { organizationId },
      data: {
        schoolName,
        schoolLogo,
        schoolAddress,
        schoolPhone,
        schoolEmail,
        principalName,
        academicYearStart,
        academicYearEnd,
        gradingScale,
      },
    });

    return apiSuccess({ settings, message: "School settings updated successfully" });
  } catch (error) {
    console.error("Error updating school settings:", error);
    return ApiErrors.internal("Failed to update school settings", error);
  }
}
