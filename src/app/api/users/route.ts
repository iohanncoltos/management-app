import { NextResponse } from "next/server";

import { AuthorizationError, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/db";

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

export async function GET() {
  try {
    await requirePermission("MANAGE_USERS");

    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
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
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    throw error;
  }
}
