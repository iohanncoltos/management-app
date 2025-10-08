import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createDirectChat } from "@/lib/services/chat-service";

/**
 * POST /api/chat/direct - Create a direct chat with another user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot create chat with yourself" },
        { status: 400 }
      );
    }

    const chat = await createDirectChat(session.user.id, userId, session.user.id);
    return NextResponse.json({ chat });
  } catch (error) {
    console.error("Error creating direct chat:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create chat" },
      { status: 500 }
    );
  }
}
