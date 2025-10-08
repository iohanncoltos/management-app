import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

import {
  ADMIN_ROLE_NAME,
  DEFAULT_ROLE_PERMISSIONS,
  SYSTEM_ROLE_NAMES,
  type PermissionAction,
  type SystemRoleName,
} from "../src/lib/roles";

const prisma = new PrismaClient();

const DEFAULT_DESCRIPTIONS: Record<SystemRoleName, string> = {
  ADMIN: "Full system administrator access",
  PROJECT_MANAGER: "Oversees project execution and assignments",
  MECHANICAL_ENGINEER: "Mechanical engineering contributor",
  ELECTRICAL_ENGINEER: "Electrical engineering contributor",
  SYSTEM_ENGINEER: "Systems engineering contributor",
  USER: "Standard user who can view projects and create reports, but cannot assign tasks or create projects",
  VIEWER: "Read-only access to basic information and personal tasks",
};

const DEFAULT_ROLES = SYSTEM_ROLE_NAMES.map((name) => ({
  name,
  description: DEFAULT_DESCRIPTIONS[name],
  permissions: DEFAULT_ROLE_PERMISSIONS[name],
}));

type RoleSeed = {
  name: string;
  description?: string | null;
  permissions: PermissionAction[];
  isSystem?: boolean;
};

async function syncRole({ name, description, permissions, isSystem = false }: RoleSeed) {
  const existing = await prisma.role.findUnique({
    where: { name },
    include: { permissions: true },
  });

  if (!existing) {
    await prisma.role.create({
      data: {
        name,
        description,
        isSystem,
        permissions: {
          create: permissions.map((action) => ({ action })),
        },
      },
    });
    return;
  }

  await prisma.role.update({
    where: { id: existing.id },
    data: {
      description,
      isSystem,
    },
  });

  const existingActions = new Set(existing.permissions.map((permission) => permission.action));
  const desiredActions = new Set(permissions);

  const toRemove = existing.permissions.filter((permission) => !desiredActions.has(permission.action as PermissionAction));
  const toAdd = permissions.filter((action) => !existingActions.has(action));

  if (toRemove.length > 0) {
    await prisma.permission.deleteMany({
      where: { id: { in: toRemove.map((permission) => permission.id) } },
    });
  }

  if (toAdd.length > 0) {
    await prisma.permission.createMany({
      data: toAdd.map((action) => ({ action, roleId: existing.id })),
    });
  }
}

async function ensureDefaultRoles() {
  await Promise.all(
    DEFAULT_ROLES.map((role) =>
      syncRole({
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isSystem: true,
      }),
    ),
  );
}

async function ensureAdminAccount() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const name = process.env.SEED_ADMIN_NAME ?? "Command Admin";

  const adminRole = await prisma.role.findUnique({
    where: { name: ADMIN_ROLE_NAME },
    include: { permissions: true },
  });
  if (!adminRole) {
    throw new Error("Admin role missing. Seed default roles before accounts.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (!existing.roleId) {
      await prisma.user.update({ where: { id: existing.id }, data: { roleId: adminRole.id } });
    }
    await prisma.userPreference.upsert({
      where: { userId: existing.id },
      update: {},
      create: {
        userId: existing.id,
        theme: "DARK",
        density: "COMFORTABLE",
      },
    });
    console.log(`Admin account already exists for ${email}`);
    return;
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      roleId: adminRole.id,
    },
  });

  const admin = await prisma.user.findUnique({ where: { email } });
  if (admin) {
    await prisma.userPreference.create({
      data: {
        userId: admin.id,
        theme: "DARK",
        density: "COMFORTABLE",
      },
    });
  }

  console.log("Seeded admin account:\n" + `  email: ${email}\n` + `  password: ${password}`);
}

async function main() {
  await ensureDefaultRoles();
  await ensureAdminAccount();
}

main()
  .catch((error) => {
    console.error("Failed to seed data", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
