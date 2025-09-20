import { Prisma, ProjectStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

export async function listProjectsForUser(userId: string, permissions: string[]) {
  const canViewAll = permissions.includes("CREATE_PROJECT") || permissions.includes("MANAGE_USERS");

  const projects = await prisma.project.findMany({
    where: canViewAll
      ? undefined
      : {
          memberships: {
            some: { userId },
          },
        },
    include: {
      _count: { select: { tasks: true, files: true } },
      tasks: {
        select: {
          id: true,
          progress: true,
          end: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return projects.map((project) => {
    const overdueTasks = project.tasks.filter((task) => task.end < new Date() && task.progress < 100).length;
    const complete = project.tasks.filter((task) => task.progress === 100).length;

    return {
      id: project.id,
      name: project.name,
      code: project.code,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      budgetPlanned: project.budgetPlanned ?? new Prisma.Decimal(0),
      budgetActual: project.budgetActual ?? new Prisma.Decimal(0),
      tasksTotal: project.tasks.length,
      tasksComplete: complete,
      tasksOverdue: overdueTasks,
      filesCount: project._count.files,
    };
  });
}

export async function createProject(data: {
  name: string;
  code: string;
  status?: ProjectStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  createdById: string;
  memberUserIds?: string[];
}) {
  const members = data.memberUserIds?.length
    ? await prisma.user.findMany({ where: { id: { in: data.memberUserIds } }, select: { id: true } })
    : [];

  return prisma.project.create({
    data: {
      code: data.code,
      name: data.name,
      status: data.status ?? ProjectStatus.PLANNING,
      startDate: data.startDate ?? undefined,
      endDate: data.endDate ?? undefined,
      createdById: data.createdById,
      memberships: {
        create: members.map(({ id }) => ({ userId: id })),
      },
    },
  });
}

export async function getProjectById(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          assignments: {
            select: {
              user: { select: { id: true, name: true } },
              allocationPct: true,
            },
          },
        },
        orderBy: { start: "asc" },
      },
      files: {
        include: {
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      memberships: true,
    },
  });
}

export async function updateProject(projectId: string, data: Partial<Prisma.ProjectUpdateInput>) {
  return prisma.project.update({
    where: { id: projectId },
    data,
  });
}

export async function deleteProject(projectId: string) {
  return prisma.project.delete({ where: { id: projectId } });
}

export async function listProjectSummaries() {
  return prisma.project.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}
