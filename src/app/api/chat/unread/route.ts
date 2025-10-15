import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getUnreadCount } from "@/lib/services/chat-service";

/**
 * GET /api/chat/unread - Get unread message count for current user
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const count = await getUnreadCount(session.user.id);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
