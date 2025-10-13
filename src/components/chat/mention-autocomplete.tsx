"use client";

import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface MentionUser {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

interface MentionAutocompleteProps {
  users: MentionUser[];
  query: string;
  selectedIndex: number;
  onSelect: (user: MentionUser | "all") => void;
  position?: { top: number; left: number };
}

export function MentionAutocomplete({
  users,
  query,
  selectedIndex,
  onSelect,
  position,
}: MentionAutocompleteProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Filter users based on query
  const filteredUsers = users.filter((user) => {
    const searchText = query.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchText) ||
      user.email.toLowerCase().includes(searchText)
    );
  });

  // Add @all option if it matches
  const showAll = "all".includes(query.toLowerCase()) || query === "";
  const options: Array<MentionUser | "all"> = [];
  if (showAll) {
    options.push("all");
  }
  options.push(...filteredUsers);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      selectedRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  if (options.length === 0) {
    return null;
  }

  const handleClick = (option: MentionUser | "all") => {
    onSelect(option);
  };

  return (
    <div
      className="absolute z-50 w-80 rounded-lg border border-border bg-popover shadow-lg"
      style={
        position
          ? { top: `${position.top}px`, left: `${position.left}px` }
          : undefined
      }
    >
      <ScrollArea className="max-h-64" ref={scrollRef}>
        <div className="p-1">
          {options.map((option, index) => {
            const isSelected = index === selectedIndex;

            if (option === "all") {
              return (
                <div
                  key="all"
                  ref={isSelected ? selectedRef : undefined}
                  onClick={() => handleClick("all")}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors",
                    isSelected
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    @
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">all</p>
                    <p className="text-xs text-muted-foreground">
                      Notify everyone in this chat
                    </p>
                  </div>
                </div>
              );
            }

            const user = option as MentionUser;
            return (
              <div
                key={user.id}
                ref={isSelected ? selectedRef : undefined}
                onClick={() => handleClick(user)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors",
                  isSelected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {(user.name || user.email).substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{user.name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
