import { NotificationType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  projectId?: string;
  actionUrl?: string;
}

/**
 * Create a new notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      taskId: params.taskId,
      projectId: params.projectId,
      actionUrl: params.actionUrl,
    },
  });
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });
}

/**
 * Get notifications for a user with pagination
 */
export async function getUserNotifications(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }
) {
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  const where: Prisma.NotificationWhereInput = {
    userId,
  };

  if (options?.unreadOnly) {
    where.read = false;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    notifications,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string) {
  // Verify the notification belongs to the user
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  });
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, userId: string) {
  // Verify the notification belongs to the user
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  return prisma.notification.delete({
    where: { id: notificationId },
  });
}

/**
 * Helper: Create notification for task assignment
 */
export async function notifyTaskAssignment(params: {
  assigneeId: string;
  taskId: string;
  taskTitle: string;
  assignerName: string;
  projectId?: string;
}) {
  return createNotification({
    userId: params.assigneeId,
    type: NotificationType.TASK_ASSIGNED,
    title: "New task assigned",
    message: `${params.assignerName} assigned you a task: ${params.taskTitle}`,
    taskId: params.taskId,
    projectId: params.projectId,
    actionUrl: `/tasks?task=${params.taskId}`,
  });
}

/**
 * Helper: Create notification for task completion
 */
export async function notifyTaskCompletion(params: {
  creatorId: string;
  taskId: string;
  taskTitle: string;
  completerName: string;
  projectId?: string;
}) {
  return createNotification({
    userId: params.creatorId,
    type: NotificationType.TASK_COMPLETED,
    title: "Task completed",
    message: `${params.completerName} completed: ${params.taskTitle}`,
    taskId: params.taskId,
    projectId: params.projectId,
    actionUrl: `/tasks?task=${params.taskId}`,
  });
}

/**
 * Helper: Create notification for progress milestone
 */
export async function notifyProgressMilestone(params: {
  creatorId: string;
  taskId: string;
  taskTitle: string;
  updaterName: string;
  progress: number;
  projectId?: string;
}) {
  return createNotification({
    userId: params.creatorId,
    type: NotificationType.PROGRESS_MILESTONE,
    title: "Task progress update",
    message: `${params.updaterName} updated progress to ${params.progress}% on: ${params.taskTitle}`,
    taskId: params.taskId,
    projectId: params.projectId,
    actionUrl: `/tasks?task=${params.taskId}`,
  });
}

/**
 * Helper: Create notification for task blocked
 */
export async function notifyTaskBlocked(params: {
  creatorId: string;
  taskId: string;
  taskTitle: string;
  blockerName: string;
  projectId?: string;
}) {
  return createNotification({
    userId: params.creatorId,
    type: NotificationType.TASK_BLOCKED,
    title: "Task blocked",
    message: `${params.blockerName} marked task as blocked: ${params.taskTitle}`,
    taskId: params.taskId,
    projectId: params.projectId,
    actionUrl: `/tasks?task=${params.taskId}`,
  });
}

/**
 * Helper: Create notification for task reassignment
 */
export async function notifyTaskReassignment(params: {
  newAssigneeId: string;
  oldAssigneeId?: string;
  taskId: string;
  taskTitle: string;
  assignerName: string;
  projectId?: string;
}) {
  // Notify new assignee
  await createNotification({
    userId: params.newAssigneeId,
    type: NotificationType.TASK_REASSIGNED,
    title: "Task reassigned to you",
    message: `${params.assignerName} reassigned you a task: ${params.taskTitle}`,
    taskId: params.taskId,
    projectId: params.projectId,
    actionUrl: `/tasks?task=${params.taskId}`,
  });

  // Optionally notify old assignee (if exists)
  if (params.oldAssigneeId && params.oldAssigneeId !== params.newAssigneeId) {
    await createNotification({
      userId: params.oldAssigneeId,
      type: NotificationType.TASK_REASSIGNED,
      title: "Task reassigned",
      message: `Your task "${params.taskTitle}" was reassigned by ${params.assignerName}`,
      taskId: params.taskId,
      projectId: params.projectId,
      actionUrl: `/tasks`,
    });
  }
}
