import { NextResponse } from "next/server";

import { AuthorizationError, requireSession } from "@/lib/authz";
import { getTaskStats } from "@/lib/services/task-service";

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

    const canManageAllTasks = session.user.permissions.includes(ASSIGN_TASKS);
    const scope = searchParams.get("scope");
    const userId = searchParams.get("userId");

    let statsUserId: string | undefined;

    if (scope === "mine" || !canManageAllTasks) {
      // User's own stats
      statsUserId = session.user.id;
    } else if (userId && canManageAllTasks) {
      // Specific user's stats (admin only)
      statsUserId = userId;
    }
    // If no scope and user can manage all tasks, get global stats (undefined userId)

    const stats = await getTaskStats(statsUserId);

    return NextResponse.json(stats);
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    console.error("Error fetching task stats:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}