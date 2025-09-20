import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthorizationError, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { isSystemRole } from "@/lib/roles";

const roleSelection = {
  id: true,
  name: true,
  description: true,
  isSystem: true,
  permissions: { select: { id: true, action: true } },
} as const;

const createSchema = z.object({
  name: z.string().min(2).max(64),
  description: z.string().max(255).optional().nullable(),
  permissions: z.array(z.string().min(1).max(128)).default([]),
});

function normalizeAction(action: string) {
  return action.trim().replace(/\s+/g, "_").toUpperCase();
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, "_").toUpperCase();
}

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

export async function GET() {
  try {
    await requirePermission("MANAGE_USERS");

    const roles = await prisma.role.findMany({
      orderBy: { name: "asc" },
      select: roleSelection,
    });
    return NextResponse.json(roles);
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("MANAGE_USERS");

    const payload = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const normalizedName = normalizeName(parsed.data.name);

    if (isSystemRole(normalizedName)) {
      return NextResponse.json({ message: "System role names are reserved" }, { status: 400 });
    }

    const normalizedPermissions = Array.from(
      new Set(parsed.data.permissions.map(normalizeAction)),
    );

    const exists = await prisma.role.findUnique({ where: { name: normalizedName } });
    if (exists) {
      return NextResponse.json({ message: "Role name already exists" }, { status: 409 });
    }

    const created = await prisma.role.create({
      data: {
        name: normalizedName,
        description: parsed.data.description?.trim() ?? null,
        isSystem: false,
        permissions: {
          create: normalizedPermissions.map((action) => ({ action })),
        },
      },
      select: roleSelection,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    throw error;
  }
}
