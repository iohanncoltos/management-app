"use client";

import { CheckCircle2, AlertCircle, TrendingUp, Clock, UserPlus } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { cn } from "@/lib/utils";
import { useMarkAsRead } from "@/hooks/use-notifications";

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    actionUrl: string | null;
    read: boolean;
    createdAt: string;
  };
  onClose?: () => void;
}

const iconMap = {
  TASK_ASSIGNED: UserPlus,
  TASK_COMPLETED: CheckCircle2,
  PROGRESS_MILESTONE: TrendingUp,
  TASK_BLOCKED: AlertCircle,
  TASK_REASSIGNED: UserPlus,
};

const colorMap = {
  TASK_ASSIGNED: "text-blue-500",
  TASK_COMPLETED: "text-green-500",
  PROGRESS_MILESTONE: "text-purple-500",
  TASK_BLOCKED: "text-red-500",
  TASK_REASSIGNED: "text-orange-500",
};

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const markAsRead = useMarkAsRead();
  const Icon = iconMap[notification.type as keyof typeof iconMap] || Clock;
  const iconColor = colorMap[notification.type as keyof typeof colorMap] || "text-gray-500";

  const handleClick = () => {
    // Mark as read when clicked
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    onClose?.();
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 p-3 transition-colors hover:bg-accent/50",
        !notification.read && "bg-blue-50 dark:bg-blue-950/20"
      )}
    >
      {/* Icon */}
      <div className={cn("mt-1 flex-shrink-0", iconColor)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-tight">{notification.title}</p>
          {!notification.read && (
            <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" aria-label="Unread" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">{notification.message}</p>
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
      </div>
    </div>
  );

  if (notification.actionUrl) {
    return (
      <Link href={notification.actionUrl} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return <div onClick={handleClick}>{content}</div>;
}
