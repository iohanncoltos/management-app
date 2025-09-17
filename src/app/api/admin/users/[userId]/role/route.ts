import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { updateUserRole } from "@/lib/services/user-service";
import { Role } from "@prisma/client";
import { z } from "zod";

const schema = z.object({ role: z.nativeEnum(Role) });

type RouteContext = Promise<{ params: { userId: string } }>;

export async function PATCH(request: Request, context: RouteContext) {
  const { params } = await context;
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  if (params.userId === session.user.id) {
    return NextResponse.json({ message: "Cannot modify own role" }, { status: 400 });
  }

  const result = await updateUserRole(params.userId, parsed.data.role);
  return NextResponse.json({ id: result.id, role: result.role });
}
