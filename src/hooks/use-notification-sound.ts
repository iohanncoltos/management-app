"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook to play notification sound
 * Respects user preferences and browser autoplay policy
 */
export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [canPlay, setCanPlay] = useState(false);

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio("/sounds/notification.mp3");
    audioRef.current.volume = 0.5; // 50% volume

    // Check if we can play (some browsers require user interaction first)
    const checkCanPlay = async () => {
      try {
        if (audioRef.current) {
          await audioRef.current.play();
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setCanPlay(true);
        }
      } catch {
        // Browser blocked autoplay
        setCanPlay(false);
      }
    };

    checkCanPlay();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playSound = async () => {
    if (!audioRef.current || !canPlay) {
      return;
    }

    try {
      audioRef.current.currentTime = 0; // Reset to start
      await audioRef.current.play();
    } catch (error) {
      console.error("Failed to play notification sound:", error);
    }
  };

  return { playSound, canPlay };
}
