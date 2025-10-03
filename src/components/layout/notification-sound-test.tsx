"use client";

import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationSound } from "@/hooks/use-notification-sound";

/**
 * Test button for notification sound
 * Can be temporarily added to topbar for testing
 */
export function NotificationSoundTest() {
  const { playSound, canPlay } = useNotificationSound();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        console.log("🔊 Testing notification sound...");
        playSound();
      }}
      title="Test notification sound"
    >
      <Volume2 className="h-4 w-4 mr-2" />
      Test Sound {!canPlay && "(Click to enable)"}
    </Button>
  );
}
