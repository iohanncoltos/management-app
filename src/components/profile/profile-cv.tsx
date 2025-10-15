"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, Download, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

interface ProfileCVUploaderProps {
  cvUrl: string | null;
  cvFileName: string | null;
  onCVChange: (url: string | null, fileName: string | null) => Promise<void> | void;
}

export function ProfileCVUploader({ cvUrl, cvFileName, onCVChange }: ProfileCVUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [currentCV, setCurrentCV] = useState<{ url: string | null; fileName: string | null }>({
    url: cvUrl,
    fileName: cvFileName,
  });
  const [isPending, startTransition] = useTransition();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Unsupported file", { description: "Please upload a PDF or Word document." });
      return;
    }

    if (file.size > MAX_SIZE) {
      toast.error("File too large", { description: "Select a file smaller than 10 MB." });
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/profile/cv", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message ?? "Unable to upload CV");
        }

        const payload = await response.json();
        const newUrl = payload.cvUrl ?? null;
        const newFileName = payload.cvFileName ?? null;

        setCurrentCV({ url: newUrl, fileName: newFileName });
        await onCVChange(newUrl, newFileName);
        toast.success("CV uploaded successfully");
      } catch (error) {
        toast.error("Upload failed", { description: error instanceof Error ? error.message : "Try again" });
      } finally {
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    });
  };

  const handleRemove = () => {
    if (!currentCV.url) return;
    startTransition(async () => {
      try {
        const response = await fetch("/api/profile/cv", { method: "DELETE" });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message ?? "Unable to remove CV");
        }
        setCurrentCV({ url: null, fileName: null });
        await onCVChange(null, null);
        toast.success("CV removed");
      } catch (error) {
        toast.error("Remove failed", { description: error instanceof Error ? error.message : "Try again" });
      }
    });
  };

  const handleDownload = () => {
    if (!currentCV.url) return;

    // Use the secure download API route - it will redirect to the signed URL
    window.open("/api/profile/cv/me", "_blank");
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-secondary/40 p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Curriculum Vitae</p>
            <p className="text-xs text-muted-foreground">
              Upload your CV in PDF or Word format (max 10 MB).
            </p>
            {currentCV.fileName && (
              <p className="mt-1 text-xs font-medium text-foreground">
                Current: {currentCV.fileName}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {currentCV.url ? "Replace CV" : "Upload CV"}
            </Button>
            {currentCV.url && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={handleDownload}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={handleRemove}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
