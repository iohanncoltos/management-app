"use client";

import { Bell, Mail, Monitor, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/use-notification-preferences";
import { useNotificationSound } from "@/hooks/use-notification-sound";

export function NotificationSettings() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const { playSound } = useNotificationSound();
  const [isTestingSound, setIsTestingSound] = useState(false);

  const isDoNotDisturb = preferences?.doNotDisturbUntil
    ? new Date(preferences.doNotDisturbUntil) > new Date()
    : false;

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
      toast.success("Preference updated");
    } catch (error) {
      toast.error("Failed to update preference");
      console.error(error);
    }
  };

  const handleTestSound = () => {
    setIsTestingSound(true);
    playSound();
    setTimeout(() => setIsTestingSound(false), 1000);
  };

  const handleDoNotDisturb = async (duration: string) => {
    try {
      let doNotDisturbUntil: string | null = null;

      if (duration !== "off") {
        const now = new Date();
        switch (duration) {
          case "1h":
            now.setHours(now.getHours() + 1);
            doNotDisturbUntil = now.toISOString();
            break;
          case "4h":
            now.setHours(now.getHours() + 4);
            doNotDisturbUntil = now.toISOString();
            break;
          case "eod":
            now.setHours(23, 59, 59, 999);
            doNotDisturbUntil = now.toISOString();
            break;
        }
      }

      await updatePreferences.mutateAsync({ doNotDisturbUntil });
      toast.success(
        duration === "off" ? "Do Not Disturb disabled" : "Do Not Disturb enabled"
      );
    } catch (error) {
      toast.error("Failed to update Do Not Disturb");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Notification Settings</h3>
      </div>

      <div className="space-y-4">
        {/* Sound Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {preferences?.notificationSound ? (
              <Volume2 className="h-5 w-5 text-muted-foreground" />
            ) : (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            )}
            <Label htmlFor="sound-toggle" className="cursor-pointer">
              Sound Alerts
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestSound}
              disabled={isTestingSound || !preferences?.notificationSound}
            >
              {isTestingSound ? "Playing..." : "Test Sound"}
            </Button>
            <Switch
              id="sound-toggle"
              checked={preferences?.notificationSound ?? true}
              onCheckedChange={(checked) => handleToggle("notificationSound", checked)}
              disabled={updatePreferences.isPending}
            />
          </div>
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <Label htmlFor="email-toggle" className="cursor-pointer">
              Email Notifications
            </Label>
          </div>
          <Switch
            id="email-toggle"
            checked={preferences?.emailNotifications ?? true}
            onCheckedChange={(checked) => handleToggle("emailNotifications", checked)}
            disabled={updatePreferences.isPending}
          />
        </div>

        {/* Desktop Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-muted-foreground" />
            <Label htmlFor="desktop-toggle" className="cursor-pointer">
              Desktop Notifications
            </Label>
          </div>
          <Switch
            id="desktop-toggle"
            checked={preferences?.desktopNotifications ?? false}
            onCheckedChange={(checked) => handleToggle("desktopNotifications", checked)}
            disabled={updatePreferences.isPending}
          />
        </div>

        {/* Do Not Disturb */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-3">
            <VolumeX className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label className="cursor-pointer">Do Not Disturb</Label>
              {isDoNotDisturb && preferences?.doNotDisturbUntil && (
                <p className="text-xs text-muted-foreground">
                  Until {new Date(preferences.doNotDisturbUntil).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          <Select
            value={isDoNotDisturb ? "active" : "off"}
            onValueChange={handleDoNotDisturb}
            disabled={updatePreferences.isPending}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off</SelectItem>
              <SelectItem value="1h">For 1 hour</SelectItem>
              <SelectItem value="4h">For 4 hours</SelectItem>
              <SelectItem value="eod">Until end of day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
