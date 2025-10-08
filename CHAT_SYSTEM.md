# Chat System Documentation

## Overview

The in-app chat system supports both direct messages (1-on-1) and project-based group chats. It includes real-time updates via polling, file attachments, and message threading.

## Features

✅ **Direct Messages** - 1-on-1 conversations between any users
✅ **Project Chats** - Group chats linked to projects (admins/PMs can create)
✅ **File Attachments** - Upload and share files (up to 10MB)
✅ **Real-time Updates** - Messages update every 3 seconds via polling
✅ **Unread Tracking** - Track unread messages per chat
✅ **Message History** - Full message history with timestamps
✅ **Member Management** - Add/remove members (chat admins only)

## Database Schema

### Models

**Chat**
- `type`: DIRECT or PROJECT
- `name`: Optional name for project chats
- `projectId`: Link to project (for PROJECT type)
- `members`: Users in the chat
- `messages`: All messages

**ChatMember**
- `userId`: Member user ID
- `isAdmin`: Can add/remove members
- `lastReadAt`: Track read status

**ChatMessage**
- `content`: Message text
- `fileUrl`, `fileName`, `fileSize`, `fileMime`: File attachment info
- `replyToId`: For message threading
- `isEdited`, `isDeleted`: Message state

## API Endpoints

### Chat Management
- `GET /api/chat` - List all chats for current user
- `POST /api/chat/direct` - Create direct chat
- `POST /api/chat/project` - Create project chat (requires MANAGE_PROJECTS permission)
- `GET /api/chat/:chatId` - Get chat details
- `GET /api/chat/unread` - Get unread message count

### Messages
- `GET /api/chat/:chatId/messages` - Get messages (auto-marks as read)
- `POST /api/chat/:chatId/messages` - Send message

### Members
- `POST /api/chat/:chatId/members` - Add member (admin only)
- `DELETE /api/chat/:chatId/members?userId=xxx` - Remove member (admin only)

### Files
- `POST /api/files/upload-chat` - Upload file for chat

## Usage

### Navigate to Chat
Click "Chat" in the navigation menu or visit `/chat`

### Create Direct Message
1. Click "New DM" button
2. Select a user from the list
3. Click "Start Chat"

### Create Project Chat
1. Click "Project Chat" button
2. Select project
3. Enter chat name
4. Select members
5. Click "Create Chat"
- **Note**: Only admins and users with MANAGE_PROJECTS permission can create project chats
- Creator becomes chat admin automatically

### Send Messages
- Type message in input field
- Press Enter to send (Shift+Enter for new line)
- Click paperclip icon to attach file

### File Attachments
- Max file size: 10MB
- Files are uploaded to Cloudflare R2
- Stored in `chat/{userId}/{timestamp}-{filename}` path

## Components

### UI Components
- `ChatSidebar` - List of chats with unread badges
- `ChatWindow` - Main chat interface
- `MessageList` - Scrollable message history
- `MessageInput` - Send messages and attach files
- `NewDirectChatDialog` - Create direct chat
- `NewProjectChatDialog` - Create project chat

### Service Layer
Located in `src/lib/services/chat-service.ts`:
- `createDirectChat()` - Create/get direct chat
- `createProjectChat()` - Create project chat
- `getUserChats()` - Get user's chats with unread counts
- `sendMessage()` - Send message with optional file
- `markChatAsRead()` - Update read timestamp
- `addChatMember()` / `removeChatMember()` - Manage members

## Permissions

### Direct Messages
- Any logged-in user can create direct chats
- No special permissions required

### Project Chats
- Requires `MANAGE_PROJECTS` or `MANAGE_USERS` permission
- Typically: Admins and Project Managers
- Creator becomes chat admin
- Chat admins can add/remove members

## Real-time Updates

Currently uses **polling** (requests every 3 seconds):
- Simple implementation
- Works everywhere
- Messages appear within 3 seconds

### Future: Upgrade to SSE (Server-Sent Events)
For instant message delivery:
1. Create `/api/chat/:chatId/stream` endpoint
2. Use EventSource in client
3. Push events on new messages

## Customization

### Change Polling Interval
Edit `refetchInterval` in components:
```typescript
refetchInterval: 5000, // 5 seconds instead of 3
```

### Change File Size Limit
Edit in:
- `message-input.tsx`: Client-side check
- `upload-chat/route.ts`: Server-side validation

### Add Typing Indicators
1. Create `ChatTyping` model in Prisma
2. Add `/api/chat/:chatId/typing` endpoint
3. Broadcast typing events
4. Show "User is typing..." in UI

## Troubleshooting

### Messages not appearing
- Check browser console for errors
- Verify API endpoints are responding
- Check database connection

### File upload fails
- Check R2/S3 credentials in `.env`
- Verify file size < 10MB
- Check network tab for upload errors

### Can't create project chat
- Verify user has MANAGE_PROJECTS or MANAGE_USERS permission
- Check role permissions in database

### Unread count not updating
- Ensure `lastReadAt` is being updated
- Check `markChatAsRead()` is called when viewing messages

## Future Enhancements

- [ ] Typing indicators
- [ ] Message reactions (emojis)
- [ ] Message search
- [ ] Rich text formatting (markdown)
- [ ] Voice/video calls
- [ ] Push notifications
- [ ] Message pinning
- [ ] Thread view for replies
- [ ] Export chat history
- [ ] @mentions with notifications
