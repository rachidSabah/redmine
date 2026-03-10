export const runtime = 'edge';
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - List all email configurations
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const configs = await prisma.emailConfiguration.findMany({
      where: user.organizationId
        ? { organizationId: user.organizationId }
        : { organizationId: null },
      orderBy: { createdAt: "desc" },
    });

    // Mask sensitive data
    const maskedConfigs = configs.map((config) => ({
      ...config,
      smtpPassword: config.smtpPassword ? "••••••••" : null,
      brevoApiKey: config.brevoApiKey ? "••••••••" : null,
      sendGridApiKey: config.sendGridApiKey ? "••••••••" : null,
      mailgunApiKey: config.mailgunApiKey ? "••••••••" : null,
      sesSecretAccessKey: config.sesSecretAccessKey ? "••••••••" : null,
      gmailClientSecret: config.gmailClientSecret ? "••••••••" : null,
      gmailRefreshToken: config.gmailRefreshToken ? "••••••••" : null,
    }));

    return NextResponse.json({ configurations: maskedConfigs });
  } catch (error: any) {
    console.error("Error fetching email configurations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new email configuration
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const {
      name,
      provider,
      fromEmail,
      fromName,
      replyTo,
      isActive,
      isDefault,
      // SMTP
      smtpHost,
      smtpPort,
      smtpUsername,
      smtpPassword,
      smtpSecure,
      // POP
      popHost,
      popPort,
      popUsername,
      popPassword,
      popSecure,
      // Brevo
      brevoApiKey,
      // SendGrid
      sendGridApiKey,
      // Mailgun
      mailgunApiKey,
      mailgunDomain,
      // Amazon SES
      sesAccessKeyId,
      sesSecretAccessKey,
      sesRegion,
      // Gmail
      gmailClientId,
      gmailClientSecret,
      gmailRefreshToken,
    } = data;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.emailConfiguration.updateMany({
        where: user.organizationId
          ? { organizationId: user.organizationId }
          : { organizationId: null },
        data: { isDefault: false },
      });
    }

    const config = await prisma.emailConfiguration.create({
      data: {
        organizationId: user.organizationId,
        name,
        provider,
        fromEmail,
        fromName,
        replyTo,
        isActive: isActive ?? true,
        isDefault: isDefault ?? false,
        smtpHost,
        smtpPort: smtpPort ? parseInt(smtpPort) : null,
        smtpUsername,
        smtpPassword,
        smtpSecure: smtpSecure ?? true,
        popHost,
        popPort: popPort ? parseInt(popPort) : null,
        popUsername,
        popPassword,
        popSecure: popSecure ?? true,
        brevoApiKey,
        sendGridApiKey,
        mailgunApiKey,
        mailgunDomain,
        sesAccessKeyId,
        sesSecretAccessKey,
        sesRegion,
        gmailClientId,
        gmailClientSecret,
        gmailRefreshToken,
      },
    });

    return NextResponse.json({ configuration: config });
  } catch (error: any) {
    console.error("Error creating email configuration:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
