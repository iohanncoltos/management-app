import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createProject, listProjectsForUser } from "@/lib/services/project-service";
import { projectCreateSchema } from "@/lib/validation/project";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const projects = await listProjectsForUser(session.user.id, session.user.role);
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = projectCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const data = parsed.data;

  const project = await createProject({
    name: data.name,
    code: data.code,
    status: data.status,
    startDate: new Date(data.startDate),
    endDate: data.endDate ? new Date(data.endDate) : null,
    budgetPlanned: data.budgetPlanned,
    budgetActual: data.budgetActual ?? 0,
    createdById: session.user.id,
  });

  return NextResponse.json(project, { status: 201 });
}
