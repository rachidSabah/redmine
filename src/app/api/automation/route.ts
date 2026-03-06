import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

// GET - List automation rules
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return NextResponse.json({ rules: [] });
    }

    const where: any = { organizationId: membership.organizationId };
    if (projectId) {
      where.OR = [{ projectId }, { projectId: null }];
    }

    const rules = await prisma.automationRule.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Error fetching automation rules:", error);
    return NextResponse.json({ error: "Failed to fetch automation rules" }, { status: 500 });
  }
}

// POST - Create automation rule
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, description, projectId, triggerType, triggerConfig, conditions, actionType, actionConfig } = body;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    if (!hasPermission(membership.role, "project.settings")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const rule = await prisma.automationRule.create({
      data: {
        organizationId: membership.organizationId,
        name,
        description,
        projectId,
        triggerType,
        triggerConfig: triggerConfig ? JSON.parse(JSON.stringify(triggerConfig)) : null,
        conditions: conditions ? JSON.parse(JSON.stringify(conditions)) : null,
        actionType,
        actionConfig: actionConfig ? JSON.parse(JSON.stringify(actionConfig)) : null,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error("Error creating automation rule:", error);
    return NextResponse.json({ error: "Failed to create automation rule" }, { status: 500 });
  }
}

// PUT - Update automation rule
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
    }

    const rule = await prisma.automationRule.update({
      where: { id },
      data,
    });

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("Error updating automation rule:", error);
    return NextResponse.json({ error: "Failed to update automation rule" }, { status: 500 });
  }
}

// DELETE - Delete automation rule
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Rule ID required" }, { status: 400 });
    }

    await prisma.automationRule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting automation rule:", error);
    return NextResponse.json({ error: "Failed to delete automation rule" }, { status: 500 });
  }
}
