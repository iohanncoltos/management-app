"use client";

import { useRouter } from "next/navigation";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FileUploadProps {
  projectId: string;
  onUploaded?: () => void;
}

export function FileUpload({ projectId, onUploaded }: FileUploadProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleUpload = () => {
    if (!file) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", projectId);

        const res = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? "Unable to upload");
        }

        setFile(null);
        toast.success("File uploaded");
        router.refresh();
        onUploaded?.();
      } catch (error) {
        toast.error("Upload failed", {
          description: error instanceof Error ? error.message : "Check connection and retry.",
        });
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-secondary/40 p-4">
      <Input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      <Button onClick={handleUpload} disabled={!file || isPending}>
        {isPending ? "Transmitting" : "Upload"}
      </Button>
    </div>
  );
}
