import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import type { NextRequestWithAuth } from "next-auth/middleware";

const ADMIN_PATHS = ["/admin"];
const MANAGE_USERS = "MANAGE_USERS";
const ONBOARDED_COOKIE = "intermax_onboarded";

export default withAuth(
  function middleware(request: NextRequestWithAuth) {
    const authToken = request.nextauth.token;
    const pathname = request.nextUrl.pathname;

    if (!authToken?.sub) {
      const isAuthRoute = pathname === "/login" || pathname === "/register";

      if (!isAuthRoute && !pathname.startsWith("/api")) {
        return NextResponse.redirect(new URL("/login", request.url));
      }

      if ((pathname === "/" || pathname === "/login") && !request.cookies.get(ONBOARDED_COOKIE)) {
        const response = NextResponse.redirect(new URL("/register", request.url));
        response.cookies.set(ONBOARDED_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 365 });
        return response;
      }

      if (pathname === "/") {
        return NextResponse.redirect(new URL("/login", request.url));
      }

      return NextResponse.next();
    }

    if (pathname === "/" || pathname === "/login" || pathname === "/register") {
      return NextResponse.redirect(new URL("/home", request.url));
    }

    const isAdminRoute = ADMIN_PATHS.some((path) => pathname.startsWith(path));
    const permissions = Array.isArray(authToken.permissions) ? (authToken.permissions as string[]) : [];
    if (isAdminRoute && !permissions.includes(MANAGE_USERS)) {
      return NextResponse.redirect(new URL("/home", request.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
  },
);

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/home",
    "/dashboard",
    "/chat",
    "/projects/:path*",
    "/admin/:path*",
    "/api/projects/:path*",
    "/api/tasks/:path*",
    "/api/files/:path*",
    "/api/resources/:path*",
    "/api/chat/:path*",
  ],
};
