import { afterEach, describe, expect, it, vi } from "vitest";
import { getApiBaseUrl, getBackendHealth } from "./health";

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

afterEach(() => {
  if (originalApiUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_URL;
  } else {
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  }

  vi.restoreAllMocks();
});

describe("getApiBaseUrl", () => {
  it("uses NEXT_PUBLIC_API_URL without a trailing slash", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000/";

    expect(getApiBaseUrl()).toBe("http://localhost:4000");
  });

  it("falls back to the local backend URL", () => {
    process.env.NEXT_PUBLIC_API_URL = "";

    expect(getApiBaseUrl()).toBe("http://localhost:4000");
  });
});

describe("getBackendHealth", () => {
  it("calls GET /health and unwraps API envelopes", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";
    const fetcher = vi.fn(async () => {
      return new Response(JSON.stringify({ data: { status: "ok" } }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    });

    const result = await getBackendHealth(fetcher);

    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:4000/health",
      expect.objectContaining({
        method: "GET",
      }),
    );
    expect(result).toEqual({
      ok: true,
      baseUrl: "http://localhost:4000",
      data: {
        status: "ok",
      },
    });
  });

  it("returns a readable error when the backend is unavailable", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("connection refused");
    });

    const result = await getBackendHealth(fetcher);

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      error: "connection refused",
    });
  });
});
