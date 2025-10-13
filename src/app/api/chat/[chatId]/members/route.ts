import { NextResponse } from "next/server";
import { requireSession } from "@/lib/authz";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ chatId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { chatId } = await context.params;
    const session = await requireSession();

    // Verify user is a member of this chat
    const isMember = await prisma.chatMember.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId: session.user.id,
        },
      },
    });

    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this chat" }, { status: 403 });
    }

    // Fetch all chat members
    const members = await prisma.chatMember.findMany({
      where: { chatId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    const formattedMembers = members.map((m) => m.user);

    return NextResponse.json({ members: formattedMembers });
  } catch (error) {
    console.error("Error fetching chat members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
