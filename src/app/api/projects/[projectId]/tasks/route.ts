import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { listTasksByProject } from "@/lib/services/task-service";
import { canViewProject } from "@/lib/authz";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const allowed = await canViewProject(session.user.id, projectId);
  if (!allowed) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const tasks = await listTasksByProject(projectId);
  return NextResponse.json(tasks);
}
