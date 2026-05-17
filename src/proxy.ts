import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";
import { canAccessAdmin, getDefaultAuthenticatedPath } from "@/lib/permissions";
import { NextResponse, type NextRequest } from "next/server";

function hasAuthenticatedIdentity(subject: unknown) {
  if (!subject || typeof subject !== "object") return false;

  const record = subject as Record<string, unknown>;
  const user = typeof record.user === "object" && record.user !== null
    ? (record.user as Record<string, unknown>)
    : null;

  const directId = typeof record.id === "string" && record.id.length > 0;
  const directEmail = typeof record.email === "string" && record.email.length > 0;
  const userId = typeof user?.id === "string" && user.id.length > 0;
  const userEmail = typeof user?.email === "string" && user.email.length > 0;
  const userName = typeof user?.name === "string" && user.name.length > 0;

  return directId || directEmail || userId || userEmail || userName;
}

export default async function proxy(req: NextRequest) {
  const isAdmin = req.nextUrl.pathname.startsWith("/admin");
  const isApp = req.nextUrl.pathname.startsWith("/app");
  const isLogin = req.nextUrl.pathname === "/admin/login";
  const token = await getToken({
    req,
    secret: getAuthSecret(),
    secureCookie: req.nextUrl.protocol === "https:",
  });
  const isAuthenticated = hasAuthenticatedIdentity(token);

  if (isAdmin && !isLogin && !isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  if (isAdmin && !isLogin && isAuthenticated && !canAccessAdmin(token)) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (isLogin && isAuthenticated) {
    return NextResponse.redirect(new URL(getDefaultAuthenticatedPath(token), req.url));
  }
  if (isApp && !isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
}

export const config = {
  matcher: ["/admin/:path*", "/app/:path*"],
};