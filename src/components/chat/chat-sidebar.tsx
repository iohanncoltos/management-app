"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Chat {
  id: string;
  type: "DIRECT" | "PROJECT";
  name: string | null;
  project?: {
    id: string;
    code: string;
    name: string;
  } | null;
  members: Array<{
    user: {
      id: string;
      name: string | null;
      email: string;
      avatarUrl: string | null;
    };
  }>;
  messages: Array<{
    id: string;
    content: string;
    createdAt: string;
    sender: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  unreadCount: number;
}

interface ChatSidebarProps {
  currentUserId: string;
  selectedChatId?: string;
  onChatSelect: (chatId: string) => void;
  onNewDirectMessage: () => void;
  onNewProjectChat: () => void;
}

export function ChatSidebar({
  currentUserId,
  selectedChatId,
  onChatSelect,
  onNewDirectMessage,
  onNewProjectChat,
}: ChatSidebarProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const res = await fetch("/api/chat");
      if (!res.ok) throw new Error("Failed to fetch chats");
      const data = await res.json();
      return data.chats as Chat[];
    },
    refetchInterval: 3000, // Poll every 3 seconds
  });

  const chats = data ?? [];

  const getChatDisplayName = (chat: Chat) => {
    if (chat.type === "PROJECT") {
      return chat.name || chat.project?.name || "Project Chat";
    }
    // For direct chats, show the other user's name
    const otherMember = chat.members.find((m) => m.user.id !== currentUserId);
    return otherMember?.user.name || otherMember?.user.email || "Unknown";
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === "PROJECT") {
      return null; // Will show icon instead
    }
    const otherMember = chat.members.find((m) => m.user.id !== currentUserId);
    return otherMember?.user.avatarUrl || null;
  };

  const getLastMessage = (chat: Chat) => {
    const lastMsg = chat.messages[0];
    if (!lastMsg) return null;

    const isCurrentUser = lastMsg.sender.id === currentUserId;
    const senderName = isCurrentUser ? "You" : lastMsg.sender.name || "User";
    const preview = lastMsg.content.substring(0, 50);

    return {
      text: `${senderName}: ${preview}${lastMsg.content.length > 50 ? "..." : ""}`,
      time: formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: true }),
    };
  };

  return (
    <div className="flex h-full flex-col md:border-r">
      <div className="p-3 md:p-4 space-y-2">
        <h2 className="text-lg font-semibold">Messages</h2>
        <div className="flex gap-2">
          <Button onClick={onNewDirectMessage} variant="outline" size="sm" className="flex-1 text-xs md:text-sm">
            <MessageCircle className="h-4 w-4 md:mr-2" />
            <span className="hidden sm:inline ml-2">New DM</span>
          </Button>
          <Button onClick={onNewProjectChat} variant="outline" size="sm" className="flex-1 text-xs md:text-sm">
            <Users className="h-4 w-4 md:mr-2" />
            <span className="hidden sm:inline ml-2">Project Chat</span>
          </Button>
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading chats...</div>
        ) : chats.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No chats yet. Start a conversation!
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {chats.map((chat) => {
              const lastMessage = getLastMessage(chat);
              const displayName = getChatDisplayName(chat);
              const avatarUrl = getChatAvatar(chat);

              return (
                <button
                  key={chat.id}
                  onClick={() => onChatSelect(chat.id)}
                  className={cn(
                    "w-full text-left p-2 md:p-3 rounded-lg hover:bg-accent transition-colors active:scale-[0.98]",
                    selectedChatId === chat.id && "bg-accent"
                  )}
                >
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="relative">
                      {chat.type === "PROJECT" ? (
                        <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                        </div>
                      ) : (
                        <Avatar className="h-9 w-9 md:h-10 md:w-10">
                          <AvatarImage src={avatarUrl || undefined} />
                          <AvatarFallback>
                            {displayName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {chat.unreadCount > 0 && (
                        <Badge
                          variant="danger"
                          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate text-sm md:text-base">{displayName}</p>
                        {lastMessage && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {lastMessage.time}
                          </span>
                        )}
                      </div>
                      {chat.type === "PROJECT" && chat.project && (
                        <p className="text-xs text-muted-foreground truncate">
                          {chat.project.code}
                        </p>
                      )}
                      {lastMessage && (
                        <p className="text-xs md:text-sm text-muted-foreground truncate mt-0.5 md:mt-1">
                          {lastMessage.text}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
