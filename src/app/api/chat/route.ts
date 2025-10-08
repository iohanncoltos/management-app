import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getUserChats } from "@/lib/services/chat-service";

/**
 * GET /api/chat - Get all chats for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chats = await getUserChats(session.user.id);
    return NextResponse.json({ chats });
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}
