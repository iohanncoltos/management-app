"use client";

import { useState, useEffect, useCallback } from "react";
import { Layout, List, Plus } from "lucide-react";
import { toast } from "sonner";

import { EnhancedTaskForm } from "@/components/tasks/enhanced-task-form";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskStatsCards } from "@/components/tasks/task-stats-cards";
import { TaskCard } from "@/components/tasks/task-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TaskWithDetails,
  TaskFilters as TaskFiltersType,
  TaskSort,
  TaskStatus,
  TASK_STATUS_OPTIONS,
} from "@/lib/types/tasks";

interface AdminTaskManagerProps {
  users: Array<{ id: string; name: string; email: string; role?: string | null }>;
  projects: Array<{ id: string; name: string; code: string }>;
}

export function AdminTaskManager({ users, projects }: AdminTaskManagerProps) {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState<TaskFiltersType>({});
  const [sort, setSort] = useState<TaskSort>({ field: "createdAt", order: "desc" });
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const [editProgress, setEditProgress] = useState(0);
  const [editStatus, setEditStatus] = useState<TaskStatus>(TaskStatus.NOT_STARTED);
  const [stats, setStats] = useState<{
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    highPriority: number;
    completionRate: number;
  } | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const searchParams = new URLSearchParams();

      // Add filters to search params
      if (filters.status?.length) {
        filters.status.forEach(status => searchParams.append("status", status));
      }
      if (filters.priority?.length) {
        filters.priority.forEach(priority => searchParams.append("priority", priority));
      }
      if (filters.category?.length) {
        filters.category.forEach(category => searchParams.append("category", category));
      }
      if (filters.assigneeId) searchParams.append("assigneeId", filters.assigneeId);
      if (filters.projectId) searchParams.append("projectId", filters.projectId);
      if (filters.search) searchParams.append("search", filters.search);
      if (filters.dueSoon) searchParams.append("dueSoon", "true");
      if (filters.overdue) searchParams.append("overdue", "true");

      // Add sorting
      searchParams.append("sortField", sort.field);
      searchParams.append("sortOrder", sort.order);

      const response = await fetch(`/api/tasks?${searchParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sort]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/tasks/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("cards");
    }
  }, []);

  const handleTaskCreated = () => {
    setShowCreateForm(false);
    fetchTasks();
    fetchStats();
  };

  const handleTaskUpdated = () => {
    fetchTasks();
    fetchStats();
  };

  const handleDuplicateTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/duplicate`, { method: "POST" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Unable to duplicate task");
      }
      toast.success("Task duplicated");
      fetchTasks();
      fetchStats();
    } catch (error) {
      toast.error("Duplicate failed", {
        description: error instanceof Error ? error.message : "Try again shortly.",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Unable to delete task");
      }
      toast.success("Task deleted");
      fetchTasks();
      fetchStats();
    } catch (error) {
      toast.error("Delete failed", {
        description: error instanceof Error ? error.message : "Try again shortly.",
      });
    }
  };

  const openEditDialog = (task: TaskWithDetails) => {
    setEditingTask(task);
    setEditProgress(task.progress);
    setEditStatus(task.status);
  };

  const handleEditSubmit = async () => {
    if (!editingTask) return;
    try {
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: editProgress, status: editStatus }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Unable to update task");
      }
      toast.success("Task updated");
      setEditingTask(null);
      fetchTasks();
      fetchStats();
    } catch (error) {
      toast.error("Update failed", {
        description: error instanceof Error ? error.message : "Try again shortly.",
      });
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {stats && <TaskStatsCards stats={stats} />}

      <Tabs defaultValue="all" className="space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="w-full overflow-x-auto sm:w-auto">
              <TabsList className="flex w-full min-w-max justify-start sm:min-w-0">
                <TabsTrigger value="all">All Tasks</TabsTrigger>
                <TabsTrigger value="create">Create Task</TabsTrigger>
              </TabsList>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-2 sm:gap-2">
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="sm"
                className="w-full justify-center"
                onClick={() => setViewMode("cards")}
                aria-label="Show card view"
              >
                <Layout className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                className="w-full justify-center"
                onClick={() => setViewMode("table")}
                aria-label="Show table view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="w-full justify-center sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>

        <TabsContent value="all" className="space-y-6">
          <TaskFilters
            filters={filters}
            onFiltersChange={setFilters}
            users={users}
            projects={projects}
          />

          {viewMode === "table" ? (
            <Card>
              <CardHeader>
                <CardTitle>Task Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <TaskTable
                    tasks={tasks}
                    isLoading={isLoading}
                    canManage={true}
                    onTaskUpdate={handleTaskUpdated}
                    sort={sort}
                    onSortChange={setSort}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onTaskUpdate={handleTaskUpdated}
                  onEditProgress={openEditDialog}
                  onDuplicate={(t) => handleDuplicateTask(t.id)}
                  onDelete={(t) => handleDeleteTask(t.id)}
                />
              ))}
              {tasks.length === 0 && !isLoading ? (
                <div className="col-span-full rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                  No tasks found.
                </div>
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create">
          <EnhancedTaskForm
            users={users}
            projects={projects}
            onCreated={handleTaskCreated}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingTask} onOpenChange={(open) => { if (!open) setEditingTask(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Task Progress</DialogTitle>
          </DialogHeader>
          {editingTask ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">{editingTask.title}</h3>
                {editingTask.description ? (
                  <p className="text-sm text-muted-foreground">{editingTask.description}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-progress">Progress (%)</Label>
                <Input
                  id="edit-progress"
                  type="number"
                  min={0}
                  max={100}
                  value={editProgress}
                  onChange={(event) => setEditProgress(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editStatus} onValueChange={(value) => setEditStatus(value as TaskStatus)}>
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select status" />
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
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <EnhancedTaskForm
            users={users}
            projects={projects}
            onCreated={handleTaskCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
