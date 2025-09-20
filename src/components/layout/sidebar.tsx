"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type NavItem, primaryNav, secondaryNav } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { BadgeCheck, Menu } from "lucide-react";
import { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export type SidebarUser = {
  name: string;
  email: string;
  role: string | null;
  permissions: string[];
};

interface SidebarProps {
  user: SidebarUser;
  footer?: ReactNode;
}

function canAccess(item: NavItem, userPermissions: string[]) {
  if (!item.permissions || item.permissions.length === 0) {
    return true;
  }

  const { permissions, requiresAllPermissions } = item;
  if (requiresAllPermissions) {
    return permissions.every((permission) => userPermissions.includes(permission));
  }

  return permissions.some((permission) => userPermissions.includes(permission));
}

function NavigationList({ items, userPermissions }: { items: NavItem[]; userPermissions: string[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items
        .filter((item) => canAccess(item, userPermissions))
        .map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                isActive
                  ? "bg-panel-gradient text-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-secondary/60 text-muted-foreground group-hover:text-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
    </nav>
  );
}

function SidebarContent({ user, footer }: { user: SidebarUser; footer?: ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="group">
          <p className="font-display text-lg font-semibold tracking-wide group-hover:text-accent">Intermax</p>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground group-hover:text-foreground">Command</p>
        </Link>
        <BadgeCheck className="h-5 w-5 text-accent" />
      </div>
      <div className="flex flex-col gap-8">
        <NavigationList items={primaryNav} userPermissions={user.permissions} />
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin & Alerts</p>
          <NavigationList items={secondaryNav} userPermissions={user.permissions} />
        </div>
      </div>
      <div className="mt-auto space-y-4">
        <div className="rounded-3xl border border-border/60 bg-secondary/60 p-4">
          <p className="text-sm font-semibold text-foreground">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-2 inline-flex rounded-xl bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
            {user.role ?? "Unassigned"}
          </p>
        </div>
        {footer}
      </div>
    </div>
  );
}

export function Sidebar({ user, footer }: SidebarProps) {
  return (
    <aside className="hidden h-full w-72 shrink-0 border-r border-border/60 bg-background/80 p-6 lg:block">
      <SidebarContent user={user} footer={footer} />
    </aside>
  );
}

export function MobileSidebar({ user, footer }: SidebarProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 border-border/60 bg-background/95">
        <SidebarContent user={user} footer={footer} />
      </SheetContent>
    </Sheet>
  );
}
