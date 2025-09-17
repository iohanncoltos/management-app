import { ReactNode } from "react";

import { AppToaster } from "@/components/ui/toaster";
import { Sidebar, type SidebarUser } from "./sidebar";
import { Topbar } from "./topbar";

interface AppShellProps {
  user: SidebarUser;
  children: ReactNode;
  footer?: ReactNode;
}

export function AppShell({ user, children, footer }: AppShellProps) {
  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      <Sidebar user={user} footer={footer} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 px-6 pb-10 pt-6">
          <div className="mx-auto max-w-6xl space-y-6">{children}</div>
        </main>
      </div>
      <AppToaster />
    </div>
  );
}
