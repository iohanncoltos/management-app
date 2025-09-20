"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";

import { EnhancedTaskForm } from "@/components/tasks/enhanced-task-form";
import { TaskTable } from "@/components/tasks/task-table";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskStatsCards } from "@/components/tasks/task-stats-cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskWithDetails, TaskFilters as TaskFiltersType, TaskSort } from "@/lib/types/tasks";

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

  const handleTaskCreated = () => {
    setShowCreateForm(false);
    fetchTasks();
    fetchStats();
  };

  const handleTaskUpdated = () => {
    fetchTasks();
    fetchStats();
  };

  return (
    <div className="space-y-6">
      {stats && <TaskStatsCards stats={stats} />}

      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="create">Create Task</TabsTrigger>
          </TabsList>
          <Button onClick={() => setShowCreateForm(true)}>
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

          <Card>
            <CardHeader>
              <CardTitle>Task Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskTable
                tasks={tasks}
                isLoading={isLoading}
                canManage={true}
                onTaskUpdate={handleTaskUpdated}
                sort={sort}
                onSortChange={setSort}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <EnhancedTaskForm
            users={users}
            projects={projects}
            onCreated={handleTaskCreated}
          />
        </TabsContent>
      </Tabs>

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