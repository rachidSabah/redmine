export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - List all modules for organization
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return NextResponse.json({ success: true, data: { modules: [] } });
    }

    const organizationId = membership.organizationId;

    const modules = await db.eduModule.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: { modules } });
  } catch (error: any) {
    console.error("Error fetching modules:", error);
    
    if (error?.code === "P2021" || error?.message?.includes("does not exist")) {
      return NextResponse.json({ success: true, data: { modules: [] } });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch modules",
      details: process.env.NODE_ENV === "development" ? error?.message : undefined 
    }, { status: 500 });
  }
}

// POST - Create new eduModule
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return NextResponse.json({ 
        success: false, 
        error: "You must be a member of an organization" 
      }, { status: 400 });
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const { name, code, description, color, creditHours } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Module name is required" }, { status: 400 });
    }

    // Check for duplicate code if provided
    if (code) {
      const existingModule = await db.eduModule.findFirst({
        where: { organizationId, code },
      });
      if (existingModule) {
        return NextResponse.json({ 
          success: false, 
          error: "Module with this code already exists" 
        }, { status: 400 });
      }
    }

    const eduModule = await db.eduModule.create({
      data: {
        organizationId,
        name,
        code,
        description,
        color: color || "#3B82F6",
        creditHours: creditHours || 1,
      },
    });

    return NextResponse.json({ 
      success: true, 
      data: { eduModule, message: "Module created successfully" } 
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating eduModule:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to create module",
      details: process.env.NODE_ENV === "development" ? error?.message : undefined 
    }, { status: 500 });
  }
}

// PUT - Update eduModule
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return NextResponse.json({ 
        success: false, 
        error: "You must be a member of an organization" 
      }, { status: 400 });
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const { id, name, code, description, color, creditHours, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Module ID is required" }, { status: 400 });
    }

    // Verify eduModule belongs to organization
    const existingModule = await db.eduModule.findFirst({
      where: { id, organizationId },
    });

    if (!existingModule) {
      return NextResponse.json({ success: false, error: "Module not found" }, { status: 404 });
    }

    // Check for duplicate code if changing
    if (code && code !== existingModule.code) {
      const duplicateCode = await db.eduModule.findFirst({
        where: { organizationId, code, id: { not: id } },
      });
      if (duplicateCode) {
        return NextResponse.json({ 
          success: false, 
          error: "Module with this code already exists" 
        }, { status: 400 });
      }
    }

    const eduModule = await db.eduModule.update({
      where: { id },
      data: {
        name,
        code,
        description,
        color,
        creditHours,
        isActive,
      },
    });

    return NextResponse.json({ 
      success: true, 
      data: { eduModule, message: "Module updated successfully" } 
    });
  } catch (error: any) {
    console.error("Error updating eduModule:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to update module" 
    }, { status: 500 });
  }
}

// DELETE - Delete eduModule
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return NextResponse.json({ 
        success: false, 
        error: "You must be a member of an organization" 
      }, { status: 400 });
    }

    const organizationId = membership.organizationId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Module ID is required" }, { status: 400 });
    }

    // Verify eduModule belongs to organization
    const existingModule = await db.eduModule.findFirst({
      where: { id, organizationId },
    });

    if (!existingModule) {
      return NextResponse.json({ success: false, error: "Module not found" }, { status: 404 });
    }

    await db.eduModule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, data: { message: "Module deleted successfully" } });
  } catch (error: any) {
    console.error("Error deleting eduModule:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to delete module" 
    }, { status: 500 });
  }
}
