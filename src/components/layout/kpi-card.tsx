import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface KPIProps {
  title: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon?: ReactNode;
  className?: string;
}

export function KpiCard({ title, value, delta, trend = "flat", icon, className }: KPIProps) {
  const trendColor = trend === "up" ? "text-chart-teal" : trend === "down" ? "text-destructive" : "text-muted-foreground";
  const deltaPrefix = trend === "down" ? "-" : trend === "up" ? "+" : "";

  return (
    <div className={cn("relative flex flex-col gap-3 rounded-3xl border border-border/60 bg-panel-gradient p-6 shadow-card", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <div className="flex items-end justify-between">
        <span className="font-display text-3xl font-semibold text-foreground">{value}</span>
        {delta ? <span className={cn("text-xs font-semibold", trendColor)}>{deltaPrefix}{delta}</span> : null}
      </div>
    </div>
  );
}
