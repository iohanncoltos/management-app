import { TaskPriority, TaskStatus } from "@prisma/client";
import { addDays, endOfDay, formatISO, startOfDay } from "date-fns";

import { prisma } from "@/lib/db";

const ASSIGN_TASKS = "ASSIGN_TASKS";
const VIEW_PROJECT = "VIEW_PROJECT";
const MANAGE_USERS = "MANAGE_USERS";
const CREATE_PROJECT = "CREATE_PROJECT";

export type HomeOverviewData = {
  calendar: Array<{ date: string; count: number }>;
  urgentTasks: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    dueLabel: string;
    priority: TaskPriority;
    project?: { id: string; name: string; code: string | null } | null;
  }>;
  projects: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    members: Array<{ id: string; name: string | null; email: string; initials: string }>;
  }>;
  team: Array<{ id: string; name: string | null; email: string; role: string | null; initials: string }>;
  quickLinks: Array<{ label: string; href: string }>;
};

function getInitials(name?: string | null) {
  if (!name) return "--";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
    .padEnd(2, " ");
}

function priorityWeight(priority: TaskPriority) {
  switch (priority) {
    case TaskPriority.CRITICAL:
      return 4;
    case TaskPriority.HIGH:
      return 3;
    case TaskPriority.MEDIUM:
      return 2;
    default:
      return 1;
  }
}

function formatDueLabel(due: Date | null) {
  if (!due) return "No due date";
  const today = startOfDay(new Date());
  const dueDay = startOfDay(due);
  const diff = (dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

  if (diff < 0) return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export async function getHomeOverview(userId: string, permissions: string[]): Promise<HomeOverviewData> {
  const canViewAllTasks = permissions.includes(ASSIGN_TASKS);
  const canViewAllProjects = permissions.some((permission) =>
    [CREATE_PROJECT, MANAGE_USERS, VIEW_PROJECT].includes(permission),
  );

  const now = new Date();
  const upcomingLimit = endOfDay(addDays(now, 7));
  const calendarLimit = endOfDay(addDays(now, 30));

  // Calendar and urgent tasks should always be user-specific
  const userTaskScope = { assigneeId: userId };

  // Only urgent tasks list respects "view all" permission
  const urgentTaskScope = canViewAllTasks ? {} : { assigneeId: userId };

  const [rawUrgentTasks, calendarTasks, projectSummaries] = await Promise.all([
    prisma.task.findMany({
      where: {
        ...urgentTaskScope,
        status: { not: TaskStatus.COMPLETED },
        end: { lte: upcomingLimit },
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ end: "asc" }, { updatedAt: "desc" }],
      take: 8,
    }),
    prisma.task.findMany({
      where: {
        ...userTaskScope,
        end: { gte: startOfDay(now), lte: calendarLimit },
      },
      select: { end: true },
    }),
    prisma.project.findMany({
      where: canViewAllProjects
        ? undefined
        : {
            memberships: { some: { userId } },
          },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        memberships: {
          take: 4,
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const uniqueMemberMap = new Map<string, { id: string; name: string | null; email: string; role: string | null }>();
  projectSummaries.forEach((project) => {
    project.memberships.forEach((membership) => {
      const member = membership.user;
      if (!member || member.id === userId) return;
      if (!uniqueMemberMap.has(member.id)) {
        uniqueMemberMap.set(member.id, {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role?.name ?? null,
        });
      }
    });
  });

  const calendarAggregation = new Map<string, number>();
  calendarTasks.forEach((task) => {
    if (!task.end) return;
    const key = formatISO(task.end, { representation: "date" });
    calendarAggregation.set(key, (calendarAggregation.get(key) ?? 0) + 1);
  });

  const urgentTasks = rawUrgentTasks
    .sort((a, b) => {
      const weightDelta = priorityWeight(b.priority) - priorityWeight(a.priority);
      if (weightDelta !== 0) return weightDelta;
      const aTime = a.end ? new Date(a.end).getTime() : Infinity;
      const bTime = b.end ? new Date(b.end).getTime() : Infinity;
      return aTime - bTime;
    })
    .slice(0, 4)
    .map((task) => ({
      id: task.id,
      title: task.title,
      dueDate: task.end ? new Date(task.end).toISOString() : null,
      dueLabel: formatDueLabel(task.end ? new Date(task.end) : null),
      priority: task.priority,
      project: task.project
        ? { id: task.project.id, name: task.project.name, code: task.project.code }
        : null,
    }));

  const projects = projectSummaries.map((project) => ({
    id: project.id,
    name: project.name,
    code: project.code,
    status: project.status,
    members: project.memberships
      .map((membership) => membership.user)
      .filter((user): user is NonNullable<typeof user> => Boolean(user))
      .map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        initials: getInitials(member.name),
      })),
  }));

  const team = Array.from(uniqueMemberMap.values())
    .slice(0, 6)
    .map((member) => ({
      ...member,
      initials: getInitials(member.name),
    }));

  const quickLinks = [
    { label: "View tasks", href: "/tasks" },
    { label: "New project", href: "/projects/new" },
    { label: "Upload file", href: "/projects/files" },
    { label: "Mission Control", href: "/dashboard" },
  ];

  return {
    calendar: Array.from(calendarAggregation.entries()).map(([date, count]) => ({ date, count })),
    urgentTasks,
    projects,
    team,
    quickLinks,
  };
}
