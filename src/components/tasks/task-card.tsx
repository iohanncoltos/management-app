"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle,
  Clock,
  Calendar,
  Building,
  AlertTriangle,
  Eye,
  Edit,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  TaskWithDetails,
  TaskStatus,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_CATEGORY_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  CATEGORY_COLORS,
} from "@/lib/types/tasks";

interface TaskCardProps {
  task: TaskWithDetails;
  onTaskUpdate?: () => void;
  onViewDetails?: (task: TaskWithDetails) => void;
  onEditProgress?: (task: TaskWithDetails) => void;
  className?: string;
}

export function TaskCard({
  task,
  onTaskUpdate,
  onViewDetails,
  onEditProgress,
  className = "",
}: TaskCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const isOverdue = new Date(task.end) < new Date() && task.status !== TaskStatus.COMPLETED;
  const isDueSoon = new Date(task.end) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) &&
                   new Date(task.end) >= new Date() &&
                   task.status !== TaskStatus.COMPLETED;

  const getPriorityIcon = () => {
    switch (task.priority) {
      case "CRITICAL":
        return <AlertTriangle className="h-4 w-4" />;
      case "HIGH":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const markComplete = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: 100, status: TaskStatus.COMPLETED }),
      });

      if (!res.ok) {
        throw new Error("Failed to update");
      }

      toast.success("Task marked as complete");
      onTaskUpdate?.();
    } catch {
      toast.error("Unable to update task");
    } finally {
      setIsLoading(false);
    }
  };

  const cardBorderClass = isOverdue
    ? "border-red-500 bg-red-50 dark:bg-red-950/50 dark:border-red-400"
    : isDueSoon
    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/50 dark:border-orange-400"
    : task.priority === "CRITICAL"
    ? "border-red-300 bg-red-25 dark:bg-red-950/30 dark:border-red-500"
    : task.priority === "HIGH"
    ? "border-orange-300 bg-orange-25 dark:bg-orange-950/30 dark:border-orange-500"
    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700";

  return (
    <Card className={`transition-all hover:shadow-md ${cardBorderClass} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1 rounded ${task.priority === "CRITICAL" || task.priority === "HIGH" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                {getPriorityIcon()}
              </div>
              <h3 className="font-semibold text-lg leading-tight truncate text-foreground">{task.title}</h3>
              {isOverdue && (
                <Badge variant="danger" className="text-xs shrink-0">
                  Overdue
                </Badge>
              )}
              {isDueSoon && !isOverdue && (
                <Badge variant="warning" className="text-xs shrink-0">
                  Due Soon
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className={isOverdue ? "text-red-600 font-semibold" : "text-gray-700 dark:text-gray-300 font-medium"}>
                  Due {format(new Date(task.end), "MMM dd, yyyy")}
                </span>
              </div>

              {task.estimatedHours && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{task.estimatedHours}h est.</span>
                </div>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails?.(task)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditProgress?.(task)}>
                <Edit className="mr-2 h-4 w-4" />
                Update Progress
              </DropdownMenuItem>
              {task.status !== TaskStatus.COMPLETED && (
                <DropdownMenuItem onClick={markComplete} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Mark Complete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {task.description && (
          <div className="bg-background/80 dark:bg-muted/40 p-3 rounded-lg border border-border shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground font-medium">{task.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className={PRIORITY_COLORS[task.priority]} variant="outline">
                {TASK_PRIORITY_LABELS[task.priority]}
              </Badge>
              <Badge className={CATEGORY_COLORS[task.category]} variant="outline">
                {TASK_CATEGORY_LABELS[task.category]}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={STATUS_COLORS[task.status]} variant="outline">
                {TASK_STATUS_LABELS[task.status]}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            {task.assignee && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {task.assignee.name?.split(' ').map(n => n[0]).join('') ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-gray-900 dark:text-gray-100">{task.assignee.name}</p>
                  {task.assignee.role?.name && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{task.assignee.role.name}</p>
                  )}
                </div>
              </div>
            )}

            {task.project && (
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-gray-900 dark:text-gray-100">{task.project.code}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{task.project.name}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Progress</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">{task.progress}%</span>
          </div>
          <Progress value={task.progress} className="h-3" />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails?.(task)}
            className="flex-1"
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Button>

          {task.status !== TaskStatus.COMPLETED && (
            <Button
              variant="default"
              size="sm"
              onClick={markComplete}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}