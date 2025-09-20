import { prisma } from "@/lib/db";

const ASSIGN_TASKS = "ASSIGN_TASKS";

export async function getDashboardMetrics(userId: string, permissions: string[]) {
  const canViewAllTasks = permissions.includes(ASSIGN_TASKS);

  const [projects, tasks, assignments] = await Promise.all([
    prisma.project.count(),
    prisma.task.findMany({
      where: canViewAllTasks ? {} : { assigneeId: userId },
      select: { progress: true, end: true },
    }),
    prisma.assignment.findMany({
      where: canViewAllTasks ? {} : { userId },
      select: { allocationPct: true },
    }),
  ]);

  const overdueTasks = tasks.filter((task) => task.end < new Date() && task.progress < 100).length;
  const completionRate = tasks.length > 0 ? Math.round((tasks.filter((task) => task.progress === 100).length / tasks.length) * 100) : 0;
  const workload = assignments.reduce((total, assignment) => total + assignment.allocationPct, 0);

  const budgetAgg = await prisma.project.aggregate({
    _sum: {
      budgetPlanned: true,
      budgetActual: true,
    },
  });

  const planned = Number(budgetAgg._sum.budgetPlanned ?? 0);
  const actual = Number(budgetAgg._sum.budgetActual ?? 0);
  const budgetVariance = planned ? Number(((actual - planned) / planned) * 100) : 0;

  return {
    totalProjects: projects,
    overdueTasks,
    completionRate,
    workload,
    budgetVariance,
  };
}

export async function getProjectPerformanceSeries() {
  const projects = await prisma.project.findMany({
    select: {
      name: true,
      code: true,
      createdAt: true,
      budgetPlanned: true,
      budgetActual: true,
      tasks: { select: { progress: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return projects.map((project) => ({
    label: project.code,
    planned: Number(project.budgetPlanned),
    actual: Number(project.budgetActual),
    completion: project.tasks.length
      ? Math.round((project.tasks.filter((task) => task.progress === 100).length / project.tasks.length) * 100)
      : 0,
  }));
}

export async function getTaskStatusBreakdown(permissions: string[], userId: string) {
  const canViewAllTasks = permissions.includes(ASSIGN_TASKS);

  const tasks = await prisma.task.findMany({
    where: canViewAllTasks ? {} : { assigneeId: userId },
    select: { progress: true },
  });

  const counts = { planned: 0, executing: 0, blocked: 0, complete: 0 };

  tasks.forEach((task) => {
    if (task.progress === 100) counts.complete += 1;
    else if (task.progress >= 50) counts.executing += 1;
    else if (task.progress === 0) counts.planned += 1;
    else counts.blocked += 1;
  });

  return counts;
}

export async function getUpcomingTasks(permissions: string[], userId: string, take = 6) {
  const canViewAllTasks = permissions.includes(ASSIGN_TASKS);

  return prisma.task.findMany({
    where: canViewAllTasks ? {} : { assigneeId: userId },
    orderBy: { end: "asc" },
    take,
    include: {
      project: { select: { id: true, name: true, code: true } },
    },
  });
}
