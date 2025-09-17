import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createTask } from "@/lib/services/task-service";
import { taskCreateSchema } from "@/lib/validation/task";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === Role.MEMBER) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = taskCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const data = parsed.data;

  const task = await createTask({
    projectId: data.projectId,
    title: data.title,
    description: data.description,
    start: new Date(data.start),
    end: new Date(data.end),
    progress: data.progress ?? 0,
    parentId: data.parentId ?? undefined,
    assigneeId: data.assigneeId ?? undefined,
    dependsOn: data.dependsOn ?? [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return NextResponse.json(task, { status: 201 });
}
