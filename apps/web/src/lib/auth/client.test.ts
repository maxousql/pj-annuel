import { afterEach, describe, expect, it, vi } from "vitest";

import {
  changeAccountPassword,
  fetchAccountProfile,
  getApiBaseUrl,
  updateAccountProfile,
} from "./client";

describe("account auth client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the enriched account profile with the session cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await fetchAccountProfile();

    expect(fetchMock).toHaveBeenCalledWith(
      `${getApiBaseUrl()}/api/auth/me/profile`,
      { credentials: "include" },
    );
  });

  it("updates the personal identity as JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await updateAccountProfile({
      avatarUrl: "https://example.com/avatar.jpg",
      name: "Marie Content",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${getApiBaseUrl()}/api/auth/me`,
      expect.objectContaining({
        body: JSON.stringify({
          avatarUrl: "https://example.com/avatar.jpg",
          name: "Marie Content",
        }),
        credentials: "include",
        method: "PATCH",
      }),
    );
  });

  it("sends both passwords to the protected password endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await changeAccountPassword({
      currentPassword: "Password123",
      newPassword: "NewPassword456",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${getApiBaseUrl()}/api/auth/me/password`,
      expect.objectContaining({
        body: JSON.stringify({
          currentPassword: "Password123",
          newPassword: "NewPassword456",
        }),
        credentials: "include",
        method: "PATCH",
      }),
    );
  });

  it("returns a useful error when the account service is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    const result = await fetchAccountProfile();

    expect(result).toEqual({
      data: null,
      error: {
        code: "ACCOUNT_NETWORK_ERROR",
        message:
          "Impossible de joindre le service de compte. Vérifiez votre connexion puis réessayez.",
      },
    });
  });

  it("distinguishes an invalid server response from a connection failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not-json", { status: 502 })),
    );

    const result = await fetchAccountProfile();

    expect(result).toEqual({
      data: null,
      error: {
        code: "ACCOUNT_RESPONSE_ERROR",
        message:
          "Le service de compte a renvoyé une réponse invalide. Réessayez dans un instant.",
      },
    });
  });
});

function okResponse(data: unknown): Response {
  return new Response(JSON.stringify({ data, error: null }));
}
