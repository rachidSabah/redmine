import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Get chat channels
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = await prisma.chatChannel.findMany({
      where: user.organizationId
        ? { organizationId: user.organizationId }
        : {},
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Create a default channel if none exist
    if (channels.length === 0 && user.organizationId) {
      const defaultChannel = await prisma.chatChannel.create({
        data: {
          organizationId: user.organizationId,
          name: "General",
          description: "General team discussions",
          type: "public",
        },
        include: {
          _count: {
            select: { members: true },
          },
        },
      });

      return NextResponse.json({ channels: [defaultChannel] });
    }

    return NextResponse.json({ channels });
  } catch (error: any) {
    console.error("Error fetching channels:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
