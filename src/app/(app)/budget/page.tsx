import { redirect } from "next/navigation";

import { BudgetOverview } from "@/components/budget/budget-overview";
import { auth } from "@/lib/auth";
import { listBudgetProjectsForUser, listBudgetWorkspacesForUser } from "@/lib/services/budget-service";

export default async function BudgetPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const permissions = session.user.permissions ?? [];
  const [projects, workspaces] = await Promise.all([
    listBudgetProjectsForUser(session.user.id, permissions),
    listBudgetWorkspacesForUser(session.user.id, permissions),
  ]);

  return (
    <BudgetOverview
      projects={projects.map((project) => ({
        ...project,
        budgetPlanned: project.budgetPlanned ?? null,
        budgetActual: project.budgetActual ?? null,
      }))}
      workspaces={workspaces}
      canCreateWorkspace
      currentUserId={session.user.id}
    />
  );
}
