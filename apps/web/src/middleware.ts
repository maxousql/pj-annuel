import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_NAMES = ["app_session", "session", "auth_token"];
const AUTH_ROUTES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const isAuthenticated = AUTH_COOKIE_NAMES.some((cookieName) => {
    const value = request.cookies.get(cookieName)?.value;
    return Boolean(value && !isExpiredJwt(value));
  });
  const isAuthRoute = AUTH_ROUTES.includes(request.nextUrl.pathname);

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(
      new URL(
        readSafeNextPath(request.nextUrl.searchParams.get("next")),
        request.url,
      ),
    );
  }

  if (isAuthRoute) {
    return NextResponse.next();
  }

  if (isAuthenticated) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.redirect(loginUrl);
}

function readSafeNextPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

function isExpiredJwt(token: string): boolean {
  const payload = token.split(".")[1];
  if (!payload) return false;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(atob(normalized)) as { exp?: unknown };
    return typeof parsed.exp === "number" && parsed.exp * 1_000 <= Date.now();
  } catch {
    return false;
  }
}

export const config = {
  matcher: ["/app/:path*", "/login", "/register"],
};
