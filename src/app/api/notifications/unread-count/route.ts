import { NextResponse } from "next/server";

import { AuthorizationError, requireSession } from "@/lib/authz";
import { getUnreadCount } from "@/lib/services/notification-service";

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

/**
 * GET /api/notifications/unread-count - Get unread notification count
 */
export async function GET() {
  try {
    const session = await requireSession();
    const count = await getUnreadCount(session.user.id);

    return NextResponse.json({ count });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    console.error("Error fetching unread count:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
