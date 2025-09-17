"use client";

import type { ChartData } from "chart.js";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowDownRight, ArrowUpRight, CalendarDays, TrendingUp } from "lucide-react";

import { BarChart } from "@/components/charts/bar-chart";
import { DoughnutChart } from "@/components/charts/doughnut-chart";
import { LineChart } from "@/components/charts/line-chart";
import { KpiCard } from "@/components/layout/kpi-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";


type MetricPayload = {
  totalProjects: number;
  overdueTasks: number;
  completionRate: number;
  workload: number;
  budgetVariance: number;
};

type PerformanceItem = {
  label: string;
  planned: number;
  actual: number;
  completion: number;
};

type TaskBreakdown = {
  planned: number;
  executing: number;
  blocked: number;
  complete: number;
};

type UpcomingTask = {
  id: string;
  title: string;
  end: string | Date;
  progress: number;
  project: { id: string; name: string; code: string };
};

interface DashboardClientProps {
  metrics: MetricPayload;
  performance: PerformanceItem[];
  taskBreakdown: TaskBreakdown;
  upcoming: UpcomingTask[];
}

export function DashboardClient({ metrics, performance, taskBreakdown, upcoming }: DashboardClientProps) {
  const budgetChartData: ChartData<"bar"> = {
    labels: performance.map((item) => item.label),
    datasets: [
      {
        label: "Planned Budget",
        data: performance.map((item) => item.planned),
        backgroundColor: "rgba(58, 123, 213, 0.6)",
        borderRadius: 18,
      },
      {
        label: "Actual Spend",
        data: performance.map((item) => item.actual),
        backgroundColor: "rgba(176, 54, 54, 0.7)",
        borderRadius: 18,
      },
    ],
  };

  const completionTrendData = {
    labels: performance.map((item) => item.label),
    datasets: [
      {
        label: "Completion %",
        data: performance.map((item) => item.completion),
        borderColor: "rgba(155, 44, 44, 1)",
        backgroundColor: "rgba(155, 44, 44, 0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const breakdownData = {
    labels: ["Planned", "Executing", "Blocked", "Complete"],
    datasets: [
      {
        data: [taskBreakdown.planned, taskBreakdown.executing, taskBreakdown.blocked, taskBreakdown.complete],
        backgroundColor: ["#3a7bd5", "#b03636", "#e0b341", "#3bb2ad"],
        borderColor: "rgba(15,17,21,0.6)",
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Active Missions"
          value={String(metrics.totalProjects)}
          delta={`${metrics.completionRate}% complete`}
          trend="up"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          title="Overdue Tasks"
          value={String(metrics.overdueTasks)}
          delta="Requires attention"
          trend={metrics.overdueTasks > 0 ? "down" : "flat"}
          icon={<ArrowDownRight className="h-4 w-4" />}
        />
        <KpiCard
          title="Workforce Load"
          value={`${metrics.workload}%`}
          delta={metrics.workload > 100 ? "Overcommitted" : "Stable"}
          trend={metrics.workload > 100 ? "down" : "up"}
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
        <KpiCard
          title="Budget Variance"
          value={`${metrics.budgetVariance.toFixed(1)}%`}
          delta={metrics.budgetVariance >= 0 ? "Over plan" : "Under plan"}
          trend={metrics.budgetVariance >= 0 ? "down" : "up"}
          icon={<CalendarDays className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Budget Trajectory</CardTitle>
            <CardDescription>Compare planned mission budgets against actual spend.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              data={budgetChartData}
              options={{
                responsive: true,
                plugins: { legend: { position: "bottom" } },
                scales: {
                  x: { stacked: false },
                  y: {
                    ticks: { callback: (value) => `$${Number(value).toLocaleString()}` },
                  },
                },
              }}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Execution Status</CardTitle>
            <CardDescription>Live distribution of task states across missions.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <DoughnutChart
              data={breakdownData}
              options={{
                plugins: {
                  legend: { position: "bottom" },
                },
              }}
              size={240}
            />
            <div className="mt-4 grid w-full grid-cols-2 gap-3 text-sm">
              {Object.entries(taskBreakdown).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-2xl bg-secondary/40 px-4 py-2">
                  <span className="capitalize text-muted-foreground">{key}</span>
                  <span className="font-semibold text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Completion Trend</CardTitle>
            <CardDescription>Progress velocity across active initiatives.</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              data={completionTrendData}
              options={{
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    min: 0,
                    max: 100,
                    ticks: { callback: (value) => `${value}%` },
                  },
                },
              }}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Upcoming Milestones</CardTitle>
            <CardDescription>Next critical deliverables across mission teams.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Mission</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map((task) => {
                  const dueDate = typeof task.end === "string" ? new Date(task.end) : task.end;
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{task.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={task.progress === 100 ? "success" : task.progress === 0 ? "default" : "warning"}>
                            {task.progress}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-foreground">{task.project.code}</span>
                        <p className="text-xs text-muted-foreground">{task.project.name}</p>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-foreground">{format(dueDate, "dd MMM")}</div>
                        <div className="text-xs text-muted-foreground">{formatDistanceToNow(dueDate, { addSuffix: true })}</div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {upcoming.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                      No upcoming milestones scheduled.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
