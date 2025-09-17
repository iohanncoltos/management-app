import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { AuditEventType, Role } from "@prisma/client";
import { argon2id, hash as argon2Hash, verify as argon2Verify } from "argon2";
import NextAuth, { type NextAuthOptions } from "next-auth";
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
  trustHost: true,
  providers: [
    Credentials({
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        } satisfies {
          id: string;
          email: string;
          name: string;
          role: Role;
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: Role }).role ?? Role.MEMBER;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as Role) ?? Role.MEMBER;
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

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};
