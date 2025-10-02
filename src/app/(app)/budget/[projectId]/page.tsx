import { notFound } from "next/navigation";

import { BudgetWorkspace } from "@/components/budget/budget-workspace";
import { canViewProject, requireSession } from "@/lib/authz";
import { prisma } from "@/lib/db";

type BudgetWorkspacePageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function BudgetWorkspacePage({ params }: BudgetWorkspacePageProps) {
  const { projectId } = await params;
  const session = await requireSession();

  const allowed = await canViewProject(session.user.id, projectId);
  if (!allowed) {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
    },
  });

  if (!project) {
    notFound();
  }

  // Check if user can edit budgets
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: {
        select: {
          name: true,
          permissions: { select: { action: true } },
        },
      },
    },
  });

  const roleName = user?.role?.name ?? null;
  const permissions = user?.role?.permissions.map((p) => p.action) ?? [];

  const canEdit = roleName === "ADMIN" ||
                  roleName === "PROJECT_MANAGER" ||
                  permissions.includes("MANAGE_USERS");

  return (
    <BudgetWorkspace
      canEdit={canEdit}
      context={{
        type: "project",
        project: {
          id: project.id,
          name: project.name,
          code: project.code,
          status: project.status,
        },
      }}
    />
  );
}
