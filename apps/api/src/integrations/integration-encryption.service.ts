import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const VERSION = "v1";

@Injectable()
export class IntegrationEncryptionService {
  private readonly key: Buffer;

  constructor(configService: ConfigService) {
    const configuredKey = configService.get<string>(
      "INTEGRATION_ENCRYPTION_KEY",
    );
    const authSecret = configService.get<string>("AUTH_SECRET");

    if (configuredKey) {
      this.key = decodeKey(configuredKey);
      return;
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error("INTEGRATION_ENCRYPTION_KEY is required in production.");
    }

    this.key = createHash("sha256")
      .update(authSecret ?? "content-ai-local-integration-key")
      .digest();
  }

  encryptJson(value: Record<string, unknown>): string {
    const initializationVector = randomBytes(12);
    const cipher = createCipheriv(
      "aes-256-gcm",
      this.key,
      initializationVector,
    );
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(value), "utf8"),
      cipher.final(),
    ]);
    const authenticationTag = cipher.getAuthTag();

    return [
      VERSION,
      initializationVector.toString("base64url"),
      authenticationTag.toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(".");
  }

  decryptJson<TValue extends Record<string, unknown>>(
    encryptedValue: string,
  ): TValue {
    const [version, rawIv, rawTag, rawCiphertext] = encryptedValue.split(".");

    if (version !== VERSION || !rawIv || !rawTag || !rawCiphertext) {
      throw new Error("Unsupported encrypted integration credential.");
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(rawIv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(rawTag, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(rawCiphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const parsed: unknown = JSON.parse(plaintext);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid encrypted integration credential.");
    }

    return parsed as TValue;
  }
}

function decodeKey(value: string): Buffer {
  const trimmed = value.trim();
  const candidates = [
    Buffer.from(trimmed, "base64"),
    /^[a-f\d]{64}$/i.test(trimmed) ? Buffer.from(trimmed, "hex") : null,
    Buffer.from(trimmed, "utf8"),
  ];
  const key = candidates.find((candidate) => candidate?.length === 32);

  if (!key) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY must decode to exactly 32 bytes.",
    );
  }

  return key;
}
