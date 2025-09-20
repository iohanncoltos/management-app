import { notFound } from "next/navigation";

import { ProjectGantt } from "@/components/projects/project-gantt";
import { listTasksByProject } from "@/lib/services/task-service";
import { canViewProject, requireSession } from "@/lib/authz";

type ProjectGanttPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectGanttPage({ params }: ProjectGanttPageProps) {
  const { projectId } = await params;
  const session = await requireSession();

  const allowed = await canViewProject(session.user.id, projectId);
  if (!allowed) {
    notFound();
  }

  const tasks = await listTasksByProject(projectId);

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
