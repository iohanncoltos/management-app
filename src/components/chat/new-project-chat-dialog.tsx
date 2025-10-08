"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

interface Project {
  id: string;
  code: string;
  name: string;
}

interface NewProjectChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (chatId: string) => void;
}

export function NewProjectChatDialog({
  open,
  onOpenChange,
  onChatCreated,
}: NewProjectChatDialogProps) {
  const [chatName, setChatName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      return data.projects as Project[];
    },
    enabled: open,
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users/list");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      return data.users as User[];
    },
    enabled: open,
  });

  const createChatMutation = useMutation({
    mutationFn: async (data: { projectId: string; name: string; memberUserIds: string[] }) => {
      const res = await fetch("/api/chat/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create chat");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      toast.success("Project chat created");
      onChatCreated(data.chat.id);
      onOpenChange(false);
      // Reset form
      setChatName("");
      setSelectedProjectId("");
      setSelectedUserIds(new Set());
      setSearch("");
    },
    onError: (error) => {
      toast.error("Failed to create chat", {
        description: error instanceof Error ? error.message : "Try again",
      });
    },
  });

  const toggleUser = (userId: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUserIds(newSet);
  };

  const filteredUsers = users?.filter((user) => {
    const searchLower = search.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  const handleCreate = () => {
    if (!selectedProjectId || !chatName.trim() || selectedUserIds.size === 0) {
      toast.error("Please fill all fields and select at least one member");
      return;
    }

    createChatMutation.mutate({
      projectId: selectedProjectId,
      name: chatName.trim(),
      memberUserIds: Array.from(selectedUserIds),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New Project Chat</DialogTitle>
          <DialogDescription>Create a chat room for your project team</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chatName">Chat Name</Label>
            <Input
              id="chatName"
              placeholder="e.g., Project Team Chat"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Members ({selectedUserIds.size} selected)</Label>
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ScrollArea className="h-[250px] rounded border">
              {filteredUsers && filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No users found</div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredUsers?.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => toggleUser(user.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors",
                        selectedUserIds.has(user.id) && "bg-accent"
                      )}
                    >
                      <Checkbox checked={selectedUserIds.has(user.id)} />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback>
                          {(user.name || user.email).substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{user.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !selectedProjectId ||
                !chatName.trim() ||
                selectedUserIds.size === 0 ||
                createChatMutation.isPending
              }
            >
              {createChatMutation.isPending ? "Creating..." : "Create Chat"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
