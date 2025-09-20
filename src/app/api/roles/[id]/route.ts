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

const updateSchema = z.object({
  name: z.string().min(2).max(64).optional(),
  description: z.string().max(255).optional().nullable(),
  permissions: z.array(z.string().min(1).max(128)).optional(),
});

function normalizeAction(action: string) {
  return action.trim().replace(/\s+/g, "_").toUpperCase();
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, "_").toUpperCase();
}

type RouteContext = { params: Promise<{ id: string }> };

function handleAuthError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return null;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requirePermission("MANAGE_USERS");

    const { id } = await context.params;
    const payload = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const role = await prisma.role.findUnique({ where: { id }, select: { id: true, name: true, isSystem: true } });
    if (!role) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
    }

    const updates = parsed.data;

    if (role.isSystem) {
      if (typeof updates.name === "string" && normalizeName(updates.name) !== role.name) {
        return NextResponse.json({ message: "System roles cannot be renamed" }, { status: 400 });
      }
      if (updates.permissions) {
        return NextResponse.json({ message: "System roles cannot change permissions" }, { status: 400 });
      }
    }

    const data: Record<string, unknown> = {};

    if (typeof updates.name === "string") {
      const normalizedName = normalizeName(updates.name);
      if (isSystemRole(normalizedName) && !role.isSystem) {
        return NextResponse.json({ message: "System role names are reserved" }, { status: 400 });
      }
      const exists = await prisma.role.findUnique({ where: { name: normalizedName } });
      if (exists && exists.id !== role.id) {
        return NextResponse.json({ message: "Role name already exists" }, { status: 409 });
      }
      data.name = normalizedName;
    }

    if ("description" in updates) {
      data.description = updates.description?.trim() ?? null;
    }

    const normalizedPermissions = updates.permissions
      ? Array.from(new Set(updates.permissions.map(normalizeAction)))
      : null;

    const updatedRole = await prisma.role.update({
      where: { id: role.id },
      data: {
        ...data,
        ...(normalizedPermissions && {
          permissions: {
            deleteMany: {},
            create: normalizedPermissions.map((action) => ({ action })),
          },
        }),
      },
      select: roleSelection,
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    throw error;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requirePermission("MANAGE_USERS");
    const { id } = await context.params;

    const role = await prisma.role.findUnique({ where: { id }, select: { id: true, name: true, isSystem: true } });
    if (!role) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ message: "System roles cannot be deleted" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.updateMany({ where: { roleId: id }, data: { roleId: null } }),
      prisma.role.delete({ where: { id } }),
    ]);

    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    const handled = handleAuthError(error);
    if (handled) return handled;
    throw error;
  }
}
