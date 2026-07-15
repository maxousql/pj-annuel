import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkNotionSchemaHealth,
  provisionNotionDatabase,
  repairNotionSchema,
} from "./client";

vi.mock("@/lib/auth/client", () => ({
  getApiBaseUrl: () => "https://api.example.com",
  readApiResponse: async (response: Response) => response.json(),
}));

describe("managed Notion integration client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("provisions only with an explicit confirmation and parent page", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await provisionNotionDatabase("acme", "parent-page");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/organizations/acme/integrations/notion/provision",
      expect.objectContaining({
        body: JSON.stringify({ confirmed: true, parentPageId: "parent-page" }),
        method: "POST",
      }),
    );
  });

  it("checks schema health with a read-only request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await checkNotionSchemaHealth("acme");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/organizations/acme/integrations/notion/health",
      { credentials: "include" },
    );
  });

  it("repairs only with an explicit confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await repairNotionSchema("acme");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/organizations/acme/integrations/notion/repair",
      expect.objectContaining({
        body: JSON.stringify({ confirmed: true }),
        method: "POST",
      }),
    );
  });
});

function okResponse(): Response {
  return new Response(JSON.stringify({ data: {}, error: null }));
}
