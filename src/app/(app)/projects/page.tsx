import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { PageHeader } from "@/components/layout/page-header";
import { ProjectTable } from "@/components/projects/project-table";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const CREATE_PROJECT = "CREATE_PROJECT";
const MANAGE_USERS = "MANAGE_USERS";

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
  };
}

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  let projects: ReturnType<typeof serializeProject>[] = [];

  try {
    const canViewAll = session.user.permissions?.some((permission) =>
      [CREATE_PROJECT, MANAGE_USERS].includes(permission),
    ) ?? false;

    const projectsData = await prisma.project.findMany({
      where: canViewAll ? undefined : { memberships: { some: { userId: session.user.id } } },
      orderBy: { createdAt: "desc" },
      include: projectInclude,
    });

    projects = projectsData.map(serializeProject);
  } catch (error) {
    console.error("Error fetching projects:", error);
    projects = [];
  }

  const normalized = projects.map((project) => ({
    id: project.id,
    name: project.name,
    code: project.code,
    status: project.status,
    startDate: project.startDate ? new Date(project.startDate) : null,
    endDate: project.endDate ? new Date(project.endDate) : null,
    budgetPlanned: project.budgetPlanned ?? 0,
    budgetActual: project.budgetActual ?? 0,
    tasksTotal: 0,
    tasksComplete: 0,
    tasksOverdue: 0,
    filesCount: 0,
  }));

  const canCreateProjects = session.user.permissions?.includes(CREATE_PROJECT) ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mission Portfolio"
        description="Command center for all active and planned engagements."
        actions={
          canCreateProjects ? (
            <Button asChild>
              <Link href="/projects/new">Deploy mission</Link>
            </Button>
          ) : null
        }
      />
      <ProjectTable projects={normalized} />
    </div>
  );
}
