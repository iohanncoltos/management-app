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
        <main
          className="flex-1"
          style={{
            paddingLeft: "var(--shell-padding-x)",
            paddingRight: "var(--shell-padding-x)",
            paddingTop: "var(--shell-padding-top)",
            paddingBottom: "var(--shell-padding-bottom)",
          }}
        >
          <div className="mx-auto flex max-w-6xl flex-col" style={{ gap: "var(--layout-section-gap)" }}>
            {children}
          </div>
        </main>
      </div>
      <AppToaster />
    </div>
  );
}
