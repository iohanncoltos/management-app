"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Paperclip, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";
import { MentionAutocomplete, type MentionUser } from "@/components/chat/mention-autocomplete";
import { findMentionTrigger, getMentionQuery, formatMention } from "@/lib/utils/mentions";

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
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionTriggerPos, setMentionTriggerPos] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Fetch chat members for mentions
  const { data: chatMembers } = useQuery({
    queryKey: ["chat-members", chatId],
    queryFn: async () => {
      const res = await fetch(`/api/chat/${chatId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      const data = await res.json();
      return data.members as MentionUser[];
    },
  });

  // Auto-resize textarea as content grows
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    // Set height to scrollHeight to fit content
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [content]);

  // Detect mention trigger
  useEffect(() => {
    const triggerPos = findMentionTrigger(content, cursorPosition);

    if (triggerPos !== null) {
      setMentionTriggerPos(triggerPos);
      const query = getMentionQuery(content, triggerPos, cursorPosition);
      setMentionQuery(query);
      setSelectedMentionIndex(0);
    } else {
      setMentionTriggerPos(null);
      setMentionQuery("");
    }
  }, [content, cursorPosition]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setCursorPosition(e.target.selectionStart);
  };

  const handleSelect = () => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
    }
  };

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
      } catch {
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
    // Handle mention autocomplete navigation
    if (mentionTriggerPos !== null && chatMembers) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const showAll = "all".includes(mentionQuery.toLowerCase()) || mentionQuery === "";
        const totalOptions = (showAll ? 1 : 0) + chatMembers.length;
        setSelectedMentionIndex((prev) => (prev + 1) % totalOptions);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const showAll = "all".includes(mentionQuery.toLowerCase()) || mentionQuery === "";
        const totalOptions = (showAll ? 1 : 0) + chatMembers.length;
        setSelectedMentionIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleMentionSelect();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionTriggerPos(null);
        return;
      }
    }

    // Send message on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMentionSelect = () => {
    if (mentionTriggerPos === null || !chatMembers) return;

    const showAll = "all".includes(mentionQuery.toLowerCase()) || mentionQuery === "";
    let selectedOption: MentionUser | "all";

    if (showAll && selectedMentionIndex === 0) {
      selectedOption = "all";
    } else {
      const userIndex = showAll ? selectedMentionIndex - 1 : selectedMentionIndex;
      selectedOption = chatMembers[userIndex];
    }

    insertMention(selectedOption);
  };

  const insertMention = (selected: MentionUser | "all") => {
    if (mentionTriggerPos === null) return;

    const before = content.substring(0, mentionTriggerPos);
    const after = content.substring(cursorPosition);

    let mentionText: string;
    if (selected === "all") {
      mentionText = "@all";
    } else {
      mentionText = formatMention(selected.name || selected.email, selected.id);
    }

    const newContent = before + mentionText + " " + after;
    setContent(newContent);
    setMentionTriggerPos(null);
    setMentionQuery("");
    setSelectedMentionIndex(0);

    // Set cursor position after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = before.length + mentionText.length + 1;
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = newPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="border-t p-2 md:p-4 relative">
      {selectedFile && (
        <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded text-xs md:text-sm">
          <Icon icon={Paperclip} className="h-4 w-4" />
          <span className="flex-1 truncate">{selectedFile.name}</span>
          <Button variant="ghost" size="sm" onClick={removeFile} className="h-7 w-7 p-0">
            <Icon icon={X} className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Mention Autocomplete */}
      {mentionTriggerPos !== null && chatMembers && (
        <MentionAutocomplete
          users={chatMembers}
          query={mentionQuery}
          selectedIndex={selectedMentionIndex}
          onSelect={insertMention}
        />
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
          placeholder="Type a message... (@mention users or @all)"
          value={content}
          onChange={handleContentChange}
          onSelect={handleSelect}
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
