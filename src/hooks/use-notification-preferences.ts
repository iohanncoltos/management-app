"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface NotificationPreferences {
  notificationSound: boolean;
  emailNotifications: boolean;
  desktopNotifications: boolean;
  doNotDisturbUntil: string | null;
}

/**
 * Fetch user's notification preferences
 */
export function useNotificationPreferences() {
  return useQuery<NotificationPreferences>({
    queryKey: ["preferences", "notifications"],
    queryFn: async () => {
      const response = await fetch("/api/preferences/notifications");
      if (!response.ok) {
        throw new Error("Failed to fetch notification preferences");
      }
      return response.json();
    },
  });
}

/**
 * Update user's notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      const response = await fetch("/api/preferences/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });
      if (!response.ok) {
        throw new Error("Failed to update notification preferences");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences", "notifications"] });
    },
  });
}
