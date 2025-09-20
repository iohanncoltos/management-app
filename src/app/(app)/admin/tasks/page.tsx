import { notFound } from "next/navigation";

import { AdminTaskManager } from "@/components/admin/admin-task-manager";
import { PageHeader } from "@/components/layout/page-header";
import { auth } from "@/lib/auth";
import { listUsers } from "@/lib/services/user-service";
import { listProjectSummaries } from "@/lib/services/project-service";

const ASSIGN_TASKS = "ASSIGN_TASKS";

export default async function AdminTasksPage() {
  const session = await auth();
  if (!session?.user || !session.user.permissions.includes(ASSIGN_TASKS)) {
    notFound();
  }

  const [users, projects] = await Promise.all([
    listUsers(),
    listProjectSummaries(),
  ]);

  const userOptions = users.map((user) => ({
    id: user.id,
    name: user.name ?? "Unnamed",
    email: user.email,
    role: user.role?.name ?? null,
  }));

  const projectOptions = projects.map((project) => ({
    id: project.id,
    name: project.name,
    code: project.code,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Command Center"
        description="Create, assign, and manage tasks across all operations and personnel."
      />
      <AdminTaskManager
        users={userOptions}
        projects={projectOptions}
      />
    </div>
  );
}