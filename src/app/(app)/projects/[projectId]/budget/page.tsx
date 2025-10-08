import { notFound } from "next/navigation";

import { DoughnutChart } from "@/components/charts/doughnut-chart";
import { BudgetAdjustForm } from "@/components/projects/budget-adjust-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canViewProject, requireSession } from "@/lib/authz";
import { prisma } from "@/lib/db";

type ProjectBudgetPageProps = {
  params: Promise<{ projectId: string }>;
};

const CREATE_PROJECT = "CREATE_PROJECT";
const MANAGE_USERS = "MANAGE_USERS";

export default async function ProjectBudgetPage({ params }: ProjectBudgetPageProps) {
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
      status: true,
      budgetPlanned: true,
      budgetActual: true,
    },
  });

  if (!project) {
    notFound();
  }

  const planned = project.budgetPlanned ? Number(project.budgetPlanned) : 0;
  const actual = project.budgetActual ? Number(project.budgetActual) : 0;
  const variance = planned ? ((actual - planned) / planned) * 100 : 0;
  const canAdjustBudget = session.user.permissions.some((permission) =>
    [CREATE_PROJECT, MANAGE_USERS].includes(permission),
  );

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Budget Health</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 p-4 sm:p-6">
          <div className="h-[200px] w-[200px] sm:h-[240px] sm:w-[240px]">
            <DoughnutChart
            data={{
              labels: ["Planned", "Actual"],
              datasets: [
                {
                  data: [planned, actual],
                  backgroundColor: ["#3a7bd5", "#b03636"],
                  borderWidth: 2,
                },
              ],
            }}
              options={{
                maintainAspectRatio: false,
              }}
            />
          </div>
          <div className="w-full space-y-2 text-xs text-muted-foreground sm:text-sm">
            <div className="flex items-center justify-between">
              <span>Planned</span>
              <span className="text-foreground font-semibold">
                ${planned.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Actual</span>
              <span className="text-foreground font-semibold">
                ${actual.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Variance</span>
              <span className={variance >= 0 ? "text-destructive" : "text-chart-teal"}>
                {variance.toFixed(1)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      {canAdjustBudget ? (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Adjust Financials</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <BudgetAdjustForm projectId={project.id} budgetPlanned={planned} budgetActual={actual} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
