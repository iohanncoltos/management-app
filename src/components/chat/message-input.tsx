"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Paperclip, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";

interface MessageInputProps {
  chatId: string;
  onFileSelect?: (file: File) => Promise<{ url: string; name: string; size: number; mime: string }>;
}

export function MessageInput({ chatId, onFileSelect }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    name: string;
    size: number;
    mime: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Auto-resize textarea as content grows
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    // Set height to scrollHeight to fit content
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [content]);

  const sendMutation = useMutation({
    mutationFn: async ({
      content,
      fileData,
    }: {
      content: string;
      fileData?: { url: string; name: string; size: number; mime: string };
    }) => {
      const res = await fetch(`/api/chat/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          fileUrl: fileData?.url,
          fileName: fileData?.name,
          fileSize: fileData?.size,
          fileMime: fileData?.mime,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send message");
      }

      return res.json();
    },
    onSuccess: () => {
      setContent("");
      setSelectedFile(null);
      setUploadedFile(null);
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (error) => {
      toast.error("Failed to send message", {
        description: error instanceof Error ? error.message : "Try again",
      });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large", { description: "Maximum file size is 10MB" });
      return;
    }

    setSelectedFile(file);

    // If onFileSelect is provided, upload the file
    if (onFileSelect) {
      try {
        toast.info("Uploading file...");
        const fileData = await onFileSelect(file);
        setUploadedFile(fileData);
        toast.success("File uploaded");
      } catch (error) {
        toast.error("Failed to upload file");
        setSelectedFile(null);
      }
    }
  };

  const handleSend = () => {
    if (!content.trim() && !uploadedFile) return;

    sendMutation.mutate({
      content: content.trim(),
      fileData: uploadedFile || undefined,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="border-t p-2 md:p-4">
      {selectedFile && (
        <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded text-xs md:text-sm">
          <Icon icon={Paperclip} className="h-4 w-4" />
          <span className="flex-1 truncate">{selectedFile.name}</span>
          <Button variant="ghost" size="sm" onClick={removeFile} className="h-7 w-7 p-0">
            <Icon icon={X} className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex gap-1.5 md:gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="*/*"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={sendMutation.isPending}
          className="h-10 w-10 md:h-11 md:w-11 shrink-0"
        >
          <Icon icon={Paperclip} className="h-4 w-4 md:h-5 md:w-5" />
        </Button>

        <Textarea
          ref={textareaRef}
          placeholder="Type a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={sendMutation.isPending}
          className="resize-none min-h-[40px] md:min-h-[44px] max-h-[160px] md:max-h-[200px] overflow-y-auto text-sm md:text-base"
          rows={1}
        />

        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={sendMutation.isPending || (!content.trim() && !uploadedFile)}
          className="h-10 w-10 md:h-11 md:w-11 shrink-0"
        >
          <Icon icon={Send} className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
      </div>
    </div>
  );
}
