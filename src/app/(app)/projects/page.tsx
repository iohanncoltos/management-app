import Link from "next/link";

import { ProjectTable } from "@/components/projects/project-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { listProjectsForUser } from "@/lib/services/project-service";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const projects = await listProjectsForUser(session.user.id, session.user.role);

  const normalized = projects.map((project) => ({
    ...project,
    startDate: project.startDate,
    endDate: project.endDate,
    budgetPlanned: Number(project.budgetPlanned),
    budgetActual: Number(project.budgetActual),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mission Portfolio"
        description="Command center for all active and planned engagements."
        actions={
          <Button asChild>
            <Link href="/projects/new">Deploy mission</Link>
          </Button>
        }
      />
      <ProjectTable projects={normalized} />
    </div>
  );
}
