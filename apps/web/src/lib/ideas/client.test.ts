import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchIdeaDiscoveryFeed,
  generateIdeaDiscoveryFeed,
  resetIdeaDiscoveryPreferences,
  submitIdeaDiscoveryFeedback,
} from "./client";

vi.mock("@/lib/auth/client", () => ({
  getApiBaseUrl: () => "https://api.example.com",
  readApiResponse: async (response: Response) => response.json(),
}));

describe("idea discovery client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the pending discovery feed with credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await fetchIdeaDiscoveryFeed("acme");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/organizations/acme/ideas/discovery",
      { credentials: "include" },
    );
  });

  it("generates a new selection without a brief", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await generateIdeaDiscoveryFeed("acme");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/organizations/acme/ideas/discovery/generate",
      {
        credentials: "include",
        method: "POST",
      },
    );
  });

  it("sends a qualified rejection reason", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await submitIdeaDiscoveryFeedback(
      "acme",
      "candidate-1",
      "DISLIKE",
      "WRONG_FORMAT",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/organizations/acme/ideas/discovery/candidate-1/feedback",
      expect.objectContaining({
        body: JSON.stringify({ reason: "WRONG_FORMAT", signal: "DISLIKE" }),
        method: "POST",
      }),
    );
  });

  it("keeps a pass neutral by omitting a rejection reason", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await submitIdeaDiscoveryFeedback("acme", "candidate-1", "SKIP");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/organizations/acme/ideas/discovery/candidate-1/feedback",
      expect.objectContaining({
        body: JSON.stringify({ signal: "SKIP" }),
      }),
    );
  });

  it("resets only the learned preference profile", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await resetIdeaDiscoveryPreferences("acme");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/organizations/acme/ideas/discovery/preferences/reset",
      {
        credentials: "include",
        method: "POST",
      },
    );
  });

  it("returns a controlled error when the discovery service is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    const result = await fetchIdeaDiscoveryFeed("acme");

    expect(result).toEqual({
      data: null,
      error: {
        code: "IDEA_DISCOVERY_NETWORK_ERROR",
        message:
          "Impossible de joindre le service de découverte. Vérifiez votre connexion puis réessayez.",
      },
    });
  });
});

function okResponse(): Response {
  return new Response(JSON.stringify({ data: {}, error: null }));
}
