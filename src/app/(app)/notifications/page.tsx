"use client";

import { useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { NotificationSettings } from "@/components/layout/notification-settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useNotifications,
  useMarkAllAsRead,
  useDeleteNotification,
} from "@/hooks/use-notifications";
import { NotificationItem } from "@/components/layout/notification-item";

export default function NotificationsPage() {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const { data: allData, isLoading: allLoading } = useNotifications({ limit: 50, unreadOnly: false });
  const { data: unreadData, isLoading: unreadLoading } = useNotifications({ limit: 50, unreadOnly: true });
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const data = tab === "all" ? allData : unreadData;
  const isLoading = tab === "all" ? allLoading : unreadLoading;
  const notifications = data?.notifications ?? [];
  const hasNotifications = notifications.length > 0;
  const hasUnread = notifications.some((n) => !n.read);

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleDelete = (id: string) => {
    deleteNotification.mutate(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay updated with your task assignments and progress"
      />

      <NotificationSettings />

      <Card className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread
                {unreadData?.total ? (
                  <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {unreadData.total}
                  </span>
                ) : null}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {hasUnread && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsRead.isPending}
            >
              {markAllAsRead.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Mark all as read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : hasNotifications ? (
          <div className="space-y-1">
            {notifications.map((notification) => (
              <div key={notification.id} className="group relative">
                <NotificationItem notification={notification} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => handleDelete(notification.id)}
                  disabled={deleteNotification.isPending}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Check className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">All caught up!</h3>
            <p className="text-sm text-muted-foreground">
              {tab === "unread" ? "You have no unread notifications" : "You have no notifications"}
            </p>
          </div>
        )}

        {data?.hasMore && (
          <div className="mt-6 text-center">
            <Button variant="outline">Load more</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
