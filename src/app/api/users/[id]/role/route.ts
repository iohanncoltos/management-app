import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthorizationError, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/db";

const schema = z.object({
  roleId: z.string().cuid().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

const userSelection = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true,
      isSystem: true,
      permissions: { select: { action: true } },
    },
  },
} as const;

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: userId } = await context.params;
    const session = await requirePermission("MANAGE_USERS");

    if (userId === session.user.id) {
      return NextResponse.json({ message: "Cannot modify own role" }, { status: 400 });
    }

    const payload = await request.json().catch(() => null);
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const { roleId } = parsed.data;

    if (roleId) {
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) {
        return NextResponse.json({ message: "Role not found" }, { status: 404 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { roleId },
      select: userSelection,
    });

    return NextResponse.json(updated);
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    throw error;
  }
}
