import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

const projectSummarySelect = {
  id: true,
  code: true,
  name: true,
  status: true,
  budgetPlanned: true,
  budgetActual: true,
  createdAt: true,
} satisfies Prisma.ProjectSelect;

const workspaceSummaryInclude = {
  project: {
    select: {
      id: true,
      code: true,
      name: true,
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
} satisfies Prisma.BudgetWorkspaceInclude;

type ProjectSummaryPayload = Prisma.ProjectGetPayload<{ select: typeof projectSummarySelect }>;
type WorkspaceSummaryPayload = Prisma.BudgetWorkspaceGetPayload<{ include: typeof workspaceSummaryInclude }>;

export function serializeProjectSummary(project: ProjectSummaryPayload) {
  return {
    id: project.id,
    code: project.code,
    name: project.name,
    status: project.status,
    budgetPlanned: project.budgetPlanned ? Number(project.budgetPlanned) : null,
    budgetActual: project.budgetActual ? Number(project.budgetActual) : null,
    createdAt: project.createdAt,
  };
}

export function serializeWorkspaceSummary(workspace: WorkspaceSummaryPayload) {
  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    planned: workspace.planned ? Number(workspace.planned) : null,
    actual: workspace.actual ? Number(workspace.actual) : null,
    project: workspace.project
      ? {
          id: workspace.project.id,
          code: workspace.project.code,
          name: workspace.project.name,
          status: workspace.project.status,
        }
      : null,
    owner: workspace.owner
      ? {
          id: workspace.owner.id,
          name: workspace.owner.name,
          email: workspace.owner.email,
        }
      : null,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

export async function listBudgetProjectsForUser(userId: string, permissions: string[]) {
  const canViewAll = permissions.includes("CREATE_PROJECT") || permissions.includes("MANAGE_USERS");

  const projects = await prisma.project.findMany({
    where: canViewAll ? undefined : { memberships: { some: { userId } } },
    select: projectSummarySelect,
    orderBy: { createdAt: "desc" },
  });

  return projects.map(serializeProjectSummary);
}

export async function listBudgetWorkspacesForUser(userId: string, permissions: string[]) {
  const canViewAll = permissions.includes("MANAGE_USERS");

  const workspaces = await prisma.budgetWorkspace.findMany({
    where: canViewAll
      ? undefined
      : {
          OR: [
            { ownerId: userId },
            { project: { memberships: { some: { userId } } } },
          ],
        },
    include: workspaceSummaryInclude,
    orderBy: { updatedAt: "desc" },
  });

  return workspaces.map(serializeWorkspaceSummary);
}

export async function getBudgetWorkspaceById(workspaceId: string) {
  return prisma.budgetWorkspace.findUnique({
    where: { id: workspaceId },
    include: workspaceSummaryInclude,
  });
}

export async function getWorkspaceSummaryById(workspaceId: string) {
  const workspace = await getBudgetWorkspaceById(workspaceId);
  return workspace ? serializeWorkspaceSummary(workspace) : null;
}

export async function getProjectSummaryById(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: projectSummarySelect,
  });

  return project ? serializeProjectSummary(project) : null;
}

export async function createBudgetWorkspace(props: {
  name: string;
  description?: string | null;
  ownerId: string;
  projectId?: string | null;
}) {
  const data: Prisma.BudgetWorkspaceCreateInput = {
    name: props.name,
    description: props.description ?? null,
    owner: {
      connect: { id: props.ownerId },
    },
  };

  if (props.projectId) {
    data.project = { connect: { id: props.projectId } };
  }

  return prisma.budgetWorkspace.create({
    data,
    include: workspaceSummaryInclude,
  });
}

export async function updateBudgetWorkspace(workspaceId: string, data: Prisma.BudgetWorkspaceUpdateInput) {
  return prisma.budgetWorkspace.update({
    where: { id: workspaceId },
    data,
    include: workspaceSummaryInclude,
  });
}

export async function upsertWorkspacePlannedActual(workspaceId: string, planned: number | null, actual: number | null) {
  return prisma.budgetWorkspace.update({
    where: { id: workspaceId },
    data: {
      planned: planned !== null ? new Prisma.Decimal(planned) : null,
      actual: actual !== null ? new Prisma.Decimal(actual) : null,
    },
    include: workspaceSummaryInclude,
  });
}
