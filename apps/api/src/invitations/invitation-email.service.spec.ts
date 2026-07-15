import { Logger, ServiceUnavailableException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

import type { InvitationEmailInput } from "./invitation-email.template";
import { InvitationEmailService } from "./invitation-email.service";

const originalNodeEnv = process.env.NODE_ENV;

describe("InvitationEmailService", () => {
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  it("sends a branded, localized HTML and text invitation through Resend", async () => {
    const fetchMock = mockFetch(response({ ok: true, status: 200 }));
    const service = createService();

    await service.sendInvitation(invitationInput());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const [url, init] = call!;
    const payload = readPayload(init);

    expect(url).toBe("https://api.resend.com/emails");
    expect(init).toMatchObject({
      headers: {
        authorization: "Bearer resend-test-key",
        "content-type": "application/json",
      },
      method: "POST",
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(payload).toMatchObject({
      from: "Content AI <invitations@example.com>",
      subject:
        "Alice Martin vous invite à rejoindre Atelier Éditorial sur Content AI",
      to: ["invitee@example.com"],
    });
    expect(payload.html).toContain("Content AI");
    expect(payload.html).toContain("#F6F1E7");
    expect(payload.html).toContain("#FFFDF7");
    expect(payload.html).toContain("#17130F");
    expect(payload.html).toContain("#D8401F");
    expect(payload.html).toContain('role="presentation"');
    expect(payload.html).toContain("max-width: 620px");
    expect(payload.html).toContain("Alice Martin");
    expect(payload.html).toContain("Atelier Éditorial");
    expect(payload.html).toContain("Éditeur");
    expect(payload.html).toContain("20 juillet 2026");
    expect(payload.html).toContain("(UTC)");
    expect(payload.html).toContain(
      'href="https://app.example.com/invite/token-123"',
    );
    expect(payload.html).toContain(
      ">https://app.example.com/invite/token-123</a>",
    );
    expect(payload.html).not.toContain("var(--");
    expect(payload.html).not.toContain("<svg");
    expect(payload.text).toContain("Content AI.");
    expect(payload.text).toContain("Alice Martin");
    expect(payload.text).toContain("Atelier Éditorial");
    expect(payload.text).toContain("Rôle proposé : Éditeur");
    expect(payload.text).toContain("20 juillet 2026");
    expect(payload.text).toContain("(UTC)");
    expect(payload.text).toContain("https://app.example.com/invite/token-123");
  });

  it("keeps essential content readable when inline styles are removed", async () => {
    mockFetch(response({ ok: true, status: 202 }));
    const service = createService();

    await service.sendInvitation(invitationInput());

    const payload = lastPayload();
    const withoutStyles = payload.html.replace(/\sstyle="[^"]*"/g, "");

    expect(withoutStyles).toContain("Content AI");
    expect(withoutStyles).toContain("Rejoignez Atelier Éditorial");
    expect(withoutStyles).toContain("Accepter l’invitation");
    expect(withoutStyles).toContain("https://app.example.com/invite/token-123");
    expect(withoutStyles).toContain("Expiration");
    expect(withoutStyles).toContain("(UTC)");
  });

  it("escapes hostile dynamic values and sanitizes subject line breaks", async () => {
    mockFetch(response({ ok: true, status: 200 }));
    const service = createService();
    const hostileInput = invitationInput({
      invitationUrl:
        "https://app.example.com/invite/token-123?source=email&kind=invite",
      inviterName:
        'Ada <img src=x onerror="alert(1)">\r\nBcc: victim@example.com',
      organizationName: 'Atelier "><script>alert(2)</script>',
      role: '<b onclick="alert(3)">Propriétaire</b>',
    });

    await service.sendInvitation(hostileInput);

    const payload = lastPayload();
    expect(payload.subject).not.toMatch(/[\r\n]/);
    expect(payload.html).not.toContain("<img");
    expect(payload.html).not.toContain("<script");
    expect(payload.html).not.toContain("<b onclick");
    expect(payload.html).toContain("&lt;img");
    expect(payload.html).toContain("&lt;script&gt;");
    expect(payload.html).toContain("&lt;b onclick=&quot;alert(3)&quot;&gt;");
    expect(payload.html).toContain("source=email&amp;kind=invite");
    expect(payload.html).not.toMatch(/href="[^"]*javascript:/i);
    expect(payload.text).toContain("Propriétaire");
    expect(payload.text).not.toContain("\nBcc:");
    expect(payload.text).not.toMatch(/[\r\u0000\u007f\u2028\u2029]/);
  });

  it("keeps long dynamic values breakable on narrow email clients", async () => {
    mockFetch(response({ ok: true, status: 200 }));
    const service = createService();

    await service.sendInvitation(
      invitationInput({ organizationName: "W".repeat(120) }),
    );

    const payload = lastPayload();
    expect(payload.html).toContain("overflow-wrap: anywhere");
    expect(payload.html).toContain("word-break: break-word");
  });

  it("rejects an invalid expiration before any provider call", async () => {
    const fetchMock = mockFetch(response({ ok: true, status: 200 }));
    const service = createService();

    await expect(
      service.sendInvitation(
        invitationInput({ expiresAt: new Date("invalid") }),
      ),
    ).rejects.toThrow("Invitation expiration date must be valid.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the canonical HTTP URL in both email representations", async () => {
    mockFetch(response({ ok: true, status: 200 }));
    const service = createService();

    await service.sendInvitation(
      invitationInput({ invitationUrl: "https://app.example.com" }),
    );

    const payload = lastPayload();
    expect(payload.html).toContain('href="https://app.example.com/"');
    expect(payload.text).toContain("https://app.example.com/");
  });

  it("rejects a non-HTTP action URL before any provider call", async () => {
    const fetchMock = mockFetch(response({ ok: true, status: 200 }));
    const service = createService();

    await expect(
      service.sendInvitation(
        invitationInput({ invitationUrl: "javascript:alert(1)" }),
      ),
    ).rejects.toThrow("must use HTTP or HTTPS");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses console mode without network access or leaking the invitation URL", async () => {
    process.env.NODE_ENV = "test";
    const fetchMock = mockFetch(response({ ok: true, status: 200 }));
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
    const service = createService({
      INVITATION_EMAIL_PROVIDER: "console",
    });

    await service.sendInvitation(
      invitationInput({ organizationName: "Atelier\nÉditorial" }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
    const log = String(logSpy.mock.calls[0]?.[0]);
    expect(log).toContain("i***@example.com");
    expect(log).toContain("Atelier Éditorial");
    expect(log).not.toContain("token-123");
    expect(log).not.toContain("https://");
    expect(log).not.toContain("resend-test-key");
    expect(log).not.toContain("\n");
  });

  it.each([
    [{ INVITATION_EMAIL_PROVIDER: "smtp" }, "provider inconnu"],
    [{ RESEND_API_KEY: "" }, "clé Resend absente"],
  ])("rejects an invalid configuration: %s (%s)", async (overrides, _label) => {
    const fetchMock = mockFetch(response({ ok: true, status: 200 }));
    const service = createService(overrides);

    await expect(service.sendInvitation(invitationInput())).rejects.toThrow(
      "Le service d'envoi d'invitations n'est pas configuré.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes provider rejections without reading or logging the response body", async () => {
    const responseBody = jest
      .fn()
      .mockResolvedValue(
        "provider-secret invitee@example.com https://app.example.com/invite/token-123",
      );
    mockFetch(
      response({
        ok: false,
        status: 422,
        statusText: "Unprocessable",
        text: responseBody,
      }),
    );
    const errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation();
    const service = createService();

    await expect(service.sendInvitation(invitationInput())).rejects.toThrow(
      new ServiceUnavailableException(
        "L'email d'invitation n'a pas pu être envoyé.",
      ),
    );

    expect(responseBody).not.toHaveBeenCalled();
    const log = errorSpy.mock.calls.flat().join(" ");
    expect(log).toBe("Resend invitation email rejected (status=422).");
    expect(log).not.toContain("provider-secret");
    expect(log).not.toContain("invitee@example.com");
    expect(log).not.toContain("token-123");
  });

  it.each([
    [
      Object.assign(new Error("secret network details"), { name: "TypeError" }),
      "network",
    ],
    [
      Object.assign(new Error("secret timeout details"), {
        name: "TimeoutError",
      }),
      "timeout",
    ],
  ])(
    "normalizes a %s fetch failure without logging its message",
    async (failure, category) => {
      jest.spyOn(globalThis, "fetch").mockRejectedValue(failure);
      const errorSpy = jest
        .spyOn(Logger.prototype, "error")
        .mockImplementation();
      const service = createService();

      await expect(service.sendInvitation(invitationInput())).rejects.toThrow(
        "L'email d'invitation n'a pas pu être envoyé.",
      );

      const log = errorSpy.mock.calls.flat().join(" ");
      expect(log).toBe(`Resend invitation email request failed (${category}).`);
      expect(log).not.toContain("secret");
      expect(log).not.toContain("token-123");
    },
  );
});

function createService(
  overrides: Record<string, string> = {},
): InvitationEmailService {
  const values: Record<string, string> = {
    INVITATION_EMAIL_FROM: "Content AI <invitations@example.com>",
    INVITATION_EMAIL_PROVIDER: "resend",
    RESEND_API_KEY: "resend-test-key",
    ...overrides,
  };
  const configService = {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;

  return new InvitationEmailService(configService);
}

function invitationInput(
  overrides: Partial<InvitationEmailInput> = {},
): InvitationEmailInput {
  return {
    email: "invitee@example.com",
    expiresAt: new Date("2026-07-20T14:30:00.000Z"),
    invitationUrl: "https://app.example.com/invite/token-123",
    inviterName: "Alice Martin",
    organizationName: "Atelier Éditorial",
    role: "EDITOR",
    ...overrides,
  };
}

function mockFetch(value: Response) {
  return jest.spyOn(globalThis, "fetch").mockResolvedValue(value);
}

function response(overrides: Partial<Response>): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    text: jest.fn().mockResolvedValue(""),
    ...overrides,
  } as unknown as Response;
}

function readPayload(init?: RequestInit): {
  from: string;
  html: string;
  subject: string;
  text: string;
  to: string[];
} {
  return JSON.parse(String(init?.body)) as {
    from: string;
    html: string;
    subject: string;
    text: string;
    to: string[];
  };
}

function lastPayload() {
  const fetchMock = jest.mocked(globalThis.fetch);
  return readPayload(fetchMock.mock.calls.at(-1)?.[1]);
}
