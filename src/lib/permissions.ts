import { UserRole } from "@prisma/client";

export const PERMISSIONS = {
  // Organization permissions
  ORG_OWNER: ["org.delete", "org.settings", "org.billing", "org.members.manage"],
  ORG_ADMIN: ["org.settings", "org.members.manage", "org.members.invite"],
  ORG_MANAGER: ["org.members.view"],
  
  // Project permissions
  PROJECT_CREATE: "project.create",
  PROJECT_DELETE: "project.delete",
  PROJECT_SETTINGS: "project.settings",
  PROJECT_MEMBERS_MANAGE: "project.members.manage",
  
  // Ticket permissions
  TICKET_CREATE: "ticket.create",
  TICKET_EDIT: "ticket.edit",
  TICKET_DELETE: "ticket.delete",
  TICKET_ASSIGN: "ticket.assign",
  
  // Time tracking
  TIME_LOG_CREATE: "time.log.create",
  TIME_LOG_APPROVE: "time.log.approve",
  
  // Admin
  ADMIN_ACCESS: "admin.access",
} as const;

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  OWNER: Object.values(PERMISSIONS).flat(),
  ADMIN: [
    "org.settings",
    "org.members.manage",
    "org.members.invite",
    "project.create",
    "project.delete",
    "project.settings",
    "project.members.manage",
    "ticket.create",
    "ticket.edit",
    "ticket.delete",
    "ticket.assign",
    "time.log.create",
    "time.log.approve",
    "admin.access",
  ],
  MANAGER: [
    "org.members.view",
    "project.create",
    "project.settings",
    "project.members.manage",
    "ticket.create",
    "ticket.edit",
    "ticket.delete",
    "ticket.assign",
    "time.log.create",
    "time.log.approve",
  ],
  MEMBER: [
    "ticket.create",
    "ticket.edit",
    "time.log.create",
  ],
  GUEST: [
    "ticket.view",
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function hasAnyPermission(role: UserRole, permissions: string[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return permissions.some(p => rolePermissions.includes(p));
}

export function canManageRole(actorRole: UserRole, targetRole: UserRole): boolean {
  const roleHierarchy: UserRole[] = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "GUEST"];
  const actorIndex = roleHierarchy.indexOf(actorRole);
  const targetIndex = roleHierarchy.indexOf(targetRole);
  return actorIndex < targetIndex;
}

export function getHighestRole(roles: UserRole[]): UserRole {
  const roleHierarchy: UserRole[] = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "GUEST"];
  for (const role of roleHierarchy) {
    if (roles.includes(role)) return role;
  }
  return "GUEST";
}
