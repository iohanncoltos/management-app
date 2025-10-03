"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNotifications, useMarkAllAsRead } from "@/hooks/use-notifications";

import { NotificationItem } from "./notification-item";

interface NotificationDropdownProps {
  onClose?: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { data, isLoading } = useNotifications({ limit: 10 });
  const markAllAsRead = useMarkAllAsRead();

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const notifications = data?.notifications ?? [];
  const hasNotifications = notifications.length > 0;
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="text-lg font-semibold">Notifications</h3>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending}
            className="h-auto p-1 text-xs"
          >
            {markAllAsRead.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Check className="mr-1 h-3 w-3" />
                Mark all read
              </>
            )}
          </Button>
        )}
      </div>

      <Separator />

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : hasNotifications ? (
        <>
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClose={onClose}
                />
              ))}
            </div>
          </ScrollArea>

          <Separator />

          {/* Footer */}
          <div className="p-2">
            <Link href="/notifications" onClick={onClose}>
              <Button variant="ghost" className="w-full text-sm">
                View all notifications
              </Button>
            </Link>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-2 rounded-full bg-muted p-3">
            <Check className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">All caught up!</p>
          <p className="text-xs text-muted-foreground">No new notifications</p>
        </div>
      )}
    </div>
  );
}
