import { notFound } from "next/navigation";

import { Role } from "@prisma/client";

import { ProjectGantt } from "@/components/projects/project-gantt";
import { auth } from "@/lib/auth";
import { listTasksByProject } from "@/lib/services/task-service";

export default async function ProjectGanttPage({ params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const tasks = await listTasksByProject(params.projectId);

  if (
    session.user.role === Role.MEMBER &&
    !tasks.some((task) => task.assigneeId === session.user.id)
  ) {
    notFound();
  }

  return (
    <ProjectGantt
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        start: task.start,
        end: task.end,
        progress: task.progress,
        dependsOn: task.dependsOn,
      }))}
    />
  );
}
