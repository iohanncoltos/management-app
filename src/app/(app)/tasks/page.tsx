import { UserTaskDashboard } from "@/components/tasks/user-task-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { requireSession } from "@/lib/authz";
import { getTaskStats } from "@/lib/services/task-service";
import { listProjectSummaries } from "@/lib/services/project-service";

export default async function TasksPage() {
  const session = await requireSession();

  const [stats, projects] = await Promise.all([
    getTaskStats(session.user.id),
    listProjectSummaries(),
  ]);

  const projectOptions = projects.map((project) => ({
    id: project.id,
    name: project.name,
    code: project.code,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Mission Tasks"
        description="Manage your assigned tasks and track progress on current operations."
      />
      <UserTaskDashboard
        userId={session.user.id}
        userName={session.user.name ?? "Operator"}
        stats={stats}
        projects={projectOptions}
      />
    </div>
  );
}