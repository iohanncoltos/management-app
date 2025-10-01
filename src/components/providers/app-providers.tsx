"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { ReactNode } from "react";

import { QueryProvider } from "./query-provider";
import { PreferencesProvider, type LayoutDensityOption, type ThemeOption } from "./preferences-provider";

interface AppProvidersProps {
  children: ReactNode;
  session: Session | null;
  initialTheme: ThemeOption;
  initialDensity: LayoutDensityOption;
}

export function AppProviders({ children, session, initialTheme, initialDensity }: AppProvidersProps) {
  return (
    <SessionProvider session={session}>
      <PreferencesProvider initialTheme={initialTheme} initialDensity={initialDensity}>
        <QueryProvider>{children}</QueryProvider>
      </PreferencesProvider>
    </SessionProvider>
  );
}
