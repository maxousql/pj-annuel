import { ConfigService } from "@nestjs/config";

import { IntegrationEncryptionService } from "./integration-encryption.service";

describe("IntegrationEncryptionService", () => {
  it("round-trips metadata without exposing plaintext in storage", () => {
    const service = new IntegrationEncryptionService(
      new ConfigService({
        INTEGRATION_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
      }),
    );
    const encrypted = service.encryptJson({
      accessToken: "secret-notion-token",
      workspaceName: "Editorial",
    });

    expect(encrypted).toMatch(/^v1\./);
    expect(encrypted).not.toContain("secret-notion-token");
    expect(service.decryptJson(encrypted)).toEqual({
      accessToken: "secret-notion-token",
      workspaceName: "Editorial",
    });
  });

  it("rejects modified ciphertext", () => {
    const service = new IntegrationEncryptionService(
      new ConfigService({
        INTEGRATION_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"),
      }),
    );
    const encrypted = service.encryptJson({ accessToken: "secret" });
    const replacement = encrypted.endsWith("A") ? "B" : "A";

    expect(() =>
      service.decryptJson(`${encrypted.slice(0, -1)}${replacement}`),
    ).toThrow();
  });
});
