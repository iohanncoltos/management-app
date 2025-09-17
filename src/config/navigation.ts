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

import { Role } from "@prisma/client";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
};

export const primaryNav: NavItem[] = [
  { label: "Mission Control", href: "/dashboard", icon: Home, roles: [Role.ADMIN, Role.PM, Role.MEMBER] },
  { label: "Projects", href: "/projects", icon: BriefcaseBusiness, roles: [Role.ADMIN, Role.PM, Role.MEMBER] },
  { label: "Gantt", href: "/projects/gantt", icon: CalendarClock, roles: [Role.ADMIN, Role.PM] },
  { label: "Tasks", href: "/projects/tasks", icon: Layers3, roles: [Role.ADMIN, Role.PM, Role.MEMBER] },
  { label: "Resources", href: "/resources", icon: Users, roles: [Role.ADMIN, Role.PM] },
  { label: "Budget", href: "/projects/budget", icon: BarChart3, roles: [Role.ADMIN, Role.PM] },
  { label: "Files", href: "/projects/files", icon: Archive, roles: [Role.ADMIN, Role.PM, Role.MEMBER] },
  { label: "Comms", href: "/messaging", icon: Inbox, roles: [Role.ADMIN, Role.PM] },
];

export const secondaryNav: NavItem[] = [
  { label: "Alerts", href: "/alerts", icon: AlarmClockCheck, roles: [Role.ADMIN, Role.PM] },
  { label: "Security", href: "/admin/security", icon: ShieldCheck, roles: [Role.ADMIN] },
  { label: "Activity", href: "/admin/audit", icon: Activity, roles: [Role.ADMIN] },
];
