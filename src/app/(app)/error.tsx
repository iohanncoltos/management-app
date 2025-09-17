"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
      <h1 className="font-display text-3xl font-semibold text-foreground">System disruption detected</h1>
      <p className="max-w-lg text-sm text-muted-foreground">
        An unexpected fault interrupted this operation. Attempt to reinitialize, or contact the Intermax command team if the condition persists.
      </p>
      <Button onClick={() => reset()}>Retry</Button>
    </div>
  );
}
