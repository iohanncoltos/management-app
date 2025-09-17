import { PrismaClient } from "@prisma/client";

declare const globalThis: {
  prisma?: PrismaClient;
};

const prisma = globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export { prisma };
