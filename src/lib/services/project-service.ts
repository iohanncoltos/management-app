import { Prisma, ProjectStatus, Role } from "@prisma/client";

import { prisma } from "@/lib/db";

export async function listProjectsForUser(userId: string, role: Role) {
  const where = role === Role.MEMBER ? { tasks: { some: { assigneeId: userId } } } : {};

  const projects = await prisma.project.findMany({
    where,
    include: {
      _count: { select: { tasks: true, files: true } },
      tasks: {
        select: {
          id: true,
          progress: true,
          end: true,
          assigneeId: true,
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
      budgetPlanned: project.budgetPlanned,
      budgetActual: project.budgetActual,
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
  startDate: Date;
  endDate?: Date | null;
  budgetPlanned: Prisma.Decimal | number;
  budgetActual?: Prisma.Decimal | number;
  createdById: string;
}) {
  return prisma.project.create({
    data: {
      ...data,
      status: data.status ?? ProjectStatus.PLANNING,
      budgetActual: data.budgetActual ?? new Prisma.Decimal(0),
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
