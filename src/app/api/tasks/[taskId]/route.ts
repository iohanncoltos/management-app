import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { deleteTask, updateTask } from "@/lib/services/task-service";
import { taskUpdateSchema } from "@/lib/validation/task";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { taskId } = await context.params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  if (session.user.role === Role.MEMBER && existing.assigneeId !== session.user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const isMemberUpdate = session.user.role === Role.MEMBER;
  const updates = parsed.data;

  if (isMemberUpdate) {
    const allowed = { progress: updates.progress ?? existing.progress };
    const task = await updateTask(taskId, { ...allowed, updatedAt: new Date() });
    return NextResponse.json(task);
  }

  const task = await updateTask(taskId, {
    ...updates,
    start: updates.start ? new Date(updates.start) : undefined,
    end: updates.end ? new Date(updates.end) : undefined,
    updatedAt: new Date(),
  });

  return NextResponse.json(task);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { taskId } = await context.params;
  const session = await auth();
  if (!session?.user || session.user.role === Role.MEMBER) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await deleteTask(taskId);
  return NextResponse.json({ ok: true });
}
