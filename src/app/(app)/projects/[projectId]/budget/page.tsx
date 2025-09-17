import { notFound } from "next/navigation";

import { Role } from "@prisma/client";

import { DoughnutChart } from "@/components/charts/doughnut-chart";
import { BudgetAdjustForm } from "@/components/projects/budget-adjust-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getProjectById } from "@/lib/services/project-service";

export default async function ProjectBudgetPage({ params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const project = await getProjectById(params.projectId);
  if (!project) {
    notFound();
  }

  const planned = Number(project.budgetPlanned);
  const actual = Number(project.budgetActual);
  const variance = planned ? ((actual - planned) / planned) * 100 : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Budget Health</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
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
          />
          <div className="w-full space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Planned</span>
              <span className="text-foreground font-semibold">${planned.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Actual</span>
              <span className="text-foreground font-semibold">${actual.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Variance</span>
              <span className={variance >= 0 ? "text-destructive" : "text-chart-teal"}>{variance.toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
      {session.user.role !== Role.MEMBER ? (
        <Card>
          <CardHeader>
            <CardTitle>Adjust Financials</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetAdjustForm projectId={project.id} budgetPlanned={planned} budgetActual={actual} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
