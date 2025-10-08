"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useNotificationSound } from "./use-notification-sound";

interface UnreadChatCountResponse {
  count: number;
}

/**
 * Fetch unread chat message count
 */
export function useUnreadChatCount() {
  return useQuery<UnreadChatCountResponse>({
    queryKey: ["chat", "unread-count"],
    queryFn: async () => {
      const response = await fetch("/api/chat/unread");
      if (!response.ok) {
        throw new Error("Failed to fetch unread chat count");
      }
      return response.json();
    },
    refetchInterval: 30000, // Poll every 30 seconds
    refetchIntervalInBackground: false, // Stop polling when tab is inactive
    staleTime: 20000, // Consider data stale after 20 seconds
  });
}

/**
 * Play sound when new chat messages arrive
 */
export function useChatAlerts() {
  const { data } = useUnreadChatCount();
  const { playSound } = useNotificationSound();
  const previousCountRef = useRef<number | null>(null);
  const lastPlayedRef = useRef<number>(0);

  useEffect(() => {
    if (!data) return;

    const currentCount = data.count;
    const previousCount = previousCountRef.current;

    // Initialize on first load (don't play sound)
    if (previousCount === null) {
      previousCountRef.current = currentCount;
      return;
    }

    // Play sound only if count increased (new message arrived)
    // And not within the last 2 seconds (prevent duplicate sounds)
    const now = Date.now();
    const timeSinceLastPlay = now - lastPlayedRef.current;

    if (currentCount > previousCount && timeSinceLastPlay > 2000) {
      console.log(`💬 New chat message! Count: ${previousCount} → ${currentCount}`);
      playSound();
      lastPlayedRef.current = now;
    }

    previousCountRef.current = currentCount;
  }, [data, playSound]);
}
