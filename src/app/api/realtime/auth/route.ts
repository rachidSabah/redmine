export const runtime = 'edge';
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";
import { pusherService } from "@/lib/pusher";

// POST - Authenticate for real-time channels
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { memberships: { take: 1 } },
    });

    if (!user) {
      return ApiErrors.forbidden();
    }

    const body = await request.json();
    const { socket_id, channel_name } = body;

    if (!socket_id || !channel_name) {
      return ApiErrors.badRequest("socket_id and channel_name are required");
    }

    // Validate channel access
    const membership = user.memberships[0];
    const orgId = membership?.organizationId;

    // Check if user has access to the channel
    let authorized = false;

    if (channel_name.startsWith("private-org-")) {
      const channelOrgId = channel_name.replace("private-org-", "");
      authorized = channelOrgId === orgId;
    } else if (channel_name.startsWith("private-project-")) {
      const projectId = channel_name.replace("private-project-", "");
      // Check if user is a member of the project
      const projectMember = await db.projectMember.findFirst({
        where: { projectId, userId: user.id },
      });
      authorized = !!projectMember;
    } else if (channel_name.startsWith("private-user-")) {
      const channelUserId = channel_name.replace("private-user-", "");
      authorized = channelUserId === user.id;
    } else if (channel_name.startsWith("private-ticket-")) {
      const ticketId = channel_name.replace("private-ticket-", "");
      // Check if user has access to the ticket
      const ticket = await db.ticket.findFirst({
        where: { id: ticketId, deletedAt: null },
        include: { project: { include: { members: true } } },
      });
      authorized = !!ticket?.project.members.some(m => m.userId === user.id);
    } else if (channel_name.startsWith("presence-")) {
      // Presence channels require org membership
      authorized = !!orgId;
    } else {
      // Public channels
      authorized = true;
    }

    if (!authorized) {
      return ApiErrors.forbidden("Not authorized for this channel");
    }

    // Generate authentication signature
    const auth = await pusherService.authenticate(
      socket_id,
      channel_name,
      user.id,
      {
        name: user.name,
        email: user.email,
        role: membership?.role || "MEMBER",
      }
    );

    if (!auth) {
      return ApiErrors.internal("Failed to generate auth signature");
    }

    return apiSuccess({ auth });
  } catch (error) {
    console.error("Realtime auth error:", error);
    return ApiErrors.internal("Authentication failed", error);
  }
}
