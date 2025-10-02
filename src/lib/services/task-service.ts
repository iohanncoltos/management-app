import { Prisma, TaskPriority, TaskStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { sendTaskAssignmentEmail } from "@/lib/mail";
import { TaskFilters, TaskSort } from "@/lib/types/tasks";

const taskInclude = {
  assignee: {
    select: {
      id: true,
      name: true,
      email: true,
      role: { select: { name: true } },
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  project: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  assignments: {
    select: {
      user: { select: { id: true, name: true } },
      allocationPct: true,
    },
  },
  parent: {
    select: {
      id: true,
      title: true,
    },
  },
  subtasks: {
    select: {
      id: true,
      title: true,
      status: true,
      progress: true,
    },
  },
} satisfies Prisma.TaskInclude;

export async function listTasksByProject(projectId: string) {
  return prisma.task.findMany({
    where: { projectId },
    include: taskInclude,
    orderBy: { start: "asc" },
  });
}

export async function listTasksForUser(userId: string, filters?: TaskFilters, sort?: TaskSort) {
  const where: Prisma.TaskWhereInput = {
    assigneeId: userId,
  };

  if (filters) {
    if (filters.status?.length) {
      where.status = { in: filters.status };
    }
    if (filters.priority?.length) {
      where.priority = { in: filters.priority };
    }
    if (filters.category?.length) {
      where.category = { in: filters.category };
    }
    if (filters.projectId) {
      where.projectId = filters.projectId;
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters.dueSoon) {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      where.end = { lte: sevenDaysFromNow };
      where.status = { not: TaskStatus.COMPLETED };
    }
    if (filters.overdue) {
      where.end = { lt: new Date() };
      where.status = { not: TaskStatus.COMPLETED };
    }
  }

  const orderBy: Prisma.TaskOrderByWithRelationInput = sort
    ? { [sort.field]: sort.order }
    : { createdAt: "desc" };

  return prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy,
  });
}

export async function listAllTasks(filters?: TaskFilters, sort?: TaskSort) {
  const where: Prisma.TaskWhereInput = {};

  if (filters) {
    if (filters.status?.length) {
      where.status = { in: filters.status };
    }
    if (filters.priority?.length) {
      where.priority = { in: filters.priority };
    }
    if (filters.category?.length) {
      where.category = { in: filters.category };
    }
    if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }
    if (filters.projectId) {
      where.projectId = filters.projectId;
    }
    if (filters.createdById) {
      where.createdById = filters.createdById;
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters.dueSoon) {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      where.end = { lte: sevenDaysFromNow };
      where.status = { not: TaskStatus.COMPLETED };
    }
    if (filters.overdue) {
      where.end = { lt: new Date() };
      where.status = { not: TaskStatus.COMPLETED };
    }
  }

  const orderBy: Prisma.TaskOrderByWithRelationInput = sort
    ? { [sort.field]: sort.order }
    : { createdAt: "desc" };

  return prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy,
  });
}

export async function getTaskById(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: taskInclude,
  });
}

export async function createTask(data: Prisma.TaskUncheckedCreateInput) {
  const task = await prisma.task.create({
    data,
    include: taskInclude,
  });

  // Send email notification if task is assigned to a user
  if (task.assigneeId && task.assignee?.email) {
    try {
      await sendTaskAssignmentEmail({
        to: task.assignee.email,
        taskTitle: task.title,
        start: task.start,
        end: task.end,
        description: task.description,
        projectName: task.project?.name,
        assignerName: task.createdBy?.name,
        taskId: task.id,
      });
    } catch (error) {
      console.error("Failed to send task assignment email:", error);
      // Don't throw - task creation should succeed even if email fails
    }
  }

  return task;
}

export async function updateTask(taskId: string, data: Prisma.TaskUncheckedUpdateInput) {
  // Get the existing task to check if assignee is changing
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    select: { assigneeId: true },
  });

  const task = await prisma.task.update({
    where: { id: taskId },
    data,
    include: taskInclude,
  });

  // Send email notification if assignee is being changed or newly assigned
  const assigneeChanged = existingTask && existingTask.assigneeId !== task.assigneeId;
  const newlyAssigned = !existingTask?.assigneeId && task.assigneeId;

  if ((assigneeChanged || newlyAssigned) && task.assigneeId && task.assignee?.email) {
    try {
      await sendTaskAssignmentEmail({
        to: task.assignee.email,
        taskTitle: task.title,
        start: task.start,
        end: task.end,
        description: task.description,
        projectName: task.project?.name,
        assignerName: task.createdBy?.name,
        taskId: task.id,
      });
    } catch (error) {
      console.error("Failed to send task assignment email:", error);
      // Don't throw - task update should succeed even if email fails
    }
  }

  return task;
}

export async function deleteTask(taskId: string) {
  return prisma.task.delete({ where: { id: taskId } });
}

export async function getTaskStats(userId?: string) {
  const baseWhere = userId ? { assigneeId: userId } : {};

  const [total, completed, inProgress, overdue, highPriority] = await Promise.all([
    prisma.task.count({
      where: baseWhere,
    }),
    prisma.task.count({
      where: {
        ...baseWhere,
        status: TaskStatus.COMPLETED,
      },
    }),
    prisma.task.count({
      where: {
        ...baseWhere,
        status: TaskStatus.IN_PROGRESS,
      },
    }),
    prisma.task.count({
      where: {
        ...baseWhere,
        end: { lt: new Date() },
        status: { not: TaskStatus.COMPLETED },
      },
    }),
    prisma.task.count({
      where: {
        ...baseWhere,
        priority: { in: [TaskPriority.HIGH, TaskPriority.CRITICAL] },
        status: { not: TaskStatus.COMPLETED },
      },
    }),
  ]);

  return {
    total,
    completed,
    inProgress,
    overdue,
    highPriority,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export async function getUpcomingTasks(userId?: string, limit = 5) {
  const where: Prisma.TaskWhereInput = {
    status: { not: TaskStatus.COMPLETED },
    end: { gte: new Date() },
  };

  if (userId) {
    where.assigneeId = userId;
  }

  return prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, code: true } },
    },
    orderBy: { end: "asc" },
    take: limit,
  });
}

export async function duplicateTask(taskId: string, createdById: string) {
  const originalTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignments: true },
  });

  if (!originalTask) {
    throw new Error("Task not found");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, createdAt, updatedAt, assignments, ...taskData } = originalTask;

  return prisma.task.create({
    data: {
      ...taskData,
      title: `${taskData.title} (Copy)`,
      createdById,
      status: TaskStatus.NOT_STARTED,
      progress: 0,
      actualHours: null,
    },
    include: taskInclude,
  });
}
