import { NextResponse } from "next/server";

import { AuthorizationError, requireSession } from "@/lib/authz";
import { getUserNotifications } from "@/lib/services/notification-service";

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

/**
 * GET /api/notifications - Get user notifications
 */
export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const result = await getUserNotifications(session.user.id, {
      limit,
      offset,
      unreadOnly,
    });

    return NextResponse.json(result);
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
