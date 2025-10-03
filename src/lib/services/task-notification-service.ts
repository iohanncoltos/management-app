import { TaskStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  sendTaskProgressEmail,
  sendTaskCompletedEmail,
  sendTaskBlockedEmail,
} from "@/lib/mail";
import {
  notifyTaskCompletion,
  notifyProgressMilestone,
  notifyTaskBlocked,
} from "@/lib/services/notification-service";

interface TaskUpdate {
  taskId: string;
  updatedById: string;
  oldProgress?: number;
  newProgress?: number;
  oldStatus?: TaskStatus;
  newStatus?: TaskStatus;
}

/**
 * Check if progress reached a milestone (25%, 50%, 75%, 100%)
 */
function isMilestone(progress: number): boolean {
  return progress === 25 || progress === 50 || progress === 75 || progress === 100;
}

/**
 * Determine the type of change and whether it should trigger immediate notification
 */
function getChangeType(update: TaskUpdate): {
  type: string;
  shouldNotifyImmediately: boolean;
  milestone: boolean;
} {
  const { oldStatus, newStatus, oldProgress, newProgress } = update;

  // Status changed to COMPLETED
  if (newStatus === TaskStatus.COMPLETED && oldStatus !== TaskStatus.COMPLETED) {
    return { type: "COMPLETED", shouldNotifyImmediately: true, milestone: true };
  }

  // Status changed to BLOCKED
  if (newStatus === TaskStatus.BLOCKED && oldStatus !== TaskStatus.BLOCKED) {
    return { type: "BLOCKED", shouldNotifyImmediately: true, milestone: false };
  }

  // Progress changed
  if (newProgress !== undefined && newProgress !== oldProgress) {
    const milestone = isMilestone(newProgress);
    return {
      type: "PROGRESS",
      shouldNotifyImmediately: milestone, // Only send immediate email on milestones
      milestone,
    };
  }

  // Status changed but not to critical states
  if (newStatus && newStatus !== oldStatus) {
    return { type: "STATUS", shouldNotifyImmediately: false, milestone: false };
  }

  return { type: "UNKNOWN", shouldNotifyImmediately: false, milestone: false };
}

/**
 * Log task update and send immediate notification if needed
 */
export async function logTaskUpdate(update: TaskUpdate) {
  const { taskId, updatedById, oldProgress, newProgress, oldStatus, newStatus } = update;

  // Get task details with creator info
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      createdBy: { select: { id: true, email: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    console.error(`Task not found: ${taskId}`);
    return;
  }

  // Get updater info
  const updater = await prisma.user.findUnique({
    where: { id: updatedById },
    select: { id: true, email: true, name: true },
  });

  // Don't notify if the updater is the task creator (user updating their own task they created)
  if (task.createdById === updatedById) {
    return;
  }

  const changeInfo = getChangeType(update);

  // Determine old and new values for logging
  let oldValue: string | null = null;
  let newValue: string;

  if (changeInfo.type === "PROGRESS") {
    oldValue = oldProgress !== undefined ? String(oldProgress) : null;
    newValue = String(newProgress);
  } else {
    oldValue = oldStatus || null;
    newValue = newStatus || task.status;
  }

  // Create update log entry
  await prisma.taskUpdateLog.create({
    data: {
      taskId,
      updatedById,
      changeType: changeInfo.type,
      oldValue,
      newValue,
      milestone: changeInfo.milestone,
      notified: changeInfo.shouldNotifyImmediately, // Mark as notified if sending immediate email
    },
  });

  // Send immediate notification if needed
  if (changeInfo.shouldNotifyImmediately && task.createdBy.email) {
    const updaterName = updater?.name || "A team member";

    try {
      if (changeInfo.type === "COMPLETED") {
        // Send email notification
        await sendTaskCompletedEmail({
          to: task.createdBy.email,
          taskTitle: task.title,
          completerName: updaterName,
          projectName: task.project?.name,
          taskId: task.id,
        });

        // Create in-app notification
        await notifyTaskCompletion({
          creatorId: task.createdById,
          taskId: task.id,
          taskTitle: task.title,
          completerName: updaterName,
          projectId: task.projectId || undefined,
        });
      } else if (changeInfo.type === "BLOCKED") {
        // Send email notification
        await sendTaskBlockedEmail({
          to: task.createdBy.email,
          taskTitle: task.title,
          blockerName: updaterName,
          projectName: task.project?.name,
          taskId: task.id,
        });

        // Create in-app notification
        await notifyTaskBlocked({
          creatorId: task.createdById,
          taskId: task.id,
          taskTitle: task.title,
          blockerName: updaterName,
          projectId: task.projectId || undefined,
        });
      } else if (changeInfo.type === "PROGRESS" && changeInfo.milestone) {
        // Send email notification
        await sendTaskProgressEmail({
          to: task.createdBy.email,
          taskTitle: task.title,
          updaterName,
          oldProgress,
          newProgress: newProgress!,
          projectName: task.project?.name,
          taskId: task.id,
        });

        // Create in-app notification
        await notifyProgressMilestone({
          creatorId: task.createdById,
          taskId: task.id,
          taskTitle: task.title,
          updaterName,
          progress: newProgress!,
          projectId: task.projectId || undefined,
        });
      }
    } catch (error) {
      console.error("Failed to send immediate notification:", error);
    }
  }
}
