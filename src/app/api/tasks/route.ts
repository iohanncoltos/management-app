import { NextResponse } from "next/server";
import { TaskPriority, TaskCategory, TaskStatus } from "@prisma/client";

import { AuthorizationError, requireSession } from "@/lib/authz";
import { listAllTasks, listTasksForUser, createTask } from "@/lib/services/task-service";
import { taskCreateSchema, taskFiltersSchema, taskSortSchema } from "@/lib/validation/task";

const ASSIGN_TASKS = "ASSIGN_TASKS";

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);

    // Parse filters and sorting
    const filtersData = {
      status: searchParams.getAll("status") as TaskStatus[],
      priority: searchParams.getAll("priority") as TaskPriority[],
      category: searchParams.getAll("category") as TaskCategory[],
      assigneeId: searchParams.get("assigneeId") || undefined,
      projectId: searchParams.get("projectId") || undefined,
      createdById: searchParams.get("createdById") || undefined,
      search: searchParams.get("search") || undefined,
      dueSoon: searchParams.get("dueSoon") === "true",
      overdue: searchParams.get("overdue") === "true",
    };

    const sortData = {
      field: searchParams.get("sortField") || "createdAt",
      order: searchParams.get("sortOrder") || "desc",
    };

    const filters = taskFiltersSchema.parse(filtersData);
    const sort = taskSortSchema.parse(sortData);

    // Determine if user can see all tasks or just their own
    const canManageAllTasks = session.user.permissions.includes(ASSIGN_TASKS);
    const showMyTasksOnly = searchParams.get("scope") === "mine";

    let tasks;
    if (canManageAllTasks && !showMyTasksOnly) {
      tasks = await listAllTasks(filters, sort);
    } else {
      tasks = await listTasksForUser(session.user.id, filters, sort);
    }

    // Serialize dates for JSON response
    const serializedTasks = tasks.map((task) => ({
      ...task,
      start: task.start.toISOString(),
      end: task.end.toISOString(),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }));

    return NextResponse.json(serializedTasks);
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();

    if (!session.user.permissions.includes(ASSIGN_TASKS)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const payload = await request.json();
    const parsed = taskCreateSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const task = await createTask({
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      start: new Date(data.start),
      end: new Date(data.end),
      progress: data.progress,
      priority: data.priority,
      category: data.category,
      status: data.status,
      estimatedHours: data.estimatedHours,
      actualHours: data.actualHours,
      parentId: data.parentId,
      assigneeId: data.assigneeId,
      dependsOn: data.dependsOn,
      createdById: session.user.id,
    });

    // Serialize dates for JSON response
    const serializedTask = {
      ...task,
      start: task.start.toISOString(),
      end: task.end.toISOString(),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };

    return NextResponse.json(serializedTask, { status: 201 });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    console.error("Error creating task:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
