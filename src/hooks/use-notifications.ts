"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useNotificationSound } from "./use-notification-sound";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  taskId: string | null;
  projectId: string | null;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
  task?: {
    id: string;
    title: string;
  };
  project?: {
    id: string;
    name: string;
    code: string;
  };
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  hasMore: boolean;
}

interface UnreadCountResponse {
  count: number;
}

/**
 * Fetch unread notification count
 */
export function useUnreadCount() {
  return useQuery<UnreadCountResponse>({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const response = await fetch("/api/notifications/unread-count");
      if (!response.ok) {
        throw new Error("Failed to fetch unread count");
      }
      return response.json();
    },
    refetchInterval: 30000, // Poll every 30 seconds
    refetchIntervalInBackground: false, // Stop polling when tab is inactive
    staleTime: 20000, // Consider data stale after 20 seconds
  });
}

/**
 * Fetch user notifications with pagination
 */
export function useNotifications(options?: { limit?: number; offset?: number; unreadOnly?: boolean }) {
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  const unreadOnly = options?.unreadOnly ?? false;

  return useQuery<NotificationsResponse>({
    queryKey: ["notifications", { limit, offset, unreadOnly }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        unreadOnly: unreadOnly.toString(),
      });
      const response = await fetch(`/api/notifications?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      return response.json();
    },
    staleTime: 20000,
  });
}

/**
 * Mark notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Failed to mark all as read");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/**
 * Delete notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/**
 * Play sound when new notifications arrive
 */
export function useNotificationAlerts() {
  const { data } = useUnreadCount();
  const { playSound } = useNotificationSound();
  const previousCountRef = useRef<number>(0);

  useEffect(() => {
    if (!data) return;

    const currentCount = data.count;
    const previousCount = previousCountRef.current;

    // Play sound only if count increased (new notification arrived)
    if (currentCount > previousCount && previousCount > 0) {
      playSound();
    }

    previousCountRef.current = currentCount;
  }, [data, playSound]);
}
