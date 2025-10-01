import type { Metadata } from "next";
import { Rajdhani, Inter } from "next/font/google";
import { ReactNode } from "react";

import "@/styles/globals.css";

import { AppProviders } from "@/components/providers/app-providers";
import { auth } from "@/lib/auth";
import { getUserPreferences } from "@/lib/services/preferences-service";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-rajdhani" });

export const metadata: Metadata = {
  title: "Intermax Management App",
  description: "Mission-critical program and project execution platform",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const session = await auth();
  const preferences = await getUserPreferences(session?.user?.id ?? null);

  const themeAttr = preferences.theme === "LIGHT" ? "light" : "dark";
  const densityAttr = preferences.density === "COMPACT" ? "compact" : "comfortable";

  return (
    <html lang="en" className="bg-background text-foreground" data-theme={themeAttr} data-density={densityAttr}>
      <body className={`${inter.variable} ${rajdhani.variable} min-h-screen bg-background font-sans`} data-theme={themeAttr} data-density={densityAttr}>
        <AppProviders session={session} initialTheme={preferences.theme} initialDensity={preferences.density}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
