import { notFound } from "next/navigation";

import { TaskCreateForm } from "@/components/projects/task-create-form";
import { TaskTable } from "@/components/projects/task-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listTasksByProject } from "@/lib/services/task-service";
import { listAssignableUsers } from "@/lib/services/user-service";
import { canViewProject, requireSession } from "@/lib/authz";

type ProjectTasksPageProps = {
  params: Promise<{ projectId: string }>;
};

const ASSIGN_TASKS = "ASSIGN_TASKS";

export default async function ProjectTasksPage({ params }: ProjectTasksPageProps) {
  const { projectId } = await params;
  const session = await requireSession();

  const allowed = await canViewProject(session.user.id, projectId);
  if (!allowed) {
    notFound();
  }

  const canManageTasks = session.user.permissions.includes(ASSIGN_TASKS);

  const [tasks, users] = await Promise.all([
    listTasksByProject(projectId),
    listAssignableUsers(session.user.id, session.user.permissions),
  ]);

  const taskModels = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    start: task.start,
    end: task.end,
    progress: task.progress,
    assignee: task.assignee ? { id: task.assignee.id, name: task.assignee.name } : undefined,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Current Workstreams</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TaskTable tasks={taskModels} canEdit={canManageTasks} />
        </CardContent>
      </Card>
      {canManageTasks ? (
        <Card>
          <CardHeader>
            <CardTitle>Schedule New Work</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskCreateForm
              projectId={projectId}
              users={users.map((user) => ({
                id: user.id,
                name: user.name ?? "Unnamed User",
                email: user.email,
              }))}
              tasks={taskModels.map((task) => ({ id: task.id, title: task.title }))}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
