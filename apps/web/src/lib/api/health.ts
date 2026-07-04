import type { HealthPayload as BackendHealthPayload } from "@content-ai/shared";

export type HealthPayload = Omit<Partial<BackendHealthPayload>, "status"> & {
  status?: string;
} & Record<string, unknown>;

export type HealthCheckResult =
  | {
      ok: true;
      baseUrl: string;
      data: HealthPayload;
    }
  | {
      ok: false;
      baseUrl: string;
      error: string;
    };

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

const DEFAULT_API_URL = "http://localhost:4000";

export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const baseUrl =
    configuredUrl && configuredUrl.length > 0 ? configuredUrl : DEFAULT_API_URL;

  return baseUrl.replace(/\/+$/, "");
}

export async function getBackendHealth(
  fetcher: Fetcher = fetch,
): Promise<HealthCheckResult> {
  const baseUrl = getApiBaseUrl();

  try {
    const response = await fetcher(`${baseUrl}/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const body = await readResponseBody(response);

    if (!response.ok) {
      return {
        ok: false,
        baseUrl,
        error: getErrorMessage(response.status, body),
      };
    }

    return {
      ok: true,
      baseUrl,
      data: normalizeHealthPayload(body),
    };
  } catch (error) {
    return {
      ok: false,
      baseUrl,
      error:
        error instanceof Error ? error.message : "Unknown API health error",
    };
  }
}

async function readResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function normalizeHealthPayload(body: unknown): HealthPayload {
  if (isRecord(body) && isRecord(body.data)) {
    return body.data as BackendHealthPayload;
  }

  if (isRecord(body)) {
    return body as HealthPayload;
  }

  if (typeof body === "string" && body.trim().length > 0) {
    return {
      status: body,
    };
  }

  return {
    status: "ok",
  };
}

function getErrorMessage(status: number, body: unknown) {
  if (
    isRecord(body) &&
    isRecord(body.error) &&
    typeof body.error.message === "string"
  ) {
    return body.error.message;
  }

  if (isRecord(body) && typeof body.message === "string") {
    return body.message;
  }

  if (typeof body === "string" && body.trim().length > 0) {
    return body;
  }

  return `Backend health check failed with HTTP ${status}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
