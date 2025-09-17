import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Intermax Access",
  description: "Secure entry to the Intermax Management platform",
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(176,54,54,0.18),_rgba(15,17,21,0.92))]" />
      <div className="relative z-10 flex w-full max-w-md flex-col gap-6 rounded-3xl border border-border/60 bg-panel-gradient p-8 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
