import * as React from "react";

import { cn } from "@/lib/utils";

const clamp = (value: number) => Math.min(Math.max(value, 0), 100);

const Progress = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: number }>(
  ({ className, value, ...props }, ref) => {
    const computed = clamp(value ?? 0);
    return (
      <div ref={ref} className={cn("relative h-3 w-full overflow-hidden rounded-full bg-secondary/50", className)} {...props}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-primary shadow-glow transition-all"
          style={{ width: `${computed}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";

export { Progress };
