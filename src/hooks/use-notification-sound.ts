"use client";

import { useEffect, useRef, useState } from "react";

// Fallback notification sound as data URI (simple beep)
// This is a base64-encoded simple notification sound
const FALLBACK_SOUND = "data:audio/wav;base64,UklGRhwAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAABkYXRhAAAA";

/**
 * Hook to play notification sound
 * Respects user preferences and browser autoplay policy
 */
export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [canPlay, setCanPlay] = useState(false);
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    // Create audio element - try WAV first, then MP3, then fallback
    const loadAudio = async () => {
      const soundFiles = [
        "/sounds/notification.wav",  // Your custom WAV file
        "/sounds/notification.mp3",  // Fallback MP3
      ];

      for (const soundFile of soundFiles) {
        try {
          const audio = new Audio(soundFile);
          audio.volume = 0.5; // 50% volume

          // Test if the file loads
          await new Promise((resolve, reject) => {
            audio.addEventListener("canplaythrough", resolve, { once: true });
            audio.addEventListener("error", reject, { once: true });
            audio.load();
          });

          audioRef.current = audio;
          console.log(`✓ Loaded notification sound: ${soundFile}`);
          return; // Success, exit the loop
        } catch {
          console.log(`⚠ Failed to load ${soundFile}, trying next...`);
        }
      }

      // If all files failed, use embedded fallback
      console.log("ℹ Using embedded fallback notification sound");
      audioRef.current = new Audio(FALLBACK_SOUND);
      audioRef.current.volume = 0.3;

      // Check if we can play (some browsers require user interaction first)
      try {
        if (audioRef.current) {
          // Enable playback after user interaction
          const promise = audioRef.current.play();
          if (promise !== undefined) {
            await promise;
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setCanPlay(true);
            hasPlayedRef.current = false;
          }
        }
      } catch {
        // Browser blocked autoplay - will work after first user click
        console.log("ℹ Notification sound will play after first user interaction");
        setCanPlay(false);
      }
    };

    loadAudio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playSound = async () => {
    if (!audioRef.current) {
      return;
    }

    try {
      // Enable play on first user interaction
      if (!canPlay && !hasPlayedRef.current) {
        hasPlayedRef.current = true;
        setCanPlay(true);
      }

      audioRef.current.currentTime = 0; // Reset to start
      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (error) {
      console.error("Failed to play notification sound:", error);
    }
  };

  return { playSound, canPlay };
}
