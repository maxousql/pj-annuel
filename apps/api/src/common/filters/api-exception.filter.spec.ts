import { ArgumentsHost, BadRequestException } from "@nestjs/common";

import {
  ApiExceptionFilter,
  sanitizeRequestPath,
} from "./api-exception.filter";

describe("ApiExceptionFilter secret redaction", () => {
  it("removes query strings and invitation tokens from logged paths", () => {
    expect(
      sanitizeRequestPath(
        "/api/invitations/invite-secret/accept?code=oauth-code&state=oauth-state",
      ),
    ).toBe("/api/invitations/[redacted]/accept");
    expect(
      sanitizeRequestPath(
        "/api/integrations/notion/callback?code=oauth-code&state=oauth-state",
      ),
    ).toBe("/api/integrations/notion/callback");
  });

  it("never passes route secrets to the logger", () => {
    const filter = new ApiExceptionFilter();
    const logger = { error: jest.fn(), warn: jest.fn() };
    Object.assign(filter as object, { logger });
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: "POST",
          originalUrl:
            "/api/invitations/super-secret/accept?code=oauth-code&state=oauth-state",
          requestId: "request-123",
        }),
        getResponse: () => ({ json, status }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new BadRequestException("Requete invalide."), host);

    const serializedLogs = JSON.stringify(logger.warn.mock.calls);
    expect(serializedLogs).not.toContain("super-secret");
    expect(serializedLogs).not.toContain("oauth-code");
    expect(serializedLogs).not.toContain("oauth-state");
    expect(serializedLogs).toContain("[redacted]");
  });
});
