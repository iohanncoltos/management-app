"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useUnreadChatCount, useChatAlerts } from "@/hooks/use-chat-notifications";
import { Icon } from "@/components/ui/icon";

export function ChatBell() {
  const router = useRouter();
  const { data: unreadData } = useUnreadChatCount();

  // Play sound when new chat messages arrive
  useChatAlerts();

  const unreadCount = unreadData?.count ?? 0;
  const hasUnread = unreadCount > 0;

  const handleClick = () => {
    router.push("/chat");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={`Chat ${hasUnread ? `(${unreadCount} unread)` : ""}`}
      onClick={handleClick}
    >
      <Icon icon={MessageCircle} className={`h-5 w-5 ${hasUnread ? "animate-pulse" : ""}`} />
      {hasUnread && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );
}
