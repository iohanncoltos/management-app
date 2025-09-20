import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";

export class AuthorizationError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthorizationError("Unauthorized", 401);
  }
  return session;
}

export async function requireRole(required: string | string[]) {
  const session = await requireSession();
  const requiredRoles = Array.isArray(required) ? required : [required];
  if (!session.user.role || !requiredRoles.includes(session.user.role)) {
    throw new AuthorizationError("Forbidden", 403);
  }
  return session;
}

export async function requirePermission(required: string | string[]) {
  const session = await requireSession();
  const requiredPermissions = Array.isArray(required) ? required : [required];
  const hasPermission = requiredPermissions.every((permission) =>
    session.user.permissions.includes(permission),
  );

  if (!hasPermission) {
    throw new AuthorizationError("Forbidden", 403);
  }

  return session;
}

export async function requireAdmin() {
  return requireRole("ADMIN");
}

export async function canViewProject(userId: string, projectId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: {
        select: {
          name: true,
          permissions: { select: { action: true } },
        },
      },
    },
  });

  if (!user) {
    return false;
  }

  const roleName = user.role?.name ?? null;
  const permissions = user.role?.permissions.map((permission) => permission.action) ?? [];

  if (isAdminRole(roleName) || permissions.includes("VIEW_PROJECT")) {
    return true;
  }

  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId },
    select: { id: true },
  });

  return Boolean(membership);
}
