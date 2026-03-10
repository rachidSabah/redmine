export const runtime = 'edge';
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmailService } from "@/lib/email";

// GET - Get single email configuration
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await prisma.emailConfiguration.findFirst({
      where: {
        id,
        OR: [
          { organizationId: user.organizationId },
          { organizationId: null },
        ],
      },
    });

    if (!config) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    // Mask sensitive data
    const maskedConfig = {
      ...config,
      smtpPassword: config.smtpPassword ? "••••••••" : null,
      brevoApiKey: config.brevoApiKey ? "••••••••" : null,
      sendGridApiKey: config.sendGridApiKey ? "••••••••" : null,
      mailgunApiKey: config.mailgunApiKey ? "••••••••" : null,
      sesSecretAccessKey: config.sesSecretAccessKey ? "••••••••" : null,
      gmailClientSecret: config.gmailClientSecret ? "••••••••" : null,
      gmailRefreshToken: config.gmailRefreshToken ? "••••••••" : null,
    };

    return NextResponse.json({ configuration: maskedConfig });
  } catch (error: any) {
    console.error("Error fetching email configuration:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update email configuration
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // Check if config exists and belongs to user's org
    const existing = await prisma.emailConfiguration.findFirst({
      where: {
        id,
        OR: [
          { organizationId: user.organizationId },
          { organizationId: null },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.emailConfiguration.updateMany({
        where: user.organizationId
          ? { organizationId: user.organizationId }
          : { organizationId: null },
        data: { isDefault: false },
      });
    }

    // Build update data, keeping existing passwords if not changed
    const updateData: any = {
      name: data.name,
      fromEmail: data.fromEmail,
      fromName: data.fromName,
      replyTo: data.replyTo,
      isActive: data.isActive,
      isDefault: data.isDefault,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort ? parseInt(data.smtpPort) : null,
      smtpUsername: data.smtpUsername,
      smtpSecure: data.smtpSecure,
      popHost: data.popHost,
      popPort: data.popPort ? parseInt(data.popPort) : null,
      popUsername: data.popUsername,
      popSecure: data.popSecure,
      sesAccessKeyId: data.sesAccessKeyId,
      sesRegion: data.sesRegion,
      mailgunDomain: data.mailgunDomain,
      gmailClientId: data.gmailClientId,
    };

    // Only update passwords if they're not masked
    if (data.smtpPassword && data.smtpPassword !== "••••••••") {
      updateData.smtpPassword = data.smtpPassword;
    }
    if (data.popPassword && data.popPassword !== "••••••••") {
      updateData.popPassword = data.popPassword;
    }
    if (data.brevoApiKey && data.brevoApiKey !== "••••••••") {
      updateData.brevoApiKey = data.brevoApiKey;
    }
    if (data.sendGridApiKey && data.sendGridApiKey !== "••••••••") {
      updateData.sendGridApiKey = data.sendGridApiKey;
    }
    if (data.mailgunApiKey && data.mailgunApiKey !== "••••••••") {
      updateData.mailgunApiKey = data.mailgunApiKey;
    }
    if (data.sesSecretAccessKey && data.sesSecretAccessKey !== "••••••••") {
      updateData.sesSecretAccessKey = data.sesSecretAccessKey;
    }
    if (data.gmailClientSecret && data.gmailClientSecret !== "••••••••") {
      updateData.gmailClientSecret = data.gmailClientSecret;
    }
    if (data.gmailRefreshToken && data.gmailRefreshToken !== "••••••••") {
      updateData.gmailRefreshToken = data.gmailRefreshToken;
    }

    const config = await prisma.emailConfiguration.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ configuration: config });
  } catch (error: any) {
    console.error("Error updating email configuration:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete email configuration
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if config exists and belongs to user's org
    const existing = await prisma.emailConfiguration.findFirst({
      where: {
        id,
        OR: [
          { organizationId: user.organizationId },
          { organizationId: null },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    await prisma.emailConfiguration.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting email configuration:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
