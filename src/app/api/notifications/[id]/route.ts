import { NextResponse } from "next/server";

import { AuthorizationError, requireSession } from "@/lib/authz";
import { markAsRead, deleteNotification } from "@/lib/services/notification-service";

type RouteContext = { params: Promise<{ id: string }> };

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

/**
 * PATCH /api/notifications/[id] - Mark notification as read
 */
export async function PATCH(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await requireSession();

    await markAsRead(id, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    if (error instanceof Error && error.message === "Notification not found") {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    console.error("Error marking notification as read:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications/[id] - Delete notification
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await requireSession();

    await deleteNotification(id, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;

    if (error instanceof Error && error.message === "Notification not found") {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    console.error("Error deleting notification:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
