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
  MoreHorizontal,
  Loader2,
  Copy,
  Trash2,
  User,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  TaskWithDetails,
  TaskStatus,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from "@/lib/types/tasks";

interface TaskCardProps {
  task: TaskWithDetails;
  onTaskUpdate?: () => void;
  onViewDetails?: (task: TaskWithDetails) => void;
  onEditProgress?: (task: TaskWithDetails) => void;
  onDuplicate?: (task: TaskWithDetails) => void;
  onDelete?: (task: TaskWithDetails) => void;
  className?: string;
}

export function TaskCard({
  task,
  onTaskUpdate,
  onViewDetails,
  onEditProgress,
  onDuplicate,
  onDelete,
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

  return (
    <Card className={`transition-all hover:shadow-lg border ${className}`}>
      {/* Header with icon, title, and menu */}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg shrink-0 ${
              task.priority === "CRITICAL" || task.priority === "HIGH"
                ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            }`}>
              {getPriorityIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight text-foreground">
                {task.title}
              </h3>
              {(isOverdue || isDueSoon) && (
                <Badge
                  variant={isOverdue ? "danger" : "warning"}
                  className="mt-1 text-xs"
                >
                  {isOverdue ? "Overdue" : "Due Soon"}
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails?.(task)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditProgress?.(task)}>
                <Clock className="mr-2 h-4 w-4" />
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
              {(onDuplicate || onDelete) && <DropdownMenuSeparator />}
              {onDuplicate ? (
                <DropdownMenuItem onClick={() => onDuplicate(task)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
              ) : null}
              {onDelete ? (
                <DropdownMenuItem onClick={() => onDelete(task)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {task.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {task.description}
          </p>
        )}

        {/* Date and Time Row */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className={isOverdue ? "text-red-600 font-medium dark:text-red-400" : "text-foreground"}>
              {format(new Date(task.end), "MMM dd, yyyy")}
            </span>
          </div>

          {task.estimatedHours && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{task.estimatedHours}h est.</span>
            </div>
          )}
        </div>

        {/* Badges and Assignees Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={PRIORITY_COLORS[task.priority]} variant="outline">
              {TASK_PRIORITY_LABELS[task.priority]}
            </Badge>
            <Badge className={STATUS_COLORS[task.status]} variant="outline">
              {TASK_STATUS_LABELS[task.status]}
            </Badge>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {task.assignee && (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {task.assignee.name?.split(' ').map(n => n[0]).join('') ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <User className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            {task.project && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
                <Building className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  {task.project.code || task.project.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Progress</span>
            <span className="text-sm font-bold text-foreground">{task.progress}%</span>
          </div>
          <Progress value={task.progress} className="h-2.5" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails?.(task)}
            className="flex-1 h-8 text-xs px-2"
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View Details
          </Button>

          {task.status !== TaskStatus.COMPLETED && (
            <Button
              size="sm"
              onClick={markComplete}
              disabled={isLoading}
              className="flex-1 h-8 text-xs px-2"
            >
              {isLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              )}
              Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
