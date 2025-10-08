"use client";

import { useQuery } from "@tanstack/react-query";
import { format, isToday, isYesterday } from "date-fns";
import { File, Download } from "lucide-react";
import { useEffect, useRef } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileMime: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  replyTo?: {
    id: string;
    content: string;
    sender: {
      id: string;
      name: string | null;
    };
  } | null;
}

interface MessageListProps {
  chatId: string;
  currentUserId: string;
}

function formatMessageDate(date: Date) {
  if (isToday(date)) {
    return format(date, "h:mm a");
  }
  if (isYesterday(date)) {
    return `Yesterday ${format(date, "h:mm a")}`;
  }
  return format(date, "MMM d, h:mm a");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function MessageList({ chatId, currentUserId }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  const { data, isLoading } = useQuery({
    queryKey: ["messages", chatId],
    queryFn: async () => {
      const res = await fetch(`/api/chat/${chatId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      return data.messages as Message[];
    },
    refetchInterval: 3000, // Poll every 3 seconds
    enabled: !!chatId,
  });

  const messages = data ?? [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [isLoading, chatId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-2 md:p-4 space-y-3 md:space-y-4">
        {messages.map((message, index) => {
          const isCurrentUser = message.sender.id === currentUserId;
          const showAvatar = !isCurrentUser;
          const previousMessage = index > 0 ? messages[index - 1] : null;
          const isGrouped =
            previousMessage &&
            previousMessage.sender.id === message.sender.id &&
            new Date(message.createdAt).getTime() -
              new Date(previousMessage.createdAt).getTime() <
              60000; // Within 1 minute

          return (
            <div
              key={message.id}
              className={cn(
                "flex gap-2 md:gap-3",
                isCurrentUser && "flex-row-reverse",
                isGrouped && "mt-1"
              )}
            >
              {showAvatar && !isGrouped && (
                <Avatar className="h-7 w-7 md:h-8 md:w-8 shrink-0">
                  <AvatarImage src={message.sender.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {(message.sender.name || message.sender.email)
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              {showAvatar && isGrouped && <div className="w-7 md:w-8 shrink-0" />}

              <div
                className={cn(
                  "flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] md:max-w-[70%]",
                  isCurrentUser && "items-end"
                )}
              >
                {!isGrouped && !isCurrentUser && (
                  <span className="text-xs font-medium text-muted-foreground px-1">
                    {message.sender.name || message.sender.email}
                  </span>
                )}

                {message.replyTo && (
                  <div className="text-xs bg-muted/50 rounded px-2 py-1 border-l-2 border-primary">
                    <span className="font-medium">{message.replyTo.sender.name}</span>
                    <p className="text-muted-foreground truncate">
                      {message.replyTo.content.substring(0, 50)}
                    </p>
                  </div>
                )}

                <div
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 md:px-3 md:py-2",
                    isCurrentUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                    message.isDeleted && "italic opacity-60"
                  )}
                >
                  <p className="text-sm md:text-base whitespace-pre-wrap break-words">{message.content}</p>

                  {message.fileUrl && !message.isDeleted && (
                    <a
                      href={message.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center gap-2 mt-2 p-2 rounded border active:scale-[0.98] transition-transform",
                        isCurrentUser
                          ? "bg-background text-foreground border-border hover:bg-accent"
                          : "bg-background text-foreground border-border hover:bg-accent"
                      )}
                    >
                      <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-foreground">{message.fileName}</p>
                        {message.fileSize && (
                          <p className="text-xs text-muted-foreground">{formatFileSize(message.fileSize)}</p>
                        )}
                      </div>
                      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </a>
                  )}

                  {message.isEdited && !message.isDeleted && (
                    <span className="text-xs opacity-70 ml-2">(edited)</span>
                  )}
                </div>

                <span className={cn("text-xs text-muted-foreground px-1")}>
                  {formatMessageDate(new Date(message.createdAt))}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
