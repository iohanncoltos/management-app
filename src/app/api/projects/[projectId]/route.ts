import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { deleteProject, getProjectById, updateProject } from "@/lib/services/project-service";
import { projectUpdateSchema } from "@/lib/validation/project";
import { Role } from "@prisma/client";

interface Context {
  params: { projectId: string };
}

export async function GET(_request: Request, { params }: Context) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const project = await getProjectById(params.projectId);
  if (!project) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (
    session.user.role === Role.MEMBER &&
    !project.tasks.some((task) => task.assigneeId === session.user.id)
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(project);
}

export async function PATCH(request: Request, { params }: Context) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === Role.MEMBER) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const data = parsed.data;

  const project = await updateProject(params.projectId, {
    ...data,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
  });

  return NextResponse.json(project);
}

export async function DELETE(_request: Request, { params }: Context) {
  const session = await auth();
  if (!session?.user || session.user.role === Role.MEMBER) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await deleteProject(params.projectId);
  return NextResponse.json({ ok: true });
}
