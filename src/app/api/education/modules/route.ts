import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// GET - List modules
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
      return apiSuccess({ modules: [] });
    }

    const organizationId = membership.organizationId;

    const { searchParams } = new URL(request.url);
    const studyYear = searchParams.get("studyYear");

    const where: any = {
      organizationId,
      isActive: true,
    };

    if (studyYear) {
      where.studyYear = parseInt(studyYear);
    }

    const modules = await db.eduModule.findMany({
      where,
      include: {
        _count: {
          select: { scheduleEntries: true },
        },
      },
      orderBy: [{ studyYear: "asc" }, { code: "asc" }],
    });

    return apiSuccess({ modules });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return ApiErrors.internal("Failed to fetch modules", error);
  }
}

// POST - Create module
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
    const { code, name, description, studyYear, durationHours, credits, color, category } = body;

    if (!code || !name) {
      return ApiErrors.badRequest("Module code and name are required");
    }

    // Check if module with same code exists
    const existing = await db.eduModule.findFirst({
      where: { organizationId, code },
    });

    if (existing) {
      return ApiErrors.badRequest("Module with this code already exists");
    }

    const eduModule = await db.eduModule.create({
      data: {
        organizationId,
        code,
        name,
        description,
        studyYear: studyYear || 1,
        durationHours,
        credits,
        color,
        category,
      },
    });

    return apiSuccess({ module: eduModule, message: "Module created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating module:", error);
    return ApiErrors.internal("Failed to create module", error);
  }
}

// PUT - Update module
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
    const { id, code, name, description, studyYear, durationHours, credits, color, category, isActive } = body;

    if (!id) {
      return ApiErrors.badRequest("Module ID is required");
    }

    // Verify module belongs to organization
    const existingModule = await db.eduModule.findFirst({
      where: { id, organizationId },
    });

    if (!existingModule) {
      return ApiErrors.notFound("Module not found");
    }

    const eduModule = await db.eduModule.update({
      where: { id },
      data: {
        code,
        name,
        description,
        studyYear,
        durationHours,
        credits,
        color,
        category,
        isActive,
      },
    });

    return apiSuccess({ module: eduModule, message: "Module updated successfully" });
  } catch (error) {
    console.error("Error updating module:", error);
    return ApiErrors.internal("Failed to update module", error);
  }
}

// DELETE - Delete module
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
      return ApiErrors.badRequest("Module ID is required");
    }

    // Verify module belongs to organization
    const existingModule = await db.eduModule.findFirst({
      where: { id, organizationId },
    });

    if (!existingModule) {
      return ApiErrors.notFound("Module not found");
    }

    // Soft delete by setting isActive to false
    await db.eduModule.update({
      where: { id },
      data: { isActive: false },
    });

    return apiSuccess({ message: "Module deleted successfully" });
  } catch (error) {
    console.error("Error deleting module:", error);
    return ApiErrors.internal("Failed to delete module", error);
  }
}
