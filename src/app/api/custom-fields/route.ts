import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET - List custom fields
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId");

    // Get user's organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return NextResponse.json({ customFields: [] });
    }

    const customFields = await prisma.customField.findMany({
      where: { organizationId: membership.organizationId },
      include: {
        values: ticketId ? { where: { ticketId } } : false,
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ customFields });
  } catch (error) {
    console.error("Error fetching custom fields:", error);
    return NextResponse.json({ error: "Failed to fetch custom fields" }, { status: 500 });
  }
}

// POST - Create custom field
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, type, options, required, applyToTickets, applyToProjects } = body;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const key = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    // Get max order
    const maxOrder = await prisma.customField.findFirst({
      where: { organizationId: membership.organizationId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const customField = await prisma.customField.create({
      data: {
        organizationId: membership.organizationId,
        name,
        key,
        type: type || "text",
        options: options ? JSON.parse(JSON.stringify(options)) : null,
        required: required || false,
        applyToTickets: applyToTickets !== false,
        applyToProjects: applyToProjects || false,
        order: (maxOrder?.order || 0) + 1,
      },
    });

    return NextResponse.json({ customField }, { status: 201 });
  } catch (error) {
    console.error("Error creating custom field:", error);
    return NextResponse.json({ error: "Failed to create custom field" }, { status: 500 });
  }
}

// PUT - Update custom field
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Custom field ID required" }, { status: 400 });
    }

    const customField = await prisma.customField.update({
      where: { id },
      data,
    });

    return NextResponse.json({ customField });
  } catch (error) {
    console.error("Error updating custom field:", error);
    return NextResponse.json({ error: "Failed to update custom field" }, { status: 500 });
  }
}

// DELETE - Delete custom field
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Custom field ID required" }, { status: 400 });
    }

    await prisma.customFieldValue.deleteMany({ where: { customFieldId: id } });
    await prisma.customField.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting custom field:", error);
    return NextResponse.json({ error: "Failed to delete custom field" }, { status: 500 });
  }
}
