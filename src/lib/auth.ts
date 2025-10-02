import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { AuditEventType } from "@prisma/client";
import { argon2id, hash as argon2Hash, verify as argon2Verify } from "argon2";
import NextAuth, { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { recordAuditEvent } from "./audit";
import { prisma } from "./db";
import { env } from "./env";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function hashPassword(password: string) {
  return argon2Hash(password, {
    type: argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

async function verifyPassword(hashValue: string, password: string) {
  return argon2Verify(hashValue, password);
}

type PrismaUserWithRole = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  avatarUrl: string | null;
  role: {
    id: string;
    name: string;
    permissions: { action: string }[];
  } | null;
};

function toSessionUser(user: PrismaUserWithRole): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role?.name ?? null,
    permissions: user.role?.permissions.map((permission) => permission.action) ?? [],
  };
}

async function getUserWithRoleById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: {
        include: {
          permissions: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return toSessionUser(user as PrismaUserWithRole);
}

export const authConfig: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  secret: env.server.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        });
        if (!user || !user.passwordHash) {
          return null;
        }

        const passwordValid = await verifyPassword(user.passwordHash, password);
        if (!passwordValid) {
          await recordAuditEvent({
            type: AuditEventType.AUTH,
            entity: "user",
            entityId: user.id,
            userId: user.id,
            data: { email, status: "invalid-password" },
          });
          return null;
        }

        await recordAuditEvent({
          type: AuditEventType.AUTH,
          entity: "user",
          entityId: user.id,
          userId: user.id,
          data: { action: "login" },
        });

        return toSessionUser(user as PrismaUserWithRole);
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // After login, always redirect to home page
      if (url.startsWith(baseUrl)) {
        return `${baseUrl}/home`;
      }
      return `${baseUrl}/home`;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        const sessionUser = user as SessionUser;
        token.role = sessionUser.role;
        token.permissions = sessionUser.permissions;
         token.avatarUrl = sessionUser.avatarUrl;
        token.roleRefreshedAt = Date.now();
      }

      const shouldRefresh =
        trigger === "update" ||
        !token.role ||
        !Array.isArray(token.permissions) ||
        typeof token.roleRefreshedAt !== "number" ||
        token.roleRefreshedAt < Date.now() - 5 * 60 * 1000;

      if (shouldRefresh && token.sub) {
        const refreshed = await getUserWithRoleById(token.sub);
        token.role = refreshed?.role ?? null;
        token.permissions = refreshed?.permissions ?? [];
        token.roleRefreshedAt = Date.now();
        token.name = refreshed?.name ?? token.name ?? null;
        token.email = refreshed?.email ?? token.email ?? null;
        token.avatarUrl = refreshed?.avatarUrl ?? (token.avatarUrl as string | null) ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        return session;
      }

      session.user.id = token.sub ?? "";
      session.user.email = (token.email as string | null) ?? session.user.email ?? "";
      session.user.name = (token.name as string | null) ?? session.user.name ?? null;
      session.user.role = (token.role as string | null) ?? null;
      session.user.avatarUrl = (token.avatarUrl as string | null) ?? session.user.avatarUrl ?? null;
      session.user.permissions = Array.isArray(token.permissions)
        ? (token.permissions as string[])
        : [];

      if (session.user.permissions.length === 0 && session.user.id) {
        const refreshed = await getUserWithRoleById(session.user.id);
        if (refreshed) {
          session.user.name = refreshed.name;
          session.user.role = refreshed.role;
          session.user.permissions = refreshed.permissions;
          session.user.avatarUrl = refreshed.avatarUrl;
        }
      }

      return session;
    },
  },
  events: {
    async signOut({ token }) {
      if (!token?.sub) return;
      await recordAuditEvent({
        type: AuditEventType.AUTH,
        entity: "user",
        entityId: token.sub,
        userId: token.sub,
        data: { action: "logout" },
      });
    },
  },
};

const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };

export const auth = () => getServerSession(authConfig);

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string | null;
  permissions: string[];
};
