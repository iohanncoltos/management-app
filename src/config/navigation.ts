import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlarmClockCheck,
  Archive,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  Home,
  Inbox,
  Layers3,
  ShieldCheck,
  Users,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permissions?: string[];
  requiresAllPermissions?: boolean;
};

export const primaryNav: NavItem[] = [
  { label: "Mission Control", href: "/dashboard", icon: Home },
  { label: "My Tasks", href: "/tasks", icon: Layers3 },
  { label: "Projects", href: "/projects", icon: BriefcaseBusiness, permissions: ["VIEW_PROJECT"] },
  { label: "Gantt", href: "/projects/gantt", icon: CalendarClock, permissions: ["ASSIGN_TASKS"] },
  { label: "Resources", href: "/resources", icon: Users, permissions: ["ASSIGN_TASKS"] },
  { label: "Budget", href: "/projects/budget", icon: BarChart3, permissions: ["VIEW_REPORTS"] },
  { label: "Files", href: "/projects/files", icon: Archive, permissions: ["VIEW_PROJECT"] },
  { label: "Comms", href: "/messaging", icon: Inbox, permissions: ["ASSIGN_TASKS"] },
];

export const secondaryNav: NavItem[] = [
  { label: "Alerts", href: "/alerts", icon: AlarmClockCheck, permissions: ["ASSIGN_TASKS"] },
  { label: "Task Manager", href: "/admin/tasks", icon: Layers3, permissions: ["ASSIGN_TASKS"], requiresAllPermissions: true },
  { label: "Users", href: "/admin/users", icon: Users, permissions: ["MANAGE_USERS"], requiresAllPermissions: true },
  { label: "Roles", href: "/admin/roles", icon: ShieldCheck, permissions: ["MANAGE_USERS"], requiresAllPermissions: true },
  { label: "Activity", href: "/admin/audit", icon: Activity, permissions: ["MANAGE_USERS"], requiresAllPermissions: true },
];
