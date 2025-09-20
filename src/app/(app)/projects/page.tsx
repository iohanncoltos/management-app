import Link from "next/link";
import { cookies } from "next/headers";

import { PageHeader } from "@/components/layout/page-header";
import { ProjectTable } from "@/components/projects/project-table";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

const API_BASE =
  process.env.APP_BASE_URL ??
  process.env.NEXTAUTH_URL ??
  "http://localhost:3000";

async function serializeCookieHeader() {
  const store = await cookies();
  return store.getAll().map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

type ApiProject = {
  id: string;
  code: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  budgetPlanned: number | null;
  budgetActual: number | null;
};

const CREATE_PROJECT = "CREATE_PROJECT";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const response = await fetch(`${API_BASE}/api/projects`, {
    headers: {
      cookie: await serializeCookieHeader(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load projects");
  }

  const projects = (await response.json()) as ApiProject[];

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

  const canCreateProjects = session.user.permissions.includes(CREATE_PROJECT);

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
