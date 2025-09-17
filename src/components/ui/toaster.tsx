"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      theme="dark"
      visibleToasts={5}
      toastOptions={{
        classNames: {
          toast: "rounded-3xl border border-border/60 bg-panel-gradient text-foreground shadow-2xl",
          description: "text-sm text-muted-foreground",
          closeButton: "text-muted-foreground hover:text-foreground",
        },
      }}
    />
  );
}
