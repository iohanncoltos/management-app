"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  Clock,
  Target,
  TrendingUp,
  CheckCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  TaskWithDetails,
  TaskStatus,
  TASK_PRIORITY_LABELS,
  PRIORITY_COLORS,
} from "@/lib/types/tasks";

interface TodaysFocusProps {
  tasks: TaskWithDetails[];
  onTaskClick?: (task: TaskWithDetails) => void;
  onMarkComplete?: (taskId: string) => void;
}

export function TodaysFocus({ tasks, onTaskClick, onMarkComplete }: TodaysFocusProps) {
  // Categorize tasks
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const overdueTasks = tasks.filter(task =>
    new Date(task.end) < now && task.status !== TaskStatus.COMPLETED
  );

  const dueTodayTasks = tasks.filter(task => {
    const taskEnd = new Date(task.end);
    return taskEnd >= now && taskEnd < tomorrow && task.status !== TaskStatus.COMPLETED;
  });

  const dueSoonTasks = tasks.filter(task => {
    const taskEnd = new Date(task.end);
    return taskEnd >= tomorrow && taskEnd <= threeDaysFromNow && task.status !== TaskStatus.COMPLETED;
  });

  const highPriorityTasks = tasks.filter(task =>
    (task.priority === "HIGH" || task.priority === "CRITICAL") &&
    task.status !== TaskStatus.COMPLETED &&
    !overdueTasks.includes(task) &&
    !dueTodayTasks.includes(task)
  );

  const getUrgencyLevel = (task: TaskWithDetails): "critical" | "high" | "medium" => {
    if (overdueTasks.includes(task)) return "critical";
    if (dueTodayTasks.includes(task) || task.priority === "CRITICAL") return "critical";
    if (dueSoonTasks.includes(task) || task.priority === "HIGH") return "high";
    return "medium";
  };

  const getUrgencyConfig = (level: "critical" | "high" | "medium") => {
    switch (level) {
      case "critical":
        return {
          bgColor: "bg-card dark:bg-card",
          borderColor: "border-red-300 dark:border-red-600",
          textColor: "text-foreground",
          icon: AlertTriangle,
          iconColor: "text-red-600 dark:text-red-400",
        };
      case "high":
        return {
          bgColor: "bg-card dark:bg-card",
          borderColor: "border-orange-300 dark:border-orange-600",
          textColor: "text-foreground",
          icon: Clock,
          iconColor: "text-orange-600 dark:text-orange-400",
        };
      default:
        return {
          bgColor: "bg-card dark:bg-card",
          borderColor: "border-border",
          textColor: "text-foreground",
          icon: Target,
          iconColor: "text-blue-600 dark:text-blue-400",
        };
    }
  };

  const TaskItem = ({ task }: { task: TaskWithDetails }) => {
    const urgencyLevel = getUrgencyLevel(task);
    const config = getUrgencyConfig(urgencyLevel);
    const Icon = config.icon;

    const isOverdue = overdueTasks.includes(task);
    const isDueToday = dueTodayTasks.includes(task);

    return (
      <div
        className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all ${config.bgColor} ${config.borderColor}`}
        onClick={() => onTaskClick?.(task)}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`p-2 rounded-full bg-background dark:bg-background shadow-sm border border-border`}>
                <Icon className={`h-4 w-4 ${config.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm leading-tight mb-1 text-foreground">{task.title}</h4>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 flex flex-col gap-1">
              {isOverdue && (
                <Badge variant="danger" className="text-xs font-medium">Overdue</Badge>
              )}
              {isDueToday && !isOverdue && (
                <Badge variant="warning" className="text-xs font-medium">Due Today</Badge>
              )}
              <Badge className={`${PRIORITY_COLORS[task.priority]} text-xs font-medium`} variant="outline">
                {TASK_PRIORITY_LABELS[task.priority]}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs mt-2">
            <div className="flex items-center gap-3">
              <span className={isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-muted-foreground font-medium"}>
                Due {format(new Date(task.end), "MMM dd")}
              </span>
              {task.project && (
                <span className="text-muted-foreground bg-muted px-2 py-1 rounded text-xs">
                  {task.project.code}
                </span>
              )}
            </div>
            <span className="font-semibold text-foreground">{task.progress}%</span>
          </div>

          <div className="space-y-3 mt-3">
            <div className="space-y-1">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-8 font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskClick?.(task);
                }}
              >
                View Details
              </Button>
              {task.status !== TaskStatus.COMPLETED && (
                <Button
                  size="sm"
                  className="flex-1 text-xs h-8 font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkComplete?.(task.id);
                  }}
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Complete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const allFocusTasks = [
    ...overdueTasks,
    ...dueTodayTasks,
    ...dueSoonTasks,
    ...highPriorityTasks,
  ].slice(0, 6); // Limit to 6 most important tasks

  if (allFocusTasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Today&apos;s Focus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="font-medium text-lg mb-2">All caught up!</h3>
            <p className="text-sm text-muted-foreground">
              No urgent tasks requiring immediate attention.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Today&apos;s Focus
          </CardTitle>
          <div className="flex items-center gap-2">
            {overdueTasks.length > 0 && (
              <Badge variant="danger" className="text-xs">
                {overdueTasks.length} Overdue
              </Badge>
            )}
            {dueTodayTasks.length > 0 && (
              <Badge variant="warning" className="text-xs">
                {dueTodayTasks.length} Due Today
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-orange-600">{dueTodayTasks.length}</div>
              <div className="text-xs text-muted-foreground">Due Today</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">{dueSoonTasks.length}</div>
              <div className="text-xs text-muted-foreground">Due Soon</div>
            </div>
          </div>

          <Separator />

          {/* Priority Tasks */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Priority Tasks</span>
            </div>
            <div className="space-y-3">
              {allFocusTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </div>

          {/* Show More Button */}
          {tasks.filter(t => t.status !== TaskStatus.COMPLETED).length > allFocusTasks.length && (
            <div className="text-center pt-2">
              <Button variant="outline" size="sm" className="text-xs">
                View All Tasks ({tasks.filter(t => t.status !== TaskStatus.COMPLETED).length - allFocusTasks.length} more)
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}