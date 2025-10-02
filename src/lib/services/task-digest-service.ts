import { subHours } from "date-fns";

import { prisma } from "@/lib/db";

export interface TaskUpdateEntry {
  taskId: string;
  taskTitle: string;
  assigneeName: string | null;
  changeType: string;
  oldValue: string | null;
  newValue: string;
  milestone: boolean;
  createdAt: Date;
  projectName: string | null;
}

export interface DigestData {
  creatorId: string;
  creatorEmail: string;
  creatorName: string | null;
  progressUpdates: TaskUpdateEntry[];
  completedTasks: TaskUpdateEntry[];
  blockedTasks: TaskUpdateEntry[];
  statusChanges: TaskUpdateEntry[];
  hasUpdates: boolean;
  tasksInProgress: Array<{
    id: string;
    title: string;
    assigneeName: string | null;
    progress: number;
    dueDate: Date;
  }>;
}

/**
 * Get all unnotified updates from the last 24 hours, grouped by task creator
 */
export async function getDailyDigestData(): Promise<DigestData[]> {
  const yesterday = subHours(new Date(), 24);

  // Get all unnotified updates from the last 24 hours
  const updates = await prisma.taskUpdateLog.findMany({
    where: {
      notified: false,
      createdAt: { gte: yesterday },
    },
    include: {
      task: {
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          assignee: {
            select: {
              name: true,
            },
          },
          project: {
            select: {
              name: true,
            },
          },
        },
      },
      updatedBy: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Group updates by task creator
  const groupedByCreator = new Map<string, TaskUpdateEntry[]>();

  for (const update of updates) {
    const creatorId = update.task.createdBy.id;

    // Skip if updater is the creator (don't notify about own updates)
    if (update.updatedById === creatorId) {
      continue;
    }

    if (!groupedByCreator.has(creatorId)) {
      groupedByCreator.set(creatorId, []);
    }

    groupedByCreator.get(creatorId)!.push({
      taskId: update.task.id,
      taskTitle: update.task.title,
      assigneeName: update.task.assignee?.name || null,
      changeType: update.changeType,
      oldValue: update.oldValue,
      newValue: update.newValue,
      milestone: update.milestone,
      createdAt: update.createdAt,
      projectName: update.task.project?.name || null,
    });
  }

  // Build digest data for each creator
  const digestData: DigestData[] = [];

  for (const [creatorId, creatorUpdates] of groupedByCreator.entries()) {
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { id: true, email: true, name: true },
    });

    if (!creator || !creator.email) {
      continue;
    }

    // Categorize updates
    const progressUpdates = creatorUpdates.filter((u) => u.changeType === "PROGRESS");
    const completedTasks = creatorUpdates.filter((u) => u.changeType === "COMPLETED");
    const blockedTasks = creatorUpdates.filter((u) => u.changeType === "BLOCKED");
    const statusChanges = creatorUpdates.filter((u) => u.changeType === "STATUS");

    // Get tasks still in progress for this creator
    const tasksInProgress = await prisma.task.findMany({
      where: {
        createdById: creatorId,
        status: { in: ["NOT_STARTED", "IN_PROGRESS", "BLOCKED"] },
      },
      select: {
        id: true,
        title: true,
        progress: true,
        end: true,
        assignee: {
          select: { name: true },
        },
      },
      orderBy: { end: "asc" },
      take: 5,
    });

    digestData.push({
      creatorId: creator.id,
      creatorEmail: creator.email,
      creatorName: creator.name,
      progressUpdates,
      completedTasks,
      blockedTasks,
      statusChanges,
      hasUpdates: creatorUpdates.length > 0,
      tasksInProgress: tasksInProgress.map((t) => ({
        id: t.id,
        title: t.title,
        assigneeName: t.assignee?.name || null,
        progress: t.progress,
        dueDate: t.end,
      })),
    });
  }

  // Also include creators with NO updates but have active tasks
  const creatorsWithActiveTasks = await prisma.task.groupBy({
    by: ["createdById"],
    where: {
      status: { in: ["NOT_STARTED", "IN_PROGRESS", "BLOCKED"] },
    },
    _count: {
      id: true,
    },
  });

  for (const group of creatorsWithActiveTasks) {
    // Skip if already in digest
    if (digestData.some((d) => d.creatorId === group.createdById)) {
      continue;
    }

    const creator = await prisma.user.findUnique({
      where: { id: group.createdById },
      select: { id: true, email: true, name: true },
    });

    if (!creator || !creator.email) {
      continue;
    }

    // Get tasks in progress
    const tasksInProgress = await prisma.task.findMany({
      where: {
        createdById: group.createdById,
        status: { in: ["NOT_STARTED", "IN_PROGRESS", "BLOCKED"] },
      },
      select: {
        id: true,
        title: true,
        progress: true,
        end: true,
        assignee: {
          select: { name: true },
        },
      },
      orderBy: { end: "asc" },
      take: 5,
    });

    digestData.push({
      creatorId: creator.id,
      creatorEmail: creator.email,
      creatorName: creator.name,
      progressUpdates: [],
      completedTasks: [],
      blockedTasks: [],
      statusChanges: [],
      hasUpdates: false,
      tasksInProgress: tasksInProgress.map((t) => ({
        id: t.id,
        title: t.title,
        assigneeName: t.assignee?.name || null,
        progress: t.progress,
        dueDate: t.end,
      })),
    });
  }

  return digestData;
}

/**
 * Mark all updates as notified
 */
export async function markUpdatesAsNotified(updateIds: string[]) {
  await prisma.taskUpdateLog.updateMany({
    where: {
      id: { in: updateIds },
    },
    data: {
      notified: true,
    },
  });
}
