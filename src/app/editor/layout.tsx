import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Inter } from "next/font/google";

import { auth } from "@/lib/auth";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

interface EditorLayoutProps {
  children: ReactNode;
}

export default async function EditorLayout({ children }: EditorLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Minimal layout without AppShell for full-screen editing
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`min-h-screen bg-background font-sans antialiased ${inter.variable}`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}