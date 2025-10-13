import { prisma } from "@/lib/db";
import { extractMentionedUserIds, hasMentionAll } from "@/lib/utils/mentions";
import { sendMentionNotifications } from "@/lib/services/mention-notification-service";

/**
 * Create a direct chat between two users
 */
export async function createDirectChat(userId1: string, userId2: string, creatorId: string) {
  // Check if chat already exists between these two users
  const existingChat = await prisma.chat.findFirst({
    where: {
      type: "DIRECT",
      AND: [
        { members: { some: { userId: userId1 } } },
        { members: { some: { userId: userId2 } } },
      ],
    },
    include: {
      members: {
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
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (existingChat) {
    return existingChat;
  }

  // Create new direct chat
  return prisma.chat.create({
    data: {
      type: "DIRECT",
      createdById: creatorId,
      members: {
        create: [
          { userId: userId1, isAdmin: false },
          { userId: userId2, isAdmin: false },
        ],
      },
    },
    include: {
      members: {
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
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

/**
 * Create a project chat (admins/PMs only)
 */
export async function createProjectChat(
  projectId: string,
  name: string,
  createdById: string,
  memberUserIds: string[]
) {
  // Check if project chat already exists
  const existingChat = await prisma.chat.findFirst({
    where: {
      type: "PROJECT",
      projectId,
    },
  });

  if (existingChat) {
    throw new Error("Project chat already exists");
  }

  return prisma.chat.create({
    data: {
      type: "PROJECT",
      name,
      projectId,
      createdById,
      members: {
        create: memberUserIds.map((userId) => ({
          userId,
          isAdmin: userId === createdById, // Creator is admin
        })),
      },
    },
    include: {
      project: true,
      members: {
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
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

/**
 * Get all chats for a user
 */
export async function getUserChats(userId: string) {
  const chats = await prisma.chat.findMany({
    where: {
      members: {
        some: { userId },
      },
    },
    include: {
      project: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      members: {
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
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Calculate unread count for each chat
  return Promise.all(
    chats.map(async (chat) => {
      const member = chat.members.find((m) => m.userId === userId);
      const unreadCount = await prisma.chatMessage.count({
        where: {
          chatId: chat.id,
          createdAt: { gt: member?.lastReadAt ?? new Date(0) },
          senderId: { not: userId },
        },
      });

      return {
        ...chat,
        unreadCount,
      };
    })
  );
}

/**
 * Get chat by ID with permission check
 */
export async function getChatById(chatId: string, userId: string) {
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      members: {
        some: { userId },
      },
    },
    include: {
      project: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      members: {
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
      },
    },
  });

  if (!chat) {
    throw new Error("Chat not found or access denied");
  }

  return chat;
}

/**
 * Get messages for a chat
 */
export async function getChatMessages(
  chatId: string,
  userId: string,
  limit = 50,
  cursor?: string
) {
  // Verify user has access
  await getChatById(chatId, userId);

  const messages = await prisma.chatMessage.findMany({
    where: {
      chatId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      replyTo: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return messages.reverse(); // Return oldest to newest
}

/**
 * Send a message
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  content: string,
  fileUrl?: string,
  fileName?: string,
  fileSize?: number,
  fileMime?: string,
  replyToId?: string
) {
  // Verify user is a member
  const member = await prisma.chatMember.findFirst({
    where: { chatId, userId: senderId },
  });

  if (!member) {
    throw new Error("You are not a member of this chat");
  }

  // Extract mentions from content
  const mentionedUserIds = extractMentionedUserIds(content);
  const mentionAll = hasMentionAll(content);

  const message = await prisma.chatMessage.create({
    data: {
      chatId,
      senderId,
      content,
      mentions: mentionedUserIds,
      mentionAll,
      fileUrl,
      fileName,
      fileSize,
      fileMime,
      replyToId,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      replyTo: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Update chat's updatedAt
  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  // Send mention notifications (async, non-blocking)
  if (mentionedUserIds.length > 0 || mentionAll) {
    sendMentionNotifications({
      chatId,
      messageId: message.id,
      senderId,
      content,
      mentionedUserIds,
      mentionAll,
    }).catch((error) => {
      console.error("Failed to send mention notifications:", error);
    });
  }

  return message;
}

/**
 * Mark messages as read
 */
export async function markChatAsRead(chatId: string, userId: string) {
  await prisma.chatMember.updateMany({
    where: { chatId, userId },
    data: { lastReadAt: new Date() },
  });
}

/**
 * Add member to chat (admin only)
 */
export async function addChatMember(chatId: string, adminUserId: string, newUserId: string) {
  // Verify admin permissions
  const adminMember = await prisma.chatMember.findFirst({
    where: { chatId, userId: adminUserId },
  });

  if (!adminMember?.isAdmin) {
    throw new Error("Only chat admins can add members");
  }

  // Check if already a member
  const existingMember = await prisma.chatMember.findFirst({
    where: { chatId, userId: newUserId },
  });

  if (existingMember) {
    throw new Error("User is already a member");
  }

  return prisma.chatMember.create({
    data: {
      chatId,
      userId: newUserId,
      isAdmin: false,
    },
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
  });
}

/**
 * Remove member from chat (admin only)
 */
export async function removeChatMember(chatId: string, adminUserId: string, targetUserId: string) {
  // Verify admin permissions
  const adminMember = await prisma.chatMember.findFirst({
    where: { chatId, userId: adminUserId },
  });

  if (!adminMember?.isAdmin) {
    throw new Error("Only chat admins can remove members");
  }

  await prisma.chatMember.deleteMany({
    where: { chatId, userId: targetUserId },
  });
}

/**
 * Get unread message count for user
 */
export async function getUnreadCount(userId: string) {
  const chats = await prisma.chat.findMany({
    where: {
      members: {
        some: { userId },
      },
    },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  let totalUnread = 0;
  for (const chat of chats) {
    const member = chat.members[0];
    const unreadCount = await prisma.chatMessage.count({
      where: {
        chatId: chat.id,
        createdAt: { gt: member?.lastReadAt ?? new Date(0) },
        senderId: { not: userId },
      },
    });
    totalUnread += unreadCount;
  }

  return totalUnread;
}

/**
 * Edit message (sender only)
 */
export async function editMessage(messageId: string, userId: string, newContent: string) {
  const message = await prisma.chatMessage.findFirst({
    where: { id: messageId, senderId: userId },
  });

  if (!message) {
    throw new Error("Message not found or unauthorized");
  }

  return prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      content: newContent,
      isEdited: true,
    },
  });
}

/**
 * Delete message (sender only)
 */
export async function deleteMessage(messageId: string, userId: string) {
  const message = await prisma.chatMessage.findFirst({
    where: { id: messageId, senderId: userId },
  });

  if (!message) {
    throw new Error("Message not found or unauthorized");
  }

  return prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      isDeleted: true,
      content: "This message has been deleted",
    },
  });
}
