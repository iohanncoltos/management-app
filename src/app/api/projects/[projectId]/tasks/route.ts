import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { listTasksByProject } from "@/lib/services/task-service";
import { Role } from "@prisma/client";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tasks = await listTasksByProject(projectId);

  if (
    session.user.role === Role.MEMBER &&
    !tasks.some((task) => task.assigneeId === session.user.id)
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(tasks);
}
