"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  User,
  Building,
  Target,
  CheckCircle,
  AlertTriangle,
  FileText,
  Timer,
  Zap,
  Edit,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TaskWithDetails,
  TaskStatus,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_CATEGORY_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  CATEGORY_COLORS,
  TASK_STATUS_OPTIONS,
} from "@/lib/types/tasks";

interface TaskDetailModalProps {
  task: TaskWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdate?: () => void;
}

export function TaskDetailModal({ task, isOpen, onClose, onTaskUpdate }: TaskDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editProgress, setEditProgress] = useState(0);
  const [editStatus, setEditStatus] = useState<TaskStatus>(TaskStatus.NOT_STARTED);
  const [isLoading, setIsLoading] = useState(false);

  if (!task) return null;

  const isOverdue = new Date(task.end) < new Date() && task.status !== TaskStatus.COMPLETED;
  const isDueSoon = new Date(task.end) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) &&
                   new Date(task.end) >= new Date() &&
                   task.status !== TaskStatus.COMPLETED;

  const handleEditClick = () => {
    setEditProgress(task.progress);
    setEditStatus(task.status);
    setIsEditing(true);
  };

  const handleSaveProgress = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: editProgress, status: editStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update");
      }

      toast.success("Task updated successfully");
      onTaskUpdate?.();
      setIsEditing(false);
    } catch {
      toast.error("Unable to update task");
    } finally {
      setIsLoading(false);
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
      onClose();
    } catch {
      toast.error("Unable to update task");
    } finally {
      setIsLoading(false);
    }
  };

  const timeRemaining = () => {
    const now = new Date();
    const endDate = new Date(task.end);
    const diffTime = endDate.getTime() - now.getTime();

    if (diffTime < 0) return "Overdue";

    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return "Due tomorrow";
    if (diffDays === 0) return "Due today";
    return `${diffDays} days remaining`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold leading-tight pr-8">{task.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                {isOverdue && (
                  <Badge variant="danger" className="text-xs">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Overdue
                  </Badge>
                )}
                {isDueSoon && !isOverdue && (
                  <Badge variant="warning" className="text-xs">
                    <Clock className="mr-1 h-3 w-3" />
                    Due Soon
                  </Badge>
                )}
                <Badge className={PRIORITY_COLORS[task.priority]} variant="outline">
                  <Zap className="mr-1 h-3 w-3" />
                  {TASK_PRIORITY_LABELS[task.priority]}
                </Badge>
                <Badge className={STATUS_COLORS[task.status]} variant="outline">
                  {TASK_STATUS_LABELS[task.status]}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Task Description */}
            {task.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Task Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap leading-relaxed">{task.description}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5" />
                  Progress & Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEditing ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Completion</span>
                        <span className="text-lg font-bold">{task.progress}%</span>
                      </div>
                      <Progress value={task.progress} className="h-3" />
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge className={STATUS_COLORS[task.status]} variant="outline">
                        {TASK_STATUS_LABELS[task.status]}
                      </Badge>
                      <Button onClick={handleEditClick} variant="outline" size="sm">
                        <Edit className="mr-2 h-4 w-4" />
                        Update Progress
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
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

                    <div className="flex gap-2">
                      <Button onClick={handleSaveProgress} disabled={isLoading} className="flex-1">
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                      <Button onClick={() => setIsEditing(false)} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {!isEditing && task.status !== TaskStatus.COMPLETED && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={markComplete} disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Mark Task as Complete
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {/* Due Date & Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Start Date</span>
                    <span className="font-medium">{format(new Date(task.start), "MMM dd, yyyy")}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Due Date</span>
                    <span className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>
                      {format(new Date(task.end), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`font-medium ${isOverdue ? "text-red-600" : isDueSoon ? "text-orange-600" : "text-green-600"}`}>
                      {timeRemaining()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assignment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {task.assignee && (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {task.assignee.name?.split(' ').map(n => n[0]).join('') ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{task.assignee.name}</p>
                      <p className="text-sm text-muted-foreground">{task.assignee.email}</p>
                      {task.assignee.role?.name && (
                        <p className="text-xs text-muted-foreground">{task.assignee.role.name}</p>
                      )}
                    </div>
                  </div>
                )}

                {task.createdBy && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Created by <span className="font-medium">{task.createdBy.name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(task.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Info */}
            {task.project && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building className="h-5 w-5" />
                    Project
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{task.project.name}</p>
                    <p className="text-sm text-muted-foreground">Code: {task.project.code}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Time Tracking */}
            {(task.estimatedHours || task.actualHours) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Timer className="h-5 w-5" />
                    Time Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {task.estimatedHours && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Estimated</span>
                      <span className="font-medium">{task.estimatedHours}h</span>
                    </div>
                  )}
                  {task.actualHours && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Actual</span>
                      <span className="font-medium">{task.actualHours}h</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Category</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={CATEGORY_COLORS[task.category]} variant="outline">
                  {TASK_CATEGORY_LABELS[task.category]}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}