"use client";

import { CheckCircle, Clock, AlertTriangle, Target, Zap, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  highPriority: number;
  completionRate: number;
}

interface TaskStatsCardsProps {
  stats: TaskStats;
  onQuickAction?: (action: "overdue" | "high-priority" | "in-progress") => void;
}

export function TaskStatsCards({ stats, onQuickAction }: TaskStatsCardsProps) {
  const cards = [
    {
      title: "Total Tasks",
      value: stats.total,
      icon: Target,
      description: "All assigned tasks",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      action: undefined as "overdue" | "high-priority" | "in-progress" | undefined,
      trending: null,
    },
    {
      title: "Completed",
      value: stats.completed,
      icon: CheckCircle,
      description: `${stats.completionRate}% completion rate`,
      color: "text-green-600",
      bgColor: "bg-green-50",
      action: undefined as "overdue" | "high-priority" | "in-progress" | undefined,
      trending: (stats.completionRate >= 75 ? "up" : stats.completionRate >= 50 ? "stable" : "down") as "up" | "down" | "stable" | null,
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      icon: Clock,
      description: "Currently active",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      action: (stats.inProgress > 0 ? "in-progress" : undefined) as "overdue" | "high-priority" | "in-progress" | undefined,
      trending: null,
    },
    {
      title: "Overdue",
      value: stats.overdue,
      icon: AlertTriangle,
      description: "Requires immediate attention",
      color: "text-red-600",
      bgColor: "bg-red-50",
      action: (stats.overdue > 0 ? "overdue" : undefined) as "overdue" | "high-priority" | "in-progress" | undefined,
      trending: null,
    },
    {
      title: "High Priority",
      value: stats.highPriority,
      icon: Zap,
      description: "Urgent tasks",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      action: (stats.highPriority > 0 ? "high-priority" : undefined) as "overdue" | "high-priority" | "in-progress" | undefined,
      trending: null,
    },
  ];

  const getTrendingIcon = (trending: "up" | "down" | "stable" | null) => {
    if (!trending) return null;
    return (
      <div className={`flex items-center gap-1 text-xs ${
        trending === "up" ? "text-green-600" :
        trending === "down" ? "text-red-600" :
        "text-yellow-600"
      }`}>
        <TrendingUp className={`h-3 w-3 ${trending === "down" ? "rotate-180" : ""}`} />
        {trending === "up" ? "Good" : trending === "down" ? "Low" : "Fair"}
      </div>
    );
  };

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActionable = card.action && card.value > 0;
        const isUrgent = (card.title === "Overdue" && card.value > 0) ||
                        (card.title === "High Priority" && card.value > 0);

        return (
          <Card
            key={card.title}
            className={`transition-all hover:shadow-md ${
              isUrgent ? "border-red-200 bg-red-50/50 dark:bg-red-900/20 dark:border-red-700" : ""
            } ${isActionable ? "cursor-pointer" : ""}`}
            onClick={isActionable ? () => onQuickAction?.(card.action!) : undefined}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`${card.bgColor} dark:bg-opacity-20 p-2 rounded-md relative`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
                {isUrgent && (
                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{card.value}</div>
                  {getTrendingIcon(card.trending)}
                </div>

                <p className="text-xs text-muted-foreground">{card.description}</p>

                {card.title === "Completed" && stats.total > 0 && (
                  <div className="space-y-1">
                    <Progress value={stats.completionRate} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {stats.completed} of {stats.total} tasks completed
                    </div>
                  </div>
                )}

                {isActionable && (
                  <Button
                    variant={isUrgent ? "default" : "outline"}
                    size="sm"
                    className="w-full text-xs mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickAction?.(card.action!);
                    }}
                  >
                    {card.title === "Overdue" ? "View Overdue" :
                     card.title === "High Priority" ? "View Priority" :
                     "View Tasks"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}