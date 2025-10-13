import { prisma } from "@/lib/db";
import { NotificationType } from "@prisma/client";

export async function sendMentionNotifications({
  chatId,
  messageId,
  senderId,
  content,
  mentionedUserIds,
  mentionAll,
}: {
  chatId: string;
  messageId: string;
  senderId: string;
  content: string;
  mentionedUserIds: string[];
  mentionAll: boolean;
}) {
  try {
    // Get chat details
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        project: { select: { id: true, name: true } },
        members: { select: { userId: true } },
      },
    });

    if (!chat) return;

    // Get sender info
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true, email: true },
    });

    if (!sender) return;

    const senderName = sender.name || sender.email;
    const chatName = chat.name || "Direct Message";
    const preview = content.substring(0, 50) + (content.length > 50 ? "..." : "");

    // Determine who to notify
    let usersToNotify: string[] = [];

    if (mentionAll) {
      // Notify all members except sender
      usersToNotify = chat.members
        .map((m) => m.userId)
        .filter((id) => id !== senderId);
    } else if (mentionedUserIds.length > 0) {
      // Notify mentioned users (except sender)
      usersToNotify = mentionedUserIds.filter((id) => id !== senderId);
    }

    // Remove duplicates
    usersToNotify = Array.from(new Set(usersToNotify));

    // Create notifications
    const notifications = usersToNotify.map((userId) => ({
      userId,
      type: NotificationType.CHAT_MENTION,
      title: `${senderName} mentioned you in ${chatName}`,
      message: preview,
      projectId: chat.projectId,
      actionUrl: `/chat?id=${chatId}`,
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications,
      });
      console.log(`✅ Created ${notifications.length} mention notifications for message ${messageId}`);
    }
  } catch (error) {
    console.error("Error sending mention notifications:", error);
    // Don't throw - notifications are non-critical
  }
}
