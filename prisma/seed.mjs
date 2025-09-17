import { PrismaClient, Role } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
const name = process.env.SEED_ADMIN_NAME ?? "Command Admin";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
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
      role: Role.ADMIN,
      passwordHash,
    },
  });

  console.log("Seeded admin account:\n" +
    `  email: ${email}\n` +
    `  password: ${password}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed admin user", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
