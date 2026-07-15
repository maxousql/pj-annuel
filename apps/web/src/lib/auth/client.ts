import type {
  AccountProfilePayload,
  ApiResponse,
  AuthSessionPayload,
} from "@content-ai/shared";

export const AUTH_COOKIE_NAMES = [
  "app_session",
  "session",
  "auth_token",
] as const;

export const PROFILE_UPDATED_EVENT = "content-ai:profile-updated";

export type UpdateAccountProfileInput = {
  avatarUrl: string;
  name: string;
};

export type ChangeAccountPasswordInput = {
  currentPassword: string;
  newPassword: string;
};

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

export function fetchAccountProfile(): Promise<
  ApiResponse<AccountProfilePayload>
> {
  return requestAccountApi<AccountProfilePayload>("/api/auth/me/profile");
}

export function updateAccountProfile(
  input: UpdateAccountProfileInput,
): Promise<ApiResponse<AuthSessionPayload>> {
  return requestAccountApi<AuthSessionPayload>("/api/auth/me", {
    body: JSON.stringify(input),
    headers: { "content-type": "application/json" },
    method: "PATCH",
  });
}

export function changeAccountPassword(
  input: ChangeAccountPasswordInput,
): Promise<ApiResponse<{ ok: boolean }>> {
  return requestAccountApi<{ ok: boolean }>("/api/auth/me/password", {
    body: JSON.stringify(input),
    headers: { "content-type": "application/json" },
    method: "PATCH",
  });
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

async function requestAccountApi<TData>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<TData>> {
  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      credentials: "include",
      ...init,
    });
  } catch {
    return {
      data: null,
      error: {
        code: "ACCOUNT_NETWORK_ERROR",
        message:
          "Impossible de joindre le service de compte. Vérifiez votre connexion puis réessayez.",
      },
    };
  }

  try {
    return await readApiResponse<TData>(response);
  } catch {
    return {
      data: null,
      error: {
        code: "ACCOUNT_RESPONSE_ERROR",
        message:
          "Le service de compte a renvoyé une réponse invalide. Réessayez dans un instant.",
      },
    };
  }
}
