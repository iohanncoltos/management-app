import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";

export class AuthorizationError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "AuthorizationError";
  }
}

interface UserRoleContext {
  roleName: string | null;
  permissions: string[];
}

async function getUserRoleContext(userId: string): Promise<UserRoleContext | null> {
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
    return null;
  }

  return {
    roleName: user.role?.name ?? null,
    permissions: user.role?.permissions.map((permission) => permission.action) ?? [],
  };
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
  const context = await getUserRoleContext(userId);

  if (!context) {
    return false;
  }

  const { roleName, permissions } = context;

  if (isAdminRole(roleName) || permissions.includes("VIEW_PROJECT")) {
    return true;
  }

  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId },
    select: { id: true },
  });

  return Boolean(membership);
}

export async function requireProjectView(projectId: string) {
  const session = await requireSession();

  const canView = await canViewProject(session.user.id, projectId);
  if (!canView) {
    throw new AuthorizationError("Forbidden - insufficient project permissions", 403);
  }

  return session;
}

export async function requireProjectBudgetEdit(projectId: string) {
  const session = await requireSession();

  const context = await getUserRoleContext(session.user.id);

  if (!context) {
    throw new AuthorizationError("User not found", 404);
  }

  const { roleName, permissions } = context;

  // Admin or users with MANAGE_USERS permission can edit budgets
  if (isAdminRole(roleName) || permissions.includes("MANAGE_USERS")) {
    return session;
  }

  // Project managers can edit budgets
  if (roleName === "PROJECT_MANAGER") {
    // Verify they have access to this project
    const canView = await canViewProject(session.user.id, projectId);
    if (!canView) {
      throw new AuthorizationError("Forbidden - insufficient project permissions", 403);
    }
    return session;
  }

  throw new AuthorizationError("Forbidden - budget edit requires Admin or Project Manager role", 403);
}

async function getWorkspaceForAuthorization(workspaceId: string) {
  const workspace = await prisma.budgetWorkspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      ownerId: true,
      projectId: true,
    },
  });

  if (!workspace) {
    throw new AuthorizationError("Budget workspace not found", 404);
  }

  return workspace;
}

export async function canViewWorkspace(userId: string, workspaceId: string) {
  const workspace = await prisma.budgetWorkspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      ownerId: true,
      projectId: true,
    },
  });

  if (!workspace) {
    return false;
  }

  if (workspace.projectId) {
    return canViewProject(userId, workspace.projectId);
  }

  if (workspace.ownerId === userId) {
    return true;
  }

  const context = await getUserRoleContext(userId);
  if (!context) {
    return false;
  }

  const { roleName, permissions } = context;
  return isAdminRole(roleName) || permissions.includes("MANAGE_USERS");
}

export async function requireWorkspaceView(workspaceId: string) {
  const workspace = await getWorkspaceForAuthorization(workspaceId);

  if (workspace.projectId) {
    return requireProjectView(workspace.projectId);
  }

  const session = await requireSession();

  if (workspace.ownerId === session.user.id) {
    return session;
  }

  const context = await getUserRoleContext(session.user.id);
  if (!context) {
    throw new AuthorizationError("User not found", 404);
  }

  const { roleName, permissions } = context;

  if (isAdminRole(roleName) || permissions.includes("MANAGE_USERS")) {
    return session;
  }

  throw new AuthorizationError("Forbidden - insufficient workspace permissions", 403);
}

export async function requireWorkspaceBudgetEdit(workspaceId: string) {
  const workspace = await getWorkspaceForAuthorization(workspaceId);

  if (workspace.projectId) {
    return requireProjectBudgetEdit(workspace.projectId);
  }

  const session = await requireSession();

  if (workspace.ownerId === session.user.id) {
    return session;
  }

  const context = await getUserRoleContext(session.user.id);
  if (!context) {
    throw new AuthorizationError("User not found", 404);
  }

  const { roleName, permissions } = context;

  if (isAdminRole(roleName) || permissions.includes("MANAGE_USERS")) {
    return session;
  }

  throw new AuthorizationError("Forbidden - insufficient workspace permissions", 403);
}
