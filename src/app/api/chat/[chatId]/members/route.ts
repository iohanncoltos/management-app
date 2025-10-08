import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { addChatMember, removeChatMember } from "@/lib/services/chat-service";

/**
 * POST /api/chat/:chatId/members - Add a member to the chat (admin only)
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
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const member = await addChatMember(chatId, session.user.id, userId);
    return NextResponse.json({ member });
  } catch (error) {
    console.error("Error adding member:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add member" },
      { status: error instanceof Error && error.message.includes("admin") ? 403 : 500 }
    );
  }
}

/**
 * DELETE /api/chat/:chatId/members/:userId - Remove a member from the chat (admin only)
 */
export async function DELETE(
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
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await removeChatMember(chatId, session.user.id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove member" },
      { status: error instanceof Error && error.message.includes("admin") ? 403 : 500 }
    );
  }
}
