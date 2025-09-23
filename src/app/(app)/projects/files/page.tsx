import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { Archive, ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

const API_BASE =
  process.env.APP_BASE_URL ??
  process.env.NEXTAUTH_URL ??
  (process.env.NODE_ENV === 'development' ? "http://localhost:3000" : "");

async function serializeCookieHeader() {
  const store = await cookies();
  return store.getAll().map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

type ApiProject = {
  id: string;
  code: string;
  name: string;
  status: string;
  _count?: {
    files: number;
  };
};

export default async function FilesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  let projects: ApiProject[] = [];

  try {
    const apiUrl = API_BASE ? `${API_BASE}/api/projects` : '/api/projects';
    const response = await fetch(apiUrl, {
      headers: {
        cookie: await serializeCookieHeader(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to load projects:", response.status, response.statusText);
      projects = [];
    } else {
      projects = (await response.json()) as ApiProject[];
    }
  } catch (error) {
    console.error("Error fetching projects:", error);
    projects = [];
  }

  // If there's only one project, redirect directly to its files
  if (projects.length === 1) {
    redirect(`/projects/${projects[0].id}/files`);
  }

  const statusVariants: Record<string, { label: string; variant: "default" | "warning" | "success" | "danger" }> = {
    PLANNING: { label: "Planning", variant: "default" },
    ACTIVE: { label: "Active", variant: "success" },
    ON_HOLD: { label: "On Hold", variant: "warning" },
    COMPLETED: { label: "Completed", variant: "success" },
    CLOSED: { label: "Closed", variant: "default" },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="File Management"
        description="Access and manage files across all your projects."
      />

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Projects Available</h3>
            <p className="text-muted-foreground mb-4">
              You need access to projects to view their files.
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
            const fileCount = project._count?.files ?? 0;

            return (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">{project.code}</p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Archive className="h-4 w-4" />
                    <span>{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
                  </div>

                  <Button asChild className="w-full">
                    <Link
                      href={`/projects/${project.id}/files`}
                      className="inline-flex items-center gap-2"
                    >
                      View Files
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