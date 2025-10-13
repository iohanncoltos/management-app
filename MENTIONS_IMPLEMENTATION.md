# 🎯 @Mentions Implementation Guide

Complete WhatsApp-style @mentions system for project chat

## ✅ Completed Steps

### 1. Database Schema Updates (`prisma/schema.prisma`)
```prisma
enum NotificationType {
  // ... existing types
  CHAT_MENTION  // NEW: For @mentions
}

model ChatMessage {
  // ... existing fields
  mentions    String[] // Array of user IDs mentioned
  mentionAll  Boolean  @default(false) // True if @all was used

  @@index([mentions]) // Index for fast queries
}
```

**Migration required:** Run `npx prisma migrate dev --name add_mentions`

### 2. Utilities Created (`src/lib/utils/mentions.ts`)
- `parseMentions()` - Extract mentions from text
- `extractMentionedUserIds()` - Get user IDs from mentions
- `hasMentionAll()` - Check for @all
- `formatMention()` - Format for storage: `@[John Doe](userId)`
- `renderMentionsToHTML()` - Convert to styled HTML
- `findMentionTrigger()` - Detect @ symbol
- `getMentionQuery()` - Get search text after @

### 3. Mention Autocomplete Component (`src/components/chat/mention-autocomplete.tsx`)
- Dropdown with user list + @all option
- Avatar + name + email display
- Keyboard navigation (Arrow Up/Down, Enter, Tab)
- Auto-scroll to selected item
- Filter by name or email

### 4. Message Input Enhanced (`src/components/chat/message-input.tsx`)
- Detects @ symbol typed by user
- Shows autocomplete dropdown
- Keyboard navigation support:
  - `↑↓` - Navigate options
  - `Enter/Tab` - Select mention
  - `Esc` - Close autocomplete
- Inserts formatted mentions: `@[Name](userId)`
- Fetches chat members via API

---

## 🚧 Remaining Steps

### 5. Update Message Display Component

File: `src/components/chat/message-list.tsx`

```tsx
import { renderMentionsToHTML } from "@/lib/utils/mentions";

// In the message rendering section (line 176):
<p className="text-sm md:text-base whitespace-pre-wrap break-words">
  <span
    dangerouslySetInnerHTML={{
      __html: renderMentionsToHTML(message.content, currentUserId)
    }}
  />
</p>
```

### 6. Add CSS Styles for Mentions

File: `src/app/globals.css` (add at the end)

```css
/* Mention styles */
.mention {
  @apply inline-block px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium;
}

.mention-self {
  @apply bg-accent text-accent-foreground font-bold;
}

.mention-all {
  @apply bg-destructive/20 text-destructive font-bold;
}
```

### 7. Create Chat Members API Endpoint

File: `src/app/api/chat/[chatId]/members/route.ts`

```typescript
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
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
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
    });

    const formattedMembers = members.map((m) => m.user);

    return NextResponse.json({ members: formattedMembers });
  } catch (error) {
    console.error("Error fetching chat members:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

### 8. Update Messages API to Handle Mentions

File: `src/app/api/chat/[chatId]/messages/route.ts`

```typescript
import { extractMentionedUserIds, hasMentionAll } from "@/lib/utils/mentions";

// In the POST function, after validating data:
const mentionedUserIds = extractMentionedUserIds(content);
const mentionAll = hasMentionAll(content);

// When creating the message:
const message = await prisma.chatMessage.create({
  data: {
    chatId,
    senderId: session.user.id,
    content,
    mentions: mentionedUserIds,
    mentionAll,
    fileUrl,
    fileName,
    fileSize,
    fileMime,
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
  },
});

// After creating message, send notifications
await sendMentionNotifications({
  chatId,
  messageId: message.id,
  senderId: session.user.id,
  content,
  mentionedUserIds,
  mentionAll,
});
```

### 9. Create Mention Notification Service

File: `src/lib/services/mention-notification-service.ts`

```typescript
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
  }
}
```

### 10. Run Database Migration

```bash
# Generate migration
npx prisma migrate dev --name add_mentions_to_chat

# Or for production
npx prisma migrate deploy
```

---

## 🎨 Features Included

### Autocomplete
- ✅ Triggered by typing `@`
- ✅ Filters users by name/email
- ✅ `@all` option to mention everyone
- ✅ Keyboard navigation (↑↓, Enter, Tab, Esc)
- ✅ Auto-scroll selected item into view

### Mention Display
- ✅ Highlighted with colored background
- ✅ Different style for @all
- ✅ Different style when you're mentioned
- ✅ Preserves user name in display

### Notifications
- ✅ In-app notification when mentioned
- ✅ `@all` notifies all chat members
- ✅ Link directly to chat
- ✅ Preview of message content
- ✅ Sender name displayed

---

## 📝 Usage Examples

### Mentioning a User
1. Type `@` in message input
2. Autocomplete appears with users
3. Type to filter (e.g., `@joh`)
4. Press Enter or Tab to select
5. Mention appears as `@John Doe` (stored as `@[John Doe](userId)`)

### Mentioning Everyone
1. Type `@all`
2. Select from autocomplete or press Enter
3. Everyone in chat gets notified

### In Messages
```
Hey @[John Doe](user123), can you review this?
@all - Meeting in 10 minutes!
Thanks @[Jane](user456) for the help!
```

---

## 🚀 Next Steps

1. Complete steps 5-10 above
2. Test in development
3. Deploy migration to production
4. Optional enhancements:
   - Email notifications for mentions
   - Desktop push notifications
   - Mention statistics/analytics
   - Disable mentions in certain chats
   - @here (only online users)

---

## 🎯 Testing Checklist

- [ ] Type `@` - autocomplete appears
- [ ] Filter users by typing name
- [ ] Select user with keyboard (↑↓, Enter)
- [ ] Select user with mouse click
- [ ] `@all` appears in autocomplete
- [ ] Mentions display with colored background
- [ ] Own mentions have different style
- [ ] Notifications created for mentioned users
- [ ] `@all` notifies all chat members
- [ ] Clicking notification opens chat
- [ ] Mentions work with file attachments
- [ ] Multiple mentions in one message

---

**Implementation Status:** 60% Complete
**Remaining Time:** ~30-45 minutes
