"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "", label: "Overview" },
  { href: "gantt", label: "Gantt" },
  { href: "tasks", label: "Tasks" },
  { href: "files", label: "Files" },
  { href: "budget", label: "Budget" },
];

interface ProjectTabsProps {
  basePath: string;
}

export function ProjectTabs({ basePath }: ProjectTabsProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-secondary/40 p-2">
      {tabs.map((tab) => {
        const href = tab.href ? `${basePath}/${tab.href}` : basePath;
        const active = pathname === href;
        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              "rounded-2xl px-4 py-2 text-sm font-medium transition-all",
              active ? "bg-background text-foreground shadow-glow" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
