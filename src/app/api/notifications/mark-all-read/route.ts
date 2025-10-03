import { NextResponse } from "next/server";

import { AuthorizationError, requireSession } from "@/lib/authz";
import { markAllAsRead } from "@/lib/services/notification-service";

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

/**
 * PATCH /api/notifications/mark-all-read - Mark all notifications as read
 */
export async function PATCH() {
  try {
    const session = await requireSession();
    await markAllAsRead(session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    console.error("Error marking all as read:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
