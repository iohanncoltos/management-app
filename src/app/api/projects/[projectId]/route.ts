import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { AuthorizationError, canViewProject, requireSession } from "@/lib/authz";
import { prisma } from "@/lib/db";

const projectInclude = {
  memberships: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { id: true, name: true } },
        },
      },
    },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  tasks: {
    orderBy: { start: "asc" as const },
  },
  files: {
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.ProjectFindUniqueArgs["include"];

type ProjectWithDetails = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

function serializeProject(project: ProjectWithDetails) {
  return {
    id: project.id,
    code: project.code,
    name: project.name,
    status: project.status,
    startDate: project.startDate?.toISOString() ?? null,
    endDate: project.endDate?.toISOString() ?? null,
    budgetPlanned: project.budgetPlanned ? Number(project.budgetPlanned) : null,
    budgetActual: project.budgetActual ? Number(project.budgetActual) : null,
    createdAt: project.createdAt.toISOString(),
    createdById: project.createdById,
    memberships: project.memberships.map((membership) => ({
      id: membership.id,
      roleInProject: membership.roleInProject,
      user: {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.user.role?.name ?? null,
      },
    })),
    tasks: project.tasks.map((task) => ({
      ...task,
      start: task.start.toISOString(),
      end: task.end.toISOString(),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    })),
    files: project.files.map((file) => ({
      ...file,
      createdAt: file.createdAt.toISOString(),
    })),
  };
}

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;
    const session = await requireSession();

    const allowed = await canViewProject(session.user.id, projectId);
    if (!allowed) {
      throw new AuthorizationError("Forbidden", 403);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: projectInclude,
    });

    if (!project) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json(serializeProject(project));
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    throw error;
  }
}
