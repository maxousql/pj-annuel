import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_NAMES = ["app_session", "session", "auth_token"];
const AUTH_ROUTES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const isAuthenticated = AUTH_COOKIE_NAMES.some((cookieName) => {
    return Boolean(request.cookies.get(cookieName)?.value);
  });
  const isAuthRoute = AUTH_ROUTES.includes(request.nextUrl.pathname);

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  if (isAuthRoute) {
    return NextResponse.next();
  }

  if (isAuthenticated) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/app/:path*", "/login", "/register"],
};
