import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getChatById } from "@/lib/services/chat-service";

/**
 * GET /api/chat/:chatId - Get chat details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;
    const chat = await getChatById(chatId, session.user.id);
    return NextResponse.json({ chat });
  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch chat" },
      { status: error instanceof Error && error.message.includes("not found") ? 404 : 500 }
    );
  }
}
