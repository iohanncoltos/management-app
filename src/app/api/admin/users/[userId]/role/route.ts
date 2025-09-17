import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { updateUserRole } from "@/lib/services/user-service";
import { Role } from "@prisma/client";
import { z } from "zod";

const schema = z.object({ role: z.nativeEnum(Role) });

type RouteContext = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { userId } = await context.params;
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  if (userId === session.user.id) {
    return NextResponse.json({ message: "Cannot modify own role" }, { status: 400 });
  }

  const result = await updateUserRole(userId, parsed.data.role);
  return NextResponse.json({ id: result.id, role: result.role });
}
