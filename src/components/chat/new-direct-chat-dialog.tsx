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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

interface NewDirectChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (chatId: string) => void;
  currentUserId: string;
}

export function NewDirectChatDialog({
  open,
  onOpenChange,
  onChatCreated,
  currentUserId,
}: NewDirectChatDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
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
    mutationFn: async (userId: string) => {
      const res = await fetch("/api/chat/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create chat");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      toast.success("Chat created");
      onChatCreated(data.chat.id);
      onOpenChange(false);
      setSelectedUserId(null);
      setSearch("");
    },
    onError: (error) => {
      toast.error("Failed to create chat", {
        description: error instanceof Error ? error.message : "Try again",
      });
    },
  });

  const filteredUsers = users
    ?.filter((user) => user.id !== currentUserId)
    .filter((user) => {
      const searchLower = search.toLowerCase();
      return (
        user.name?.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    });

  const handleCreateChat = () => {
    if (!selectedUserId) return;
    createChatMutation.mutate(selectedUserId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Direct Message</DialogTitle>
          <DialogDescription>Select a user to start a conversation</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <ScrollArea className="h-[300px] rounded border">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading users...</div>
            ) : filteredUsers && filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No users found</div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredUsers?.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors",
                      selectedUserId === user.id && "bg-accent"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback>
                        {(user.name || user.email).substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{user.name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    {selectedUserId === user.id && <Check className="h-5 w-5 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateChat}
              disabled={!selectedUserId || createChatMutation.isPending}
            >
              {createChatMutation.isPending ? "Creating..." : "Start Chat"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
