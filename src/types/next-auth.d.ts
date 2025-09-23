import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string | null;
      permissions: string[];
    };
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    role: string | null;
    permissions: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string | null;
    permissions?: string[];
    roleRefreshedAt?: number;
  }
}
