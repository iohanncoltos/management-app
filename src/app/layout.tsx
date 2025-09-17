import type { Metadata } from "next";
import { Rajdhani, Inter } from "next/font/google";
import { ReactNode } from "react";

import "@/styles/globals.css";

import { AppProviders } from "@/components/providers/app-providers";
import { auth } from "@/lib/auth";

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

  return (
    <html lang="en" className="bg-background text-foreground">
      <body className={`${inter.variable} ${rajdhani.variable} min-h-screen bg-background font-sans`}>
        <AppProviders session={session}>{children}</AppProviders>
      </body>
    </html>
  );
}
