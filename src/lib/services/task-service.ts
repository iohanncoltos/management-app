import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export async function listTasksByProject(projectId: string) {
  return prisma.task.findMany({
    where: { projectId },
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
  });
}

export async function createTask(data: Prisma.TaskUncheckedCreateInput) {
  return prisma.task.create({ data });
}

export async function updateTask(taskId: string, data: Prisma.TaskUncheckedUpdateInput) {
  return prisma.task.update({ where: { id: taskId }, data });
}

export async function deleteTask(taskId: string) {
  return prisma.task.delete({ where: { id: taskId } });
}
