import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getChatMessages, sendMessage, markChatAsRead } from "@/lib/services/chat-service";

/**
 * GET /api/chat/:chatId/messages - Get messages for a chat
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
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;
    const cursor = searchParams.get("cursor") || undefined;

    const messages = await getChatMessages(chatId, session.user.id, limit, cursor);

    // Mark chat as read
    await markChatAsRead(chatId, session.user.id);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/:chatId/messages - Send a message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;
    const body = await request.json();
    const { content, fileUrl, fileName, fileSize, fileMime, replyToId } = body;

    if (!content && !fileUrl) {
      return NextResponse.json(
        { error: "Message content or file is required" },
        { status: 400 }
      );
    }

    const message = await sendMessage(
      chatId,
      session.user.id,
      content || "",
      fileUrl,
      fileName,
      fileSize,
      fileMime,
      replyToId
    );

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send message" },
      { status: 500 }
    );
  }
}
