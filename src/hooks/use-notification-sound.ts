"use client";

import { useEffect, useRef, useState } from "react";

import { useNotificationPreferences } from "./use-notification-preferences";

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
  const { data: preferences } = useNotificationPreferences();

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
          audio.preload = "auto"; // Preload the audio

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
    };

    loadAudio();

    // Unlock audio on any user interaction
    const unlockAudio = async () => {
      if (!audioRef.current || canPlay) return;

      try {
        // Try to play and immediately pause
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setCanPlay(true);
          console.log("✓ Audio unlocked - notifications will now play sound");
        }
      } catch {
        // Still locked, will try again on next interaction
        console.log("⏳ Audio not yet unlocked, waiting for user interaction...");
      }
    };

    // Listen for user interactions to unlock audio
    const events = ["click", "touchstart", "keydown"];
    events.forEach((event) => {
      document.addEventListener(event, unlockAudio, { once: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, unlockAudio);
      });
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [canPlay]);

  const playSound = async () => {
    if (!audioRef.current) {
      console.warn("⚠ Audio not loaded yet");
      return;
    }

    // Check if sound notifications are enabled
    const soundEnabled = preferences?.notificationSound ?? true;
    if (!soundEnabled) {
      console.log("🔇 Sound notifications disabled");
      return;
    }

    // Check if Do Not Disturb is active
    if (preferences?.doNotDisturbUntil) {
      const dndUntil = new Date(preferences.doNotDisturbUntil);
      if (dndUntil > new Date()) {
        console.log("🔕 Do Not Disturb is active, skipping sound");
        return;
      }
    }

    try {
      // Reset to start
      audioRef.current.currentTime = 0;

      // Attempt to play
      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        await playPromise;
        console.log("🔊 Notification sound played");

        // Mark as unlocked after first successful play
        if (!canPlay) {
          setCanPlay(true);
        }
      }
    } catch (err) {
      // If play failed, try to unlock audio first
      if (!canPlay) {
        console.log("⏳ Audio not unlocked yet. It will play after any click/tap on the page.");
      } else {
        console.error("❌ Failed to play notification sound:", err);
      }
    }
  };

  return { playSound, canPlay };
}
