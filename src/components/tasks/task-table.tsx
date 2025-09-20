"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TaskWithDetails,
  TaskSort,
  TaskSortField,
  TaskStatus,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_CATEGORY_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  CATEGORY_COLORS,
  TASK_STATUS_OPTIONS,
} from "@/lib/types/tasks";

interface TaskTableProps {
  tasks: TaskWithDetails[];
  isLoading?: boolean;
  canManage?: boolean;
  canUpdateProgress?: boolean;
  onTaskUpdate?: () => void;
  sort?: TaskSort;
  onSortChange?: (sort: TaskSort) => void;
}

export function TaskTable({
  tasks,
  isLoading = false,
  canManage = false,
  canUpdateProgress = false,
  onTaskUpdate,
  sort,
  onSortChange,
}: TaskTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const [editProgress, setEditProgress] = useState(0);
  const [editStatus, setEditStatus] = useState<TaskStatus>(TaskStatus.NOT_STARTED);

  const handleSort = (field: TaskSortField) => {
    if (!onSortChange) return;

    const newOrder =
      sort?.field === field && sort?.order === "asc" ? "desc" : "asc";
    onSortChange({ field, order: newOrder });
  };

  const getSortIcon = (field: TaskSortField) => {
    if (sort?.field !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sort.order === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const markComplete = async (taskId: string) => {
    setLoadingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
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
      setLoadingId(null);
    }
  };

  const updateTask = async (taskId: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error("Failed to update");
      }

      toast.success("Task updated successfully");
      onTaskUpdate?.();
      setEditingTask(null);
    } catch {
      toast.error("Unable to update task");
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete");
      }

      toast.success("Task deleted successfully");
      onTaskUpdate?.();
    } catch {
      toast.error("Unable to delete task");
    }
  };

  const duplicateTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/duplicate`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to duplicate");
      }

      toast.success("Task duplicated successfully");
      onTaskUpdate?.();
    } catch {
      toast.error("Unable to duplicate task");
    }
  };

  const openEditDialog = (task: TaskWithDetails) => {
    setEditingTask(task);
    setEditProgress(task.progress);
    setEditStatus(task.status);
  };

  const handleEditSubmit = () => {
    if (!editingTask) return;
    updateTask(editingTask.id, { progress: editProgress, status: editStatus });
  };

  const isOverdue = (task: TaskWithDetails) => {
    return new Date(task.end) < new Date() && task.status !== TaskStatus.COMPLETED;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("title")}
                className="h-auto p-0 font-semibold"
              >
                Task {getSortIcon("title")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("priority")}
                className="h-auto p-0 font-semibold"
              >
                Priority {getSortIcon("priority")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("category")}
                className="h-auto p-0 font-semibold"
              >
                Category {getSortIcon("category")}
              </Button>
            </TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("status")}
                className="h-auto p-0 font-semibold"
              >
                Status {getSortIcon("status")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("end")}
                className="h-auto p-0 font-semibold"
              >
                Due Date {getSortIcon("end")}
              </Button>
            </TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} className={isOverdue(task) ? "bg-red-50 dark:bg-red-950/10" : ""}>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium text-foreground">{task.title}</div>
                  {task.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {task.description}
                    </div>
                  )}
                  {task.estimatedHours && (
                    <div className="text-xs text-muted-foreground">
                      Est: {task.estimatedHours}h
                      {task.actualHours && ` | Actual: ${task.actualHours}h`}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={PRIORITY_COLORS[task.priority]} variant="outline">
                  {TASK_PRIORITY_LABELS[task.priority]}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={CATEGORY_COLORS[task.category]} variant="outline">
                  {TASK_CATEGORY_LABELS[task.category]}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="text-sm">
                    {task.assignee?.name ?? "Unassigned"}
                  </div>
                  {task.assignee?.role?.name && (
                    <div className="text-xs text-muted-foreground">
                      {task.assignee.role.name}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {task.project ? (
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{task.project.code}</div>
                    <div className="text-xs text-muted-foreground">{task.project.name}</div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No Project</span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={STATUS_COLORS[task.status]} variant="outline">
                  {TASK_STATUS_LABELS[task.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className={`text-sm ${isOverdue(task) ? "text-red-600 font-medium" : ""}`}>
                    {format(new Date(task.end), "MMM dd, yyyy")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(task.start), "MMM dd")} → {format(new Date(task.end), "MMM dd")}
                  </div>
                </div>
              </TableCell>
              <TableCell className="w-48">
                <div className="flex items-center gap-3">
                  <Progress value={task.progress} className="flex-1" />
                  <span className="text-sm text-foreground min-w-[3ch]">{task.progress}%</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(canUpdateProgress || canManage) && (
                      <DropdownMenuItem onClick={() => openEditDialog(task)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Update Progress
                      </DropdownMenuItem>
                    )}
                    {canUpdateProgress && task.status !== TaskStatus.COMPLETED && (
                      <DropdownMenuItem
                        onClick={() => markComplete(task.id)}
                        disabled={loadingId === task.id}
                      >
                        {loadingId === task.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        Mark Complete
                      </DropdownMenuItem>
                    )}
                    {canManage && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => duplicateTask(task.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteTask(task.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {tasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                No tasks found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Task Progress</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">{editingTask.title}</h3>
                <p className="text-sm text-muted-foreground">{editingTask.description}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="progress">Progress (%)</Label>
                <Input
                  id="progress"
                  type="number"
                  min={0}
                  max={100}
                  value={editProgress}
                  onChange={(e) => setEditProgress(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={editStatus} onValueChange={(value) => setEditStatus(value as TaskStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingTask(null)}>
                  Cancel
                </Button>
                <Button onClick={handleEditSubmit}>
                  Update Task
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}