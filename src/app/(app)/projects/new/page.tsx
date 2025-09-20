import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ProjectStatus } from "@prisma/client";

import { PageHeader } from "@/components/layout/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { auth } from "@/lib/auth";

const API_BASE =
  process.env.APP_BASE_URL ??
  process.env.NEXTAUTH_URL ??
  "http://localhost:3000";

async function serializeCookieHeader() {
  const store = await cookies();
  return store.getAll().map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

type ApiUser = {
  id: string;
  name: string | null;
  email: string;
  role: {
    id: string;
    name: string;
    isSystem: boolean;
  } | null;
};

const CREATE_PROJECT = "CREATE_PROJECT";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.permissions.includes(CREATE_PROJECT)) {
    notFound();
  }

  const response = await fetch(`${API_BASE}/api/users`, {
    headers: {
      cookie: await serializeCookieHeader(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load users");
  }

  const users = (await response.json()) as ApiUser[];

  const formUsers = users.map((user) => ({
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
    role: user.role?.name ?? "UNASSIGNED",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deploy New Mission"
        description="Define mission parameters, budget envelope, and scheduling horizon."
      />
      <ProjectForm users={formUsers} statuses={Object.values(ProjectStatus)} />
    </div>
  );
}
