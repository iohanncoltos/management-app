"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Settings, ArrowLeft } from "lucide-react";

import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
    isAdmin: boolean;
  }>;
}

interface ChatWindowProps {
  chatId: string;
  currentUserId: string;
  onFileUpload?: (file: File) => Promise<{ url: string; name: string; size: number; mime: string }>;
  onOpenSettings?: () => void;
  onBackClick?: () => void;
}

export function ChatWindow({ chatId, currentUserId, onFileUpload, onOpenSettings, onBackClick }: ChatWindowProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const res = await fetch(`/api/chat/${chatId}`);
      if (!res.ok) throw new Error("Failed to fetch chat");
      const data = await res.json();
      return data.chat as Chat;
    },
    enabled: !!chatId,
  });

  const chat = data;

  const getChatTitle = () => {
    if (!chat) return "Chat";

    if (chat.type === "PROJECT") {
      return chat.name || chat.project?.name || "Project Chat";
    }

    // For direct chats, show the other user's name
    const otherMember = chat.members.find((m) => m.user.id !== currentUserId);
    return otherMember?.user.name || otherMember?.user.email || "Direct Message";
  };

  const getChatSubtitle = () => {
    if (!chat) return "";

    if (chat.type === "PROJECT" && chat.project) {
      return `${chat.project.code} • ${chat.members.length} members`;
    }

    const otherMember = chat.members.find((m) => m.user.id !== currentUserId);
    return otherMember?.user.email || "";
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Chat not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="border-b p-3 md:p-4 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          {/* Back button for mobile */}
          {onBackClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBackClick}
              className="md:hidden shrink-0 h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          {chat.type === "PROJECT" && (
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm md:text-base truncate">{getChatTitle()}</h2>
            <p className="text-xs md:text-sm text-muted-foreground truncate">{getChatSubtitle()}</p>
          </div>
        </div>
        {onOpenSettings && (
          <Button variant="ghost" size="icon" onClick={onOpenSettings} className="shrink-0 h-9 w-9 md:h-10 md:w-10">
            <Settings className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <MessageList chatId={chatId} currentUserId={currentUserId} />

      {/* Message Input */}
      <div className="shrink-0">
        <MessageInput chatId={chatId} onFileSelect={onFileUpload} />
      </div>
    </div>
  );
}
