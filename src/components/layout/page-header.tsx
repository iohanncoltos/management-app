import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string | ReactNode;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-2xl border border-border/60 bg-panel-gradient p-4 shadow-card sm:rounded-3xl sm:p-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          {description ? <p className="text-xs text-muted-foreground sm:text-sm">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
