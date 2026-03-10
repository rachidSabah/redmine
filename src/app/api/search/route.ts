import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// Global Search API - Search across all entities
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: { take: 1 },
      },
    });

    if (!user) {
      return ApiErrors.forbidden();
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const types = searchParams.get("types")?.split(",") || ["tickets", "projects", "wiki", "users"];
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!query.trim()) {
      return apiSuccess({ results: {} });
    }

    const membership = user.memberships[0];
    const organizationId = membership?.organizationId;

    const results: any = {};

    // Search Tickets
    if (types.includes("tickets") && organizationId) {
      const tickets = await db.ticket.findMany({
        where: {
          deletedAt: null,
          project: { organizationId },
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { key: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: limit,
        select: {
          id: true,
          key: true,
          title: true,
          status: true,
          priority: true,
          type: true,
          projectId: true,
          project: { select: { id: true, name: true, key: true } },
          assignee: { select: { id: true, name: true, image: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
      results.tickets = tickets;
    }

    // Search Projects
    if (types.includes("projects") && organizationId) {
      const projects = await db.project.findMany({
        where: {
          deletedAt: null,
          organizationId,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { key: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: limit,
        select: {
          id: true,
          name: true,
          key: true,
          description: true,
          status: true,
          color: true,
          icon: true,
          progress: true,
          _count: { select: { tickets: { where: { deletedAt: null } } } },
        },
        orderBy: { updatedAt: "desc" },
      });
      results.projects = projects;
    }

    // Search Wiki Pages
    if (types.includes("wiki") && organizationId) {
      const wikiPages = await db.wikiPage.findMany({
        where: {
          deletedAt: null,
          organizationId,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
          ],
        },
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          projectId: true,
          project: { select: { id: true, name: true } },
          author: { select: { id: true, name: true } },
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      });
      results.wiki = wikiPages;
    }

    // Search Users (in same organization)
    if (types.includes("users") && organizationId) {
      const users = await db.user.findMany({
        where: {
          memberships: { some: { organizationId } },
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          memberships: {
            where: { organizationId },
            select: { role: true },
          },
        },
      });
      results.users = users.map((u: any) => ({
        ...u,
        role: u.memberships[0]?.role || "MEMBER",
        memberships: undefined,
      }));
    }

    // Search Comments
    if (types.includes("comments") && organizationId) {
      const comments = await db.comment.findMany({
        where: {
          content: { contains: query, mode: "insensitive" },
          ticket: {
            project: { organizationId },
            deletedAt: null,
          },
        },
        take: limit,
        select: {
          id: true,
          content: true,
          createdAt: true,
          ticket: {
            select: { id: true, key: true, title: true },
          },
          user: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      results.comments = comments;
    }

    // Search Milestones
    if (types.includes("milestones") && organizationId) {
      const milestones = await db.milestone.findMany({
        where: {
          project: { organizationId, deletedAt: null },
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          endDate: true,
          isCompleted: true,
          project: { select: { id: true, name: true, key: true } },
        },
        orderBy: { endDate: "asc" },
      });
      results.milestones = milestones;
    }

    // Calculate total results
    const total = Object.values(results).reduce(
      (sum: number, arr: any) => sum + arr.length,
      0
    );

    return apiSuccess({ results, total, query });
  } catch (error) {
    console.error("Search error:", error);
    return ApiErrors.internal("Search failed", error);
  }
}
