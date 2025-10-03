"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, Search, Settings, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { MobileSidebar, type SidebarUser } from "./sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "./notification-bell";

interface TopbarProps {
  user: SidebarUser;
}

export function Topbar({ user }: TopbarProps) {
  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
    .padEnd(2, " ");

  return (
    <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-border/60 bg-background/80 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <MobileSidebar user={user} />
        <div className="relative hidden items-center rounded-2xl border border-border/60 bg-secondary/60 px-4 lg:flex">
          <Search className="mr-2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Quick search" className="h-10 border-none bg-transparent focus-visible:ring-0" />
          <Separator orientation="vertical" className="mx-3 h-6" />
          <span className="text-xs uppercase tracking-widest text-muted-foreground">CTRL + K</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-3 rounded-2xl">
              <Avatar className="h-10 w-10 border border-border/60">
                {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : <AvatarFallback>{initials}</AvatarFallback>}
              </Avatar>
              <div className="flex flex-col items-start leading-4 text-left">
                <span className="text-sm font-semibold text-foreground">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.role ?? ""}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[14rem]">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-sm">
              <Link href="/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-sm">
              <Link href="/preferences" className="flex items-center gap-2">
                <Settings className="h-4 w-4" /> Preferences
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-sm text-destructive" onSelect={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
