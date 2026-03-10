import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api-response";

// GET - Export data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return ApiErrors.unauthorized();
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { memberships: { where: { isActive: true }, take: 1 } },
    });

    if (!user || !user.memberships[0]) {
      return ApiErrors.forbidden();
    }

    const membership = user.memberships[0];
    const organizationId = membership.organizationId;
    const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const format = searchParams.get("format") || "json";

    const exportData: Record<string, any> = {
      exportedAt: new Date().toISOString(),
      exportedBy: { id: user.id, name: user.name, email: user.email },
      organizationId,
    };

    // Export tickets
    if (type === "all" || type === "tickets") {
      const tickets = await db.ticket.findMany({
        where: { 
          project: { organizationId },
          deletedAt: null,
        },
        include: {
          project: { select: { id: true, name: true, key: true } },
          assignee: { select: { id: true, name: true, email: true } },
          reporter: { select: { id: true, name: true, email: true } },
          milestone: { select: { id: true, name: true } },
          sprint: { select: { id: true, name: true } },
          timeLogs: { select: { id: true, hours: true, description: true, loggedAt: true } },
          comments: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      exportData.tickets = tickets;
    }

    // Export projects
    if (type === "all" || type === "projects") {
      const projects = await db.project.findMany({
        where: { organizationId, deletedAt: null },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          milestones: { select: { id: true, name: true, isCompleted: true } },
          _count: { select: { tickets: { where: { deletedAt: null } } } },
        },
        orderBy: { createdAt: "desc" },
      });
      exportData.projects = projects;
    }

    // Export users (admin only)
    if ((type === "all" || type === "users") && isAdmin) {
      const users = await db.user.findMany({
        where: {
          memberships: { some: { organizationId } },
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          memberships: {
            where: { organizationId },
            select: { role: true, joinedAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      exportData.users = users;
    }

    // Export wiki pages
    if (type === "all" || type === "wiki") {
      const wikiPages = await db.wikiPage.findMany({
        where: { organizationId, deletedAt: null },
        include: {
          author: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          versions: {
            select: { id: true, version: true, changeSummary: true, createdAt: true },
            orderBy: { version: "desc" },
            take: 10,
          },
        },
        orderBy: { updatedAt: "desc" },
      });
      exportData.wikiPages = wikiPages;
    }

    // Export activities
    if (type === "all" || type === "activities") {
      const activities = await db.activity.findMany({
        where: { organizationId },
        include: {
          user: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
      exportData.activities = activities;
    }

    // Export time logs
    if (type === "all" || type === "timelogs") {
      const timeLogs = await db.timeLog.findMany({
        where: {
          ticket: { project: { organizationId } },
        },
        include: {
          user: { select: { id: true, name: true } },
          ticket: { select: { id: true, key: true, title: true } },
        },
        orderBy: { loggedAt: "desc" },
        take: 1000,
      });
      exportData.timeLogs = timeLogs;
    }

    // Return based on format
    if (format === "csv") {
      // Convert to CSV format
      const csvData = convertToCSV(exportData, type);
      return new Response(csvData, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="synchropm-export-${type}-${Date.now()}.csv"`,
        },
      });
    }

    // Default JSON format
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="synchropm-export-${type}-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return ApiErrors.internal("Failed to export data", error);
  }
}

function convertToCSV(data: Record<string, any>, type: string): string {
  // Simple CSV conversion for primary data type
  const targetData = data[type] || data.tickets || data.projects || [];
  
  if (!Array.isArray(targetData) || targetData.length === 0) {
    return "No data to export";
  }

  // Flatten objects for CSV
  const flattened = targetData.map(item => flattenObject(item));
  
  // Get all headers
  const headers = new Set<string>();
  flattened.forEach(item => Object.keys(item).forEach(key => headers.add(key)));
  const headerArray = Array.from(headers);

  // Build CSV
  const rows = [headerArray.join(",")];
  flattened.forEach(item => {
    const row = headerArray.map(header => {
      const value = item[header];
      if (value === null || value === undefined) return "";
      if (typeof value === "string" && value.includes(",")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    });
    rows.push(row.join(","));
  });

  return rows.join("\n");
}

function flattenObject(obj: any, prefix = ""): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (obj[key] === null || obj[key] === undefined) {
      result[newKey] = "";
    } else if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], newKey));
    } else if (Array.isArray(obj[key])) {
      result[newKey] = JSON.stringify(obj[key]);
    } else {
      result[newKey] = obj[key];
    }
  }

  return result;
}
