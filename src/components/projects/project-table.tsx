"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface ProjectItem {
  id: string;
  name: string;
  code: string;
  status: string;
  startDate: string | Date | null;
  endDate: string | Date | null;
  budgetPlanned: number;
  budgetActual: number;
  tasksTotal: number;
  tasksComplete: number;
  tasksOverdue: number;
  filesCount: number;
}

interface ProjectTableProps {
  projects: ProjectItem[];
}

const statusVariants: Record<string, { label: string; variant: "default" | "warning" | "success" | "danger" }> = {
  PLANNING: { label: "Planning", variant: "default" },
  ACTIVE: { label: "Active", variant: "success" },
  ON_HOLD: { label: "On Hold", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "success" },
  CLOSED: { label: "Closed", variant: "default" },
};

export function ProjectTable({ projects }: ProjectTableProps) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-0">
        <div className="space-y-3 p-4 md:hidden">
          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              No missions registered yet.
            </div>
          ) : (
            projects.map((project) => {
              const status = statusVariants[project.status] ?? statusVariants.PLANNING;
              const endDate = project.endDate ? (typeof project.endDate === "string" ? new Date(project.endDate) : project.endDate) : null;
              const startDate = project.startDate ? (typeof project.startDate === "string" ? new Date(project.startDate) : project.startDate) : null;
              const progress = project.tasksTotal ? Math.round((project.tasksComplete / project.tasksTotal) * 100) : 0;
              const variance = project.budgetPlanned
                ? ((Number(project.budgetActual) - Number(project.budgetPlanned)) / Number(project.budgetPlanned)) * 100
                : 0;

              return (
                <div key={project.id} className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">{project.name}</p>
                      <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">{project.code}</p>
                    </div>
                    <Badge variant={status.variant} className="w-fit">{status.label}</Badge>
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground/80">Schedule</span>
                      <span>{startDate ? format(startDate, "dd MMM yyyy") : "TBD"} → {endDate ? format(endDate, "dd MMM yyyy") : "TBD"}</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground/80">Progress</span>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="flex-1" />
                        <span className="text-sm font-medium text-foreground">{progress}%</span>
                      </div>
                      {project.tasksOverdue > 0 ? (
                        <span className="text-xs text-destructive">{project.tasksOverdue} overdue</span>
                      ) : null}
                    </div>

                      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/40 bg-secondary/30 p-3 text-sm">
                        <div className="space-y-1">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground/80 block">Actual</span>
                          <span className="font-semibold text-foreground">${Number(project.budgetActual).toLocaleString()}</span>
                        </div>
                        <div className="space-y-1 text-right">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground/80 block">Plan</span>
                          <span className="font-semibold text-foreground">
                            ${Number(project.budgetPlanned).toLocaleString()} ({variance.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground/80">
                      <span>Files</span>
                      <span className="text-sm font-medium text-foreground">{project.filesCount}</span>
                    </div>
                  </div>

                  <Button asChild size="sm" className="mt-4 w-full justify-center">
                    <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1">
                      Open <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Mission</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="hidden min-w-[140px] md:table-cell">Schedule</TableHead>
                <TableHead className="min-w-[120px]">Progress</TableHead>
                <TableHead className="hidden min-w-[120px] lg:table-cell">Budget</TableHead>
                <TableHead className="hidden min-w-[60px] xl:table-cell">Files</TableHead>
                <TableHead className="min-w-[100px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {projects.map((project) => {
              const status = statusVariants[project.status] ?? statusVariants.PLANNING;
              const endDate = project.endDate ? (typeof project.endDate === "string" ? new Date(project.endDate) : project.endDate) : null;
              const startDate = project.startDate ? (typeof project.startDate === "string" ? new Date(project.startDate) : project.startDate) : null;
              const progress = project.tasksTotal ? Math.round((project.tasksComplete / project.tasksTotal) * 100) : 0;
              const variance = project.budgetPlanned
                ? ((Number(project.budgetActual) - Number(project.budgetPlanned)) / Number(project.budgetPlanned)) * 100
                : 0;

              return (
                <TableRow key={project.id} className="border-border/40">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">{project.name}</span>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">{project.code}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    <div>{startDate ? format(startDate, "dd MMM yyyy") : "TBD"}</div>
                    {endDate ? <div>→ {format(endDate, "dd MMM yyyy")}</div> : <div>→ TBD</div>}
                  </TableCell>
                  <TableCell className="w-32 sm:w-48">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Progress value={progress} className="min-w-[60px]" />
                      <span className="text-sm text-foreground">{progress}%</span>
                    </div>
                    {project.tasksOverdue > 0 ? (
                      <p className="text-xs text-destructive">{project.tasksOverdue} overdue</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">
                    <div className="text-foreground">${Number(project.budgetActual).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      Plan ${Number(project.budgetPlanned).toLocaleString()} ({variance.toFixed(1)}%)
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">{project.filesCount}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" className="text-accent">
                      <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1">
                        Open <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No missions registered yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}
