import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import type { NextRequestWithAuth } from "next-auth/middleware";

import { Role } from "@prisma/client";

const ADMIN_PATHS = ["/admin"];

export default withAuth(
  function middleware(request: NextRequestWithAuth) {
    const token = request.nextauth.token;

    if (!token?.sub) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const pathname = request.nextUrl.pathname;
    const isAdminRoute = ADMIN_PATHS.some((path) => pathname.startsWith(path));
    if (isAdminRoute && token.role !== Role.ADMIN) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
  },
);

export const config = {
  matcher: [
    "/dashboard",
    "/projects/:path*",
    "/admin/:path*",
    "/api/projects/:path*",
    "/api/tasks/:path*",
    "/api/files/:path*",
    "/api/resources/:path*",
  ],
};
