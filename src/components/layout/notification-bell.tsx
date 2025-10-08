"use client";

import { Bell } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUnreadCount, useNotificationAlerts } from "@/hooks/use-notifications";
import { Icon } from "@/components/ui/icon";

import { NotificationDropdown } from "./notification-dropdown";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: unreadData } = useUnreadCount();

  // Play sound when new notifications arrive
  useNotificationAlerts();

  const unreadCount = unreadData?.count ?? 0;
  const hasUnread = unreadCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications ${hasUnread ? `(${unreadCount} unread)` : ""}`}
        >
          <Icon icon={Bell} className={`h-5 w-5 ${hasUnread ? "animate-pulse" : ""}`} />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end">
        <NotificationDropdown onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
