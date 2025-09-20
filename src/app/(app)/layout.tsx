import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";

interface AppLayoutProps {
  children: ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = {
    name: session.user.name ?? "Operator",
    email: session.user.email ?? "",
    role: session.user.role,
    permissions: session.user.permissions ?? [],
  } as const;

  return <AppShell user={user}>{children}</AppShell>;
}
