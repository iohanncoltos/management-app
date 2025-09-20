"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, TrendingUp, Layout, List } from "lucide-react";

import { TaskTable } from "@/components/tasks/task-table";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { TodaysFocus } from "@/components/tasks/todays-focus";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskStatsCards } from "@/components/tasks/task-stats-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskWithDetails, TaskFilters as TaskFiltersType, TaskSort, TaskStatus } from "@/lib/types/tasks";

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  highPriority: number;
  completionRate: number;
}

interface UserTaskDashboardProps {
  userId: string;
  userName: string;
  stats: TaskStats;
  projects: Array<{ id: string; name: string; code: string }>;
}

export function UserTaskDashboard({ stats, projects }: UserTaskDashboardProps) {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<TaskFiltersType>({});
  const [sort, setSort] = useState<TaskSort>({ field: "end", order: "asc" });
  const [upcomingTasks, setUpcomingTasks] = useState<TaskWithDetails[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [activeTab, setActiveTab] = useState("active");

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const searchParams = new URLSearchParams();
      searchParams.append("scope", "mine"); // Always get user's own tasks

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

  const fetchUpcomingTasks = useCallback(async () => {
    try {
      // This would need a new endpoint for upcoming tasks
      // For now, we'll filter from existing tasks
      const upcoming = tasks
        .filter(task =>
          task.status !== "COMPLETED" &&
          new Date(task.end) >= new Date() &&
          new Date(task.end) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        )
        .sort((a, b) => new Date(a.end).getTime() - new Date(b.end).getTime())
        .slice(0, 5);
      setUpcomingTasks(upcoming);
    } catch (error) {
      console.error("Error fetching upcoming tasks:", error);
    }
  }, [tasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchUpcomingTasks();
  }, [fetchUpcomingTasks]);

  const handleTaskUpdated = () => {
    fetchTasks();
  };

  const handleViewDetails = (task: TaskWithDetails) => {
    setSelectedTask(task);
  };

  const handleEditProgress = (task: TaskWithDetails) => {
    setEditingTask(task);
  };

  const handleMarkComplete = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: 100, status: TaskStatus.COMPLETED }),
      });

      if (!res.ok) {
        throw new Error("Failed to update");
      }

      handleTaskUpdated();
    } catch (error) {
      console.error("Error marking task complete:", error);
    }
  };

  const handleQuickAction = (action: "overdue" | "high-priority" | "in-progress") => {
    switch (action) {
      case "overdue":
        setActiveTab("overdue");
        break;
      case "high-priority":
        setFilters({ priority: ["HIGH", "CRITICAL"] });
        setActiveTab("all");
        break;
      case "in-progress":
        setActiveTab("active");
        break;
    }
  };

  const TaskContent = ({ tasks: taskList }: { tasks: TaskWithDetails[] }) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (viewMode === "cards") {
      return (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
          {taskList.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onTaskUpdate={handleTaskUpdated}
              onViewDetails={handleViewDetails}
              onEditProgress={handleEditProgress}
            />
          ))}
          {taskList.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No tasks found.</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <TaskTable
        tasks={taskList}
        isLoading={isLoading}
        canManage={false}
        canUpdateProgress={true}
        onTaskUpdate={handleTaskUpdated}
        sort={sort}
        onSortChange={setSort}
      />
    );
  };

  return (
    <div className="space-y-6">
      <TaskStatsCards stats={stats} onQuickAction={handleQuickAction} />

      {/* Today's Focus Section */}
      <TodaysFocus
        tasks={tasks}
        onTaskClick={handleViewDetails}
        onMarkComplete={handleMarkComplete}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-9">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="active">Active Tasks</TabsTrigger>
                <TabsTrigger value="all">All Tasks</TabsTrigger>
                <TabsTrigger value="overdue">Overdue</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "cards" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                >
                  <Layout className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="active" className="space-y-6">
              <TaskFilters
                filters={{ ...filters, status: ["NOT_STARTED", "IN_PROGRESS"] }}
                onFiltersChange={(newFilters) => setFilters({ ...newFilters, status: ["NOT_STARTED", "IN_PROGRESS"] })}
                projects={projects}
                hideUserFilter={true}
              />

              {viewMode === "table" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Active Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TaskContent
                      tasks={tasks.filter(task => ["NOT_STARTED", "IN_PROGRESS"].includes(task.status))}
                    />
                  </CardContent>
                </Card>
              ) : (
                <TaskContent
                  tasks={tasks.filter(task => ["NOT_STARTED", "IN_PROGRESS"].includes(task.status))}
                />
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-6">
              <TaskFilters
                filters={filters}
                onFiltersChange={setFilters}
                projects={projects}
                hideUserFilter={true}
              />

              {viewMode === "table" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>All My Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TaskContent tasks={tasks} />
                  </CardContent>
                </Card>
              ) : (
                <TaskContent tasks={tasks} />
              )}
            </TabsContent>

            <TabsContent value="overdue" className="space-y-6">
              {viewMode === "table" ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Overdue Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TaskContent
                      tasks={tasks.filter(task =>
                        task.status !== "COMPLETED" &&
                        new Date(task.end) < new Date()
                      )}
                    />
                  </CardContent>
                </Card>
              ) : (
                <TaskContent
                  tasks={tasks.filter(task =>
                    task.status !== "COMPLETED" &&
                    new Date(task.end) < new Date()
                  )}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">No upcoming deadlines</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 dark:hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => handleViewDetails(task)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold line-clamp-2 text-foreground flex-1">{task.title}</h4>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {new Date(task.end).toLocaleDateString()}
                          </Badge>
                        </div>
                        {task.project && (
                          <p className="text-xs font-medium text-muted-foreground">
                            {task.project.code} - {task.project.name}
                          </p>
                        )}
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Completion Rate</span>
                  <Badge variant="default" className="font-semibold">{stats.completionRate}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Total Tasks</span>
                  <Badge variant="outline" className="font-semibold">{stats.total}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">In Progress</span>
                  <Badge variant="default" className="font-semibold">{stats.inProgress}</Badge>
                </div>
                {stats.overdue > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Overdue</span>
                    <Badge variant="danger" className="font-semibold">{stats.overdue}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5" />
                Time Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Time tracking features coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdate={handleTaskUpdated}
      />

      {/* Edit Progress Modal */}
      {editingTask && (
        <TaskDetailModal
          task={editingTask}
          isOpen={true}
          onClose={() => setEditingTask(null)}
          onTaskUpdate={handleTaskUpdated}
        />
      )}
    </div>
  );
}