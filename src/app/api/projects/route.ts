import { NextResponse } from "next/server";
import { ProjectStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { AuthorizationError, requirePermission, requireSession } from "@/lib/authz";
import { prisma } from "@/lib/db";

const createProjectSchema = z.object({
  code: z.string().min(2).max(32),
  name: z.string().min(2).max(160),
  status: z.nativeEnum(ProjectStatus).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  memberUserIds: z.array(z.string().cuid()).default([]),
});

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
} satisfies Prisma.ProjectFindManyArgs["include"];

type ProjectWithMemberships = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

function serializeProject(project: ProjectWithMemberships) {
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
  };
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AuthorizationError("Invalid date value", 400);
  }
  return parsed;
}

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

const CREATE_PROJECT = "CREATE_PROJECT";
const MANAGE_USERS = "MANAGE_USERS";

export async function GET() {
  try {
    const session = await requireSession();

    const canViewAll = session.user.permissions.some((permission) =>
      [CREATE_PROJECT, MANAGE_USERS].includes(permission),
    );

    const projects = await prisma.project.findMany({
      where: canViewAll ? undefined : { memberships: { some: { userId: session.user.id } } },
      orderBy: { createdAt: "desc" },
      include: projectInclude,
    });

    return NextResponse.json(projects.map(serializeProject));
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(CREATE_PROJECT);
    const payload = await request.json();
    const parsed = createProjectSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid payload", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { code, name, status, startDate, endDate, memberUserIds } = parsed.data;
    const uniqueMemberIds = Array.from(new Set(memberUserIds));

    const members = uniqueMemberIds.length
      ? await prisma.user.findMany({
          where: { id: { in: uniqueMemberIds } },
          select: { id: true },
        })
      : [];

    const project = await prisma.project.create({
      data: {
        code,
        name,
        status,
        startDate: parseDate(startDate),
        endDate: parseDate(endDate),
        createdById: session.user.id,
        memberships: {
          create: members.map(({ id }) => ({ userId: id })),
        },
      },
      include: projectInclude,
    });

    return NextResponse.json(serializeProject(project), { status: 201 });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    throw error;
  }
}
