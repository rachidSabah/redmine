import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/email";

// POST - Send a notification email
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to, subject, html, text, ticketId, projectId, userId } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await sendNotificationEmail(to, subject, html, {
      organizationId: user.organizationId || undefined,
      ticketId,
      projectId,
      userId: userId || user.id,
    });

    if (result.success) {
      return NextResponse.json({ success: true, message: "Email sent successfully" });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
