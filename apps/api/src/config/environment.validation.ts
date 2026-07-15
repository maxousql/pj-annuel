const PRODUCTION_REQUIRED_KEYS = [
  "DATABASE_URL",
  "FRONTEND_URL",
  "AUTH_SECRET",
  "INTEGRATION_ENCRYPTION_KEY",
  "AI_PROVIDER",
  "API_PUBLIC_URL",
] as const;

export function validateEnvironment(
  rawConfig: Record<string, unknown>,
): Record<string, unknown> {
  const config = Object.fromEntries(
    Object.entries(rawConfig).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ]),
  );
  const environment = readString(config, "NODE_ENV") || "development";

  if (!["development", "test", "production"].includes(environment)) {
    throw new Error("NODE_ENV must be development, test or production.");
  }

  validateNumber(config, "API_PORT", 1, 65_535, false);
  validateNumber(config, "AI_TIMEOUT_MS", 1_000, 120_000, false);
  validateNumber(config, "AI_MAX_RETRIES", 0, 5, false);
  validateNumber(config, "TRUST_PROXY_HOPS", 1, 10, false);
  validateNumber(config, "APP_REPLICA_COUNT", 1, 1_000, false);

  if (environment !== "production") return config;

  const missing = PRODUCTION_REQUIRED_KEYS.filter(
    (key) => !readString(config, key),
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(", ")}.`,
    );
  }

  const authSecret = readString(config, "AUTH_SECRET")!;
  if (authSecret.length < 32) {
    throw new Error(
      "AUTH_SECRET must contain at least 32 characters in production.",
    );
  }

  validateUrl(config, "DATABASE_URL", ["postgres:", "postgresql:"]);
  validateUrl(config, "FRONTEND_URL", ["https:"]);
  validateUrl(config, "API_PUBLIC_URL", ["https:"]);
  validateOptionalUrl(config, "NOTION_REDIRECT_URI", ["https:"]);
  validateOptionalUrl(config, "GOOGLE_REDIRECT_URI", ["https:"]);
  validateEncryptionKey(readString(config, "INTEGRATION_ENCRYPTION_KEY")!);

  const provider = readString(config, "AI_PROVIDER")?.toLowerCase();
  if (provider === "mock") {
    throw new Error("AI_PROVIDER=mock is forbidden in production.");
  }
  if (provider !== "gemini") {
    throw new Error("AI_PROVIDER must be gemini in production.");
  }
  if (!readString(config, "GEMINI_API_KEY")) {
    throw new Error(
      "GEMINI_API_KEY is required for the production AI provider.",
    );
  }

  const notionValues = [
    readString(config, "NOTION_CLIENT_ID"),
    readString(config, "NOTION_CLIENT_SECRET"),
    readString(config, "NOTION_REDIRECT_URI"),
  ];
  if (notionValues.some(Boolean) && !notionValues.every(Boolean)) {
    throw new Error(
      "NOTION_CLIENT_ID, NOTION_CLIENT_SECRET and NOTION_REDIRECT_URI must be configured together.",
    );
  }

  const notionEnabled = notionValues.every(Boolean);
  const notionStateSecret = readString(config, "NOTION_OAUTH_STATE_SECRET");
  if (notionEnabled && (!notionStateSecret || notionStateSecret.length < 32)) {
    throw new Error(
      "NOTION_OAUTH_STATE_SECRET must contain at least 32 characters when Notion OAuth is enabled.",
    );
  }

  const googleValues = [
    readString(config, "GOOGLE_CLIENT_ID"),
    readString(config, "GOOGLE_CLIENT_SECRET"),
  ];
  if (googleValues.some(Boolean) && !googleValues.every(Boolean)) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together.",
    );
  }
  const googleEnabled = googleValues.every(Boolean);

  const emailProvider = readString(config, "INVITATION_EMAIL_PROVIDER");
  if (emailProvider !== "resend") {
    throw new Error("INVITATION_EMAIL_PROVIDER must be resend in production.");
  }
  if (!readString(config, "RESEND_API_KEY")) {
    throw new Error("RESEND_API_KEY is required for invitation emails.");
  }
  const invitationFrom = readString(config, "INVITATION_EMAIL_FROM");
  if (!invitationFrom || !isValidEmailSender(invitationFrom)) {
    throw new Error(
      "INVITATION_EMAIL_FROM must contain a usable sender email address.",
    );
  }

  const sameSite = readString(config, "AUTH_COOKIE_SAME_SITE") ?? "lax";
  if (!["lax", "strict", "none"].includes(sameSite)) {
    throw new Error("AUTH_COOKIE_SAME_SITE must be lax, strict or none.");
  }
  if (sameSite === "strict" && (notionEnabled || googleEnabled)) {
    throw new Error(
      "AUTH_COOKIE_SAME_SITE=strict is incompatible with an enabled OAuth flow.",
    );
  }

  const cookieDomain = readString(config, "AUTH_COOKIE_DOMAIN");
  if (
    cookieDomain &&
    (!/^(?:\.)?[a-z0-9.-]+$/i.test(cookieDomain) || cookieDomain.includes(".."))
  ) {
    throw new Error("AUTH_COOKIE_DOMAIN must be a hostname, without scheme.");
  }

  const rateLimitMode = readString(config, "RATE_LIMIT_MODE") ?? "local";
  if (!["local", "proxy"].includes(rateLimitMode)) {
    throw new Error("RATE_LIMIT_MODE must be local or proxy.");
  }
  const replicaCount = Number(readString(config, "APP_REPLICA_COUNT") ?? "1");
  if (replicaCount > 1 && rateLimitMode !== "proxy") {
    throw new Error(
      "RATE_LIMIT_MODE=proxy is required when APP_REPLICA_COUNT is greater than 1.",
    );
  }
  if (rateLimitMode === "proxy" && !readString(config, "TRUST_PROXY_HOPS")) {
    throw new Error(
      "TRUST_PROXY_HOPS is required when rate limiting is delegated to a proxy.",
    );
  }

  return config;
}

function isValidEmailSender(value: string): boolean {
  const bracketed = value.match(/<([^<>]+)>$/)?.[1];
  const email = (bracketed ?? value).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateNumber(
  config: Record<string, unknown>,
  key: string,
  minimum: number,
  maximum: number,
  required: boolean,
): void {
  const value = readString(config, key);
  if (!value && !required) return;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(
      `${key} must be an integer between ${minimum} and ${maximum}.`,
    );
  }
}

function validateUrl(
  config: Record<string, unknown>,
  key: string,
  protocols: string[],
): void {
  const values = (readString(config, key) ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const value of values) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${key} must contain valid URLs.`);
    }
    if (!protocols.includes(url.protocol)) {
      throw new Error(`${key} must use ${protocols.join(" or ")}.`);
    }
  }
}

function validateOptionalUrl(
  config: Record<string, unknown>,
  key: string,
  protocols: string[],
): void {
  if (readString(config, key)) validateUrl(config, key, protocols);
}

function validateEncryptionKey(value: string): void {
  const valid =
    Buffer.from(value, "base64").length === 32 ||
    (/^[a-f\d]{64}$/i.test(value) && Buffer.from(value, "hex").length === 32) ||
    Buffer.from(value, "utf8").length === 32;
  if (!valid) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must decode to 32 bytes.");
  }
}

function readString(
  config: Record<string, unknown>,
  key: string,
): string | null {
  const value = config[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
