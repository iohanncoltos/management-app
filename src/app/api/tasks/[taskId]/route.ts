import { NextResponse } from "next/server";
import { TaskStatus } from "@prisma/client";

import { AuthorizationError, requireSession } from "@/lib/authz";
import { deleteTask, updateTask, getTaskById } from "@/lib/services/task-service";
import { taskUpdateSchema } from "@/lib/validation/task";

type RouteContext = { params: Promise<{ taskId: string }> };

const ASSIGN_TASKS = "ASSIGN_TASKS";

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { taskId } = await context.params;
    const session = await requireSession();

    const task = await getTaskById(taskId);
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    // Check if user can view this task
    const canManageTasks = session.user.permissions.includes(ASSIGN_TASKS);
    const isAssignee = task.assigneeId === session.user.id;
    const isCreator = task.createdById === session.user.id;

    if (!canManageTasks && !isAssignee && !isCreator) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Serialize dates for JSON response
    const serializedTask = {
      ...task,
      start: task.start.toISOString(),
      end: task.end.toISOString(),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };

    return NextResponse.json(serializedTask);
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    console.error("Error fetching task:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { taskId } = await context.params;
    const session = await requireSession();

    const body = await request.json();
    const parsed = taskUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await getTaskById(taskId);
    if (!existing) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const canManageTasks = session.user.permissions.includes(ASSIGN_TASKS);
    const isAssignee = existing.assigneeId === session.user.id;

    if (!canManageTasks && !isAssignee) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const updates = parsed.data;

    // If user can't manage tasks, they can only update progress and status
    if (!canManageTasks) {
      const allowedUpdates = {
        progress: updates.progress,
        status: updates.status,
        actualHours: updates.actualHours,
      };

      // Auto-set status based on progress if not explicitly set
      if (updates.progress === 100 && !updates.status) {
        allowedUpdates.status = TaskStatus.COMPLETED;
      } else if (updates.progress && updates.progress > 0 && !updates.status && existing.status === TaskStatus.NOT_STARTED) {
        allowedUpdates.status = TaskStatus.IN_PROGRESS;
      }

      const task = await updateTask(taskId, allowedUpdates);

      // Serialize dates for JSON response
      const serializedTask = {
        ...task,
        start: task.start.toISOString(),
        end: task.end.toISOString(),
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      };

      return NextResponse.json(serializedTask);
    }

    // For users who can manage tasks, allow all updates
    const task = await updateTask(taskId, {
      ...updates,
      start: updates.start ? new Date(updates.start) : undefined,
      end: updates.end ? new Date(updates.end) : undefined,
    });

    // Serialize dates for JSON response
    const serializedTask = {
      ...task,
      start: task.start.toISOString(),
      end: task.end.toISOString(),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };

    return NextResponse.json(serializedTask);
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    console.error("Error updating task:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { taskId } = await context.params;
    const session = await requireSession();

    if (!session.user.permissions.includes(ASSIGN_TASKS)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const existing = await getTaskById(taskId);
    if (!existing) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    await deleteTask(taskId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    console.error("Error deleting task:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
