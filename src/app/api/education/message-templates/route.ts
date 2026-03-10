export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, ApiErrors } from "@/lib/api-response";

// GET - List message templates
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiErrors.unauthorized();
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return apiSuccess({ templates: [] });
    }

    const organizationId = membership.organizationId;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: any = {
      organizationId,
    };

    if (category) {
      where.category = category;
    }

    if (activeOnly) {
      where.isActive = true;
    }

    const templates = await db.messageTemplate.findMany({
      where,
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
    });

    return apiSuccess({ templates });
  } catch (error) {
    console.error("Error fetching message templates:", error);
    return ApiErrors.internal("Failed to fetch message templates", error);
  }
}

// POST - Create message template
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiErrors.unauthorized();
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return ApiErrors.forbidden("You must be a member of an organization");
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const {
      name,
      category,
      subject,
      body: templateBody,
      variables,
      whatsappTemplateId,
      approvalStatus,
      isDefault,
    } = body;

    if (!name || !category || !templateBody) {
      return ApiErrors.badRequest("Name, category, and body are required");
    }

    // Check if template name already exists
    const existingTemplate = await db.messageTemplate.findFirst({
      where: {
        organizationId,
        name,
      },
    });

    if (existingTemplate) {
      return ApiErrors.badRequest("Template name already exists");
    }

    // Extract variables from body (find all {{variable}} patterns)
    const extractedVariables = templateBody.match(/\{\{(\w+)\}\}/g)?.map(
      (v: string) => v.replace(/\{\{|\}\}/g, "")
    ) || [];

    const template = await db.messageTemplate.create({
      data: {
        organizationId,
        name,
        category,
        subject,
        body: templateBody,
        variables: variables || extractedVariables,
        whatsappTemplateId,
        approvalStatus: approvalStatus || "pending",
        isDefault: isDefault || false,
        isActive: true,
        createdBy: user.id,
      },
    });

    return apiSuccess({ template, message: "Template created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating message template:", error);
    return ApiErrors.internal("Failed to create message template", error);
  }
}

// PUT - Update message template
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiErrors.unauthorized();
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return ApiErrors.forbidden("You must be a member of an organization");
    }

    const organizationId = membership.organizationId;

    const body = await request.json();
    const {
      id,
      name,
      category,
      subject,
      body: templateBody,
      variables,
      isActive,
      isDefault,
      whatsappTemplateId,
      approvalStatus,
    } = body;

    if (!id) {
      return ApiErrors.badRequest("Template ID is required");
    }

    // Verify template belongs to organization
    const existingTemplate = await db.messageTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!existingTemplate) {
      return ApiErrors.notFound("Template not found");
    }

    // Extract variables from body if body is updated
    let extractedVariables = variables;
    if (templateBody && !variables) {
      extractedVariables = templateBody.match(/\{\{(\w+)\}\}/g)?.map(
        (v: string) => v.replace(/\{\{|\}\}/g, "")
      ) || [];
    }

    const template = await db.messageTemplate.update({
      where: { id },
      data: {
        name,
        category,
        subject,
        body: templateBody,
        variables: extractedVariables,
        isActive,
        isDefault,
        whatsappTemplateId,
        approvalStatus,
      },
    });

    return apiSuccess({ template, message: "Template updated successfully" });
  } catch (error) {
    console.error("Error updating message template:", error);
    return ApiErrors.internal("Failed to update message template", error);
  }
}

// DELETE - Delete message template
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return ApiErrors.unauthorized();
    }

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, isActive: true },
    });

    if (!membership) {
      return ApiErrors.forbidden("You must be a member of an organization");
    }

    const organizationId = membership.organizationId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return ApiErrors.badRequest("Template ID is required");
    }

    // Verify template belongs to organization
    const existingTemplate = await db.messageTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!existingTemplate) {
      return ApiErrors.notFound("Template not found");
    }

    await db.messageTemplate.delete({
      where: { id },
    });

    return apiSuccess({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting message template:", error);
    return ApiErrors.internal("Failed to delete message template", error);
  }
}
