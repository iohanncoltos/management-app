import { NextResponse } from "next/server";

import { AuthorizationError, requireSession } from "@/lib/authz";
import { duplicateTask, getTaskById } from "@/lib/services/task-service";

type RouteContext = { params: Promise<{ taskId: string }> };

const ASSIGN_TASKS = "ASSIGN_TASKS";

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

export async function POST(_request: Request, context: RouteContext) {
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

    const duplicatedTask = await duplicateTask(taskId, session.user.id);

    // Serialize dates for JSON response
    const serializedTask = {
      ...duplicatedTask,
      start: duplicatedTask.start.toISOString(),
      end: duplicatedTask.end.toISOString(),
      createdAt: duplicatedTask.createdAt.toISOString(),
      updatedAt: duplicatedTask.updatedAt.toISOString(),
    };

    return NextResponse.json(serializedTask, { status: 201 });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    console.error("Error duplicating task:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}