import { notFound } from "next/navigation";

import { BudgetWorkspace } from "@/components/budget/budget-workspace";
import { requireWorkspaceView, requireWorkspaceBudgetEdit } from "@/lib/authz";
import { prisma } from "@/lib/db";

type WorkspaceBudgetPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function WorkspaceBudgetPage({ params }: WorkspaceBudgetPageProps) {
  const { workspaceId } = await params;
  await requireWorkspaceView(workspaceId);

  const workspace = await prisma.budgetWorkspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      description: true,
      planned: true,
      actual: true,
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!workspace) {
    notFound();
  }

  let canEdit = false;
  try {
    await requireWorkspaceBudgetEdit(workspaceId);
    canEdit = true;
  } catch {
    canEdit = false;
  }

  return (
    <BudgetWorkspace
      canEdit={canEdit}
      context={{
        type: "workspace",
        workspace: {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          planned: workspace.planned ? Number(workspace.planned) : null,
          actual: workspace.actual ? Number(workspace.actual) : null,
          owner: workspace.owner
            ? {
                id: workspace.owner.id,
                name: workspace.owner.name,
                email: workspace.owner.email,
              }
            : null,
          project: workspace.project
            ? {
                id: workspace.project.id,
                name: workspace.project.name,
                code: workspace.project.code,
                status: workspace.project.status,
              }
            : null,
        },
      }}
    />
  );
}
