import type { Request, Response } from "express";

import {
  AUTH_COOKIE_NAME,
  AUTH_TOKEN_TTL_SECONDS,
  GOOGLE_OAUTH_FRONTEND_ORIGIN_COOKIE_NAME,
  GOOGLE_OAUTH_NEXT_COOKIE_NAME,
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
  GOOGLE_OAUTH_STATE_TTL_SECONDS,
} from "../auth.constants";

type SameSite = "lax" | "strict" | "none";

type CookieOptions = {
  httpOnly: boolean;
  maxAge?: number;
  path: string;
  sameSite: SameSite;
  secure: boolean;
};

export function setAuthCookie(response: Response, token: string): void {
  response.cookie(AUTH_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    maxAge: AUTH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookie(response: Response): void {
  response.clearCookie(AUTH_COOKIE_NAME, baseCookieOptions());
}

export function setGoogleOAuthCookies(
  response: Response,
  state: string,
  nextPath: string,
  frontendOrigin: string,
): void {
  const options = {
    ...baseCookieOptions(),
    maxAge: GOOGLE_OAUTH_STATE_TTL_SECONDS * 1000,
  };

  response.cookie(GOOGLE_OAUTH_STATE_COOKIE_NAME, state, options);
  response.cookie(GOOGLE_OAUTH_NEXT_COOKIE_NAME, nextPath, options);
  response.cookie(
    GOOGLE_OAUTH_FRONTEND_ORIGIN_COOKIE_NAME,
    frontendOrigin,
    options,
  );
}

export function clearGoogleOAuthCookies(response: Response): void {
  const options = baseCookieOptions();

  response.clearCookie(GOOGLE_OAUTH_STATE_COOKIE_NAME, options);
  response.clearCookie(GOOGLE_OAUTH_NEXT_COOKIE_NAME, options);
  response.clearCookie(GOOGLE_OAUTH_FRONTEND_ORIGIN_COOKIE_NAME, options);
}

export function readCookie(request: Request, name: string): string | undefined {
  const rawCookieHeader = request.headers.cookie;

  if (!rawCookieHeader) {
    return undefined;
  }

  for (const rawCookie of rawCookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = rawCookie.trim().split("=");

    if (rawName === name) {
      return decodeURIComponent(rawValueParts.join("="));
    }
  }

  return undefined;
}

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}
