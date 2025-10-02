"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface ProfileAvatarUploaderProps {
  name: string;
  avatarUrl: string | null;
  onAvatarChange: (url: string | null) => Promise<void> | void;
}

function getInitials(name: string) {
  if (!name) return "--";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
    .padEnd(2, " ");
}

export function ProfileAvatarUploader({ name, avatarUrl, onAvatarChange }: ProfileAvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPreviewUrl(avatarUrl);
  }, [avatarUrl]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Unsupported file", { description: "Please upload a JPEG, PNG, GIF, or WebP image." });
      return;
    }

    if (file.size > MAX_SIZE) {
      toast.error("Image too large", { description: "Select an image smaller than 5 MB." });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/profile/avatar", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message ?? "Unable to upload avatar");
        }

        const payload = await response.json();
        await onAvatarChange(payload.avatarUrl ?? null);
        toast.success("Profile photo updated");
      } catch (error) {
        toast.error("Upload failed", { description: error instanceof Error ? error.message : "Try again" });
        setPreviewUrl(avatarUrl);
      } finally {
        URL.revokeObjectURL(objectUrl);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    });
  };

  const handleRemove = () => {
    if (!previewUrl) return;
    startTransition(async () => {
      try {
        const response = await fetch("/api/profile/avatar", { method: "DELETE" });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message ?? "Unable to remove avatar");
        }
        await onAvatarChange(null);
        setPreviewUrl(null);
        toast.success("Profile photo removed");
      } catch (error) {
        toast.error("Remove failed", { description: error instanceof Error ? error.message : "Try again" });
      }
    });
  };

  const initials = getInitials(name);

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-secondary/40 p-4 md:flex-row md:items-center">
      <Avatar className="h-20 w-20 border border-border/60">
        {previewUrl ? (
          <AvatarImage src={previewUrl} alt={name || "Avatar"} />
        ) : (
          <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
        )}
      </Avatar>
      <div className="flex flex-1 flex-col gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Profile photo</p>
          <p className="text-xs text-muted-foreground">Upload a JPG, PNG, GIF, or WebP file up to 5 MB.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(",")} className="hidden" onChange={handleFileChange} />
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => inputRef.current?.click()}>
            {isPending ? "Uploading" : "Upload new"}
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={isPending || !previewUrl} onClick={handleRemove}>
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
