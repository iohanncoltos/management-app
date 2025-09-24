import Link from "next/link";
import { redirect } from "next/navigation";
import { Calculator, ExternalLink } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    budgetPlanned: project.budgetPlanned ? Number(project.budgetPlanned) : null,
    budgetActual: project.budgetActual ? Number(project.budgetActual) : null,
  };
}

type ApiProject = ReturnType<typeof serializeProject>;

const statusVariants: Record<string, { label: string; variant: "default" | "warning" | "success" | "danger" }> = {
  PLANNING: { label: "Planning", variant: "default" },
  ACTIVE: { label: "Active", variant: "success" },
  ON_HOLD: { label: "On Hold", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "success" },
  CLOSED: { label: "Closed", variant: "default" },
};

export default async function BudgetPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  let projects: ApiProject[] = [];

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

  // If there's only one project, redirect directly to its budget
  if (projects.length === 1) {
    redirect(`/budget/${projects[0].id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget Management"
        description="Manage project budgets with Excel-like functionality and automatic categorization."
      />

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Projects Available</h3>
            <p className="text-muted-foreground mb-4">
              You need access to projects to manage their budgets.
            </p>
            <Button asChild>
              <Link href="/projects">View Projects</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const status = statusVariants[project.status] ?? statusVariants.PLANNING;
            const budgetPlanned = project.budgetPlanned ?? 0;
            const budgetActual = project.budgetActual ?? 0;
            const budgetVariance = budgetPlanned > 0
              ? ((budgetActual - budgetPlanned) / budgetPlanned) * 100
              : 0;

            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">{project.code}</p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Planned Budget:</span>
                      <span className="font-semibold">
                        €{budgetPlanned.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Current Budget:</span>
                      <span className="font-semibold">
                        €{budgetActual.toLocaleString()}
                      </span>
                    </div>

                    {budgetPlanned > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Variance:</span>
                        <span className={`font-semibold ${
                          budgetVariance > 10 ? 'text-red-600' :
                          budgetVariance > 0 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {budgetVariance > 0 ? '+' : ''}{budgetVariance.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <Button asChild className="w-full">
                    <Link
                      href={`/budget/${project.id}`}
                      className="inline-flex items-center gap-2"
                    >
                      <Calculator className="h-4 w-4" />
                      Manage Budget
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}