import type { ApiResponse } from "@content-ai/shared";

export const AUTH_COOKIE_NAMES = [
  "app_session",
  "session",
  "auth_token",
] as const;

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export async function readApiResponse<TData>(
  response: Response,
): Promise<ApiResponse<TData>> {
  const payload = (await response.json()) as ApiResponse<TData>;

  if (
    response.status === 401 &&
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login")
  ) {
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/login?next=${encodeURIComponent(next)}`);
  }

  return payload;
}

export function getSafeNextPath(): string {
  if (typeof window === "undefined") {
    return "/app";
  }

  const nextPath = new URLSearchParams(window.location.search).get("next");

  if (!nextPath?.startsWith("/") || nextPath.startsWith("//")) {
    return "/app";
  }

  return nextPath;
}

export function getInvitationTokenFromUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const nextPath = new URLSearchParams(window.location.search).get("next");
  const inviteMatch = nextPath?.match(/^\/invite\/(.+)$/);

  return inviteMatch?.[1] ?? null;
}
