export const SYSTEM_ROLE_NAMES = [
  "ADMIN",
  "PROJECT_MANAGER",
  "MECHANICAL_ENGINEER",
  "ELECTRICAL_ENGINEER",
  "SYSTEM_ENGINEER",
] as const;

export type SystemRoleName = typeof SYSTEM_ROLE_NAMES[number];
export type RoleName = string;

export const ADMIN_ROLE_NAME = "ADMIN" as const;
export const DEFAULT_USER_ROLE_NAME = "SYSTEM_ENGINEER" as const;

export const PERMISSION_ACTIONS = [
  "MANAGE_USERS",
  "CREATE_PROJECT",
  "VIEW_PROJECT",
  "ASSIGN_TASKS",
  "VIEW_REPORTS",
] as const;

export type PermissionAction = typeof PERMISSION_ACTIONS[number];

export const PERMISSION_LABELS: Record<PermissionAction, string> = {
  MANAGE_USERS: "Manage users",
  CREATE_PROJECT: "Create projects",
  VIEW_PROJECT: "View projects",
  ASSIGN_TASKS: "Assign tasks",
  VIEW_REPORTS: "View reports",
};

export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRoleName, PermissionAction[]> = {
  ADMIN: [
    "MANAGE_USERS",
    "CREATE_PROJECT",
    "VIEW_PROJECT",
    "ASSIGN_TASKS",
    "VIEW_REPORTS",
  ],
  PROJECT_MANAGER: ["CREATE_PROJECT", "VIEW_PROJECT", "ASSIGN_TASKS", "VIEW_REPORTS"],
  MECHANICAL_ENGINEER: ["VIEW_PROJECT", "VIEW_REPORTS"],
  ELECTRICAL_ENGINEER: ["VIEW_PROJECT", "VIEW_REPORTS"],
  SYSTEM_ENGINEER: ["VIEW_PROJECT", "VIEW_REPORTS"],
};

export function isSystemRole(name?: string | null): boolean {
  return !!name && SYSTEM_ROLE_NAMES.includes(name as SystemRoleName);
}

export function isAdminRole(name?: string | null): boolean {
  return name === ADMIN_ROLE_NAME;
}

export const PERMISSION_OPTIONS = PERMISSION_ACTIONS.map((action) => ({
  value: action,
  label: PERMISSION_LABELS[action],
}));
