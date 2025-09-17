import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { auth } from "@/lib/auth";
import { getProjectById } from "@/lib/services/project-service";

export default async function ProjectOverviewPage({ params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const project = await getProjectById(params.projectId);
  if (!project) {
    notFound();
  }

  const totalTasks = project.tasks.length;
  const completeTasks = project.tasks.filter((task) => task.progress === 100).length;
  const progress = totalTasks ? Math.round((completeTasks / totalTasks) * 100) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Mission Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Mission Code</p>
              <p className="text-lg font-semibold text-foreground">{project.code}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <Badge variant="outline">{project.status}</Badge>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Budget Planned</p>
              <p className="text-lg font-semibold text-foreground">
                ${Number(project.budgetPlanned).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Budget Actual</p>
              <p className="text-lg font-semibold text-foreground">
                ${Number(project.budgetActual).toLocaleString()}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Mission Progress</p>
              <div className="mt-2 flex items-center gap-3">
                <Progress value={progress} className="flex-1" />
                <span className="text-sm font-semibold text-foreground">{progress}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Workstreams</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.tasks.slice(0, 8).map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{task.title}</div>
                      {task.dependsOn.length > 0 ? (
                        <div className="text-xs text-muted-foreground">Depends on {task.dependsOn.join(", ")}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {task.assignee ? task.assignee.name : "Unassigned"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {task.start.toLocaleDateString()} → {task.end.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right text-sm text-foreground">{task.progress}%</TableCell>
                  </TableRow>
                ))}
                {project.tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      No tasks registered yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Mission Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Initiated</span>
              <span className="font-medium text-foreground">{project.startDate.toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Target Complete</span>
              <span className="font-medium text-foreground">
                {project.endDate ? project.endDate.toLocaleDateString() : "TBD"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Documents</span>
              <span className="font-medium text-foreground">{project.files.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
