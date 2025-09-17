"use client";

import { format } from "date-fns";
import { TriangleAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface AllocationItem {
  id: string;
  name: string;
  email: string;
  role: string;
  totalAllocation: number;
  assignments: Array<{
    allocationPct: number;
    taskId: string;
    taskTitle: string;
    projectCode: string;
    start: Date;
    end: Date;
  }>;
}

interface ResourceGridProps {
  allocations: AllocationItem[];
}

export function ResourceGrid({ allocations }: ResourceGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {allocations.map((resource) => {
        const overAllocated = resource.totalAllocation > 100;
        return (
          <Card key={resource.id} className="shadow-card border-border/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg text-foreground">{resource.name}</CardTitle>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{resource.role}</p>
              </div>
              {overAllocated ? <TriangleAlert className="h-5 w-5 text-destructive" /> : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Allocation</p>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={resource.totalAllocation} />
                  <span className={`text-sm font-semibold ${overAllocated ? "text-destructive" : "text-foreground"}`}>
                    {resource.totalAllocation}%
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {resource.assignments.map((assignment) => (
                  <div key={assignment.taskId} className="rounded-2xl border border-border/50 bg-secondary/40 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{assignment.taskTitle}</span>
                      <span className="text-muted-foreground">{assignment.allocationPct}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {assignment.projectCode} Â· {format(typeof assignment.start === "string" ? new Date(assignment.start) : assignment.start, "dd MMM")} â†’ {format( (typeof assignment.end === "string" ? new Date(assignment.end) : assignment.end), "dd MMM")}
                    </div>
                  </div>
                ))}
                {resource.assignments.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No assignments scheduled.</div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
