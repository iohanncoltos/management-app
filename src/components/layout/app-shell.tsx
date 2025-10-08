"use client";

import { ReactNode } from "react";

import { AppToaster } from "@/components/ui/toaster";
import { useNotificationAlerts } from "@/hooks/use-notifications";
import { Sidebar, type SidebarUser } from "./sidebar";
import { Topbar } from "./topbar";

interface AppShellProps {
  user: SidebarUser;
  children: ReactNode;
  footer?: ReactNode;
}

export function AppShell({ user, children, footer }: AppShellProps) {
  // Enable notification sound alerts
  useNotificationAlerts();

  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      <Sidebar user={user} footer={footer} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:gap-6">
            {children}
          </div>
        </main>
      </div>
      <AppToaster />
    </div>
  );
}
