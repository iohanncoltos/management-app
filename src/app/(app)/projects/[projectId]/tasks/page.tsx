import { notFound } from "next/navigation";

import { Role } from "@prisma/client";

import { TaskCreateForm } from "@/components/projects/task-create-form";
import { TaskTable } from "@/components/projects/task-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { listTasksByProject } from "@/lib/services/task-service";
import { listAssignableUsers } from "@/lib/services/user-service";

export default async function ProjectTasksPage({ params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const [tasks, users] = await Promise.all([
    listTasksByProject(params.projectId),
    listAssignableUsers(session.user.id, session.user.role),
  ]);

  if (
    session.user.role === Role.MEMBER &&
    !tasks.some((task) => task.assigneeId === session.user.id)
  ) {
    notFound();
  }

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
          <TaskTable tasks={taskModels} canEdit={session.user.role !== Role.MEMBER} />
        </CardContent>
      </Card>
      {session.user.role !== Role.MEMBER ? (
        <Card>
          <CardHeader>
            <CardTitle>Schedule New Work</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskCreateForm
              projectId={params.projectId}
              users={users}
              tasks={taskModels.map((task) => ({ id: task.id, title: task.title }))}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
