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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Files</TableHead>
              <TableHead className="text-right">Action</TableHead>
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
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{startDate ? format(startDate, "dd MMM yyyy") : "TBD"}</div>
                    {endDate ? <div>â†’ {format(endDate, "dd MMM yyyy")}</div> : <div>â†’ TBD</div>}
                  </TableCell>
                  <TableCell className="w-48">
                    <div className="flex items-center gap-3">
                      <Progress value={progress} />
                      <span className="text-sm text-foreground">{progress}%</span>
                    </div>
                    {project.tasksOverdue > 0 ? (
                      <p className="text-xs text-destructive">{project.tasksOverdue} overdue</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="text-foreground">${Number(project.budgetActual).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      Plan ${Number(project.budgetPlanned).toLocaleString()} ({variance.toFixed(1)}%)
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{project.filesCount}</TableCell>
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
      </CardContent>
    </Card>
  );
}
