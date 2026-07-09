import { validateEnvironment } from "./environment.validation";

const validProduction = {
  AI_PROVIDER: "gemini",
  AUTH_SECRET: "a".repeat(40),
  API_PUBLIC_URL: "https://api.example.com",
  DATABASE_URL: "postgresql://user:pass@database.example.com:5432/app",
  FRONTEND_URL: "https://app.example.com",
  GEMINI_API_KEY: "gemini-secret",
  INTEGRATION_ENCRYPTION_KEY: Buffer.alloc(32, 4).toString("base64"),
  INVITATION_EMAIL_FROM: "Content AI <invitations@example.com>",
  INVITATION_EMAIL_PROVIDER: "resend",
  NODE_ENV: "production",
  RESEND_API_KEY: "resend-secret",
};

describe("production environment validation", () => {
  it("accepts a complete production configuration", () => {
    expect(validateEnvironment(validProduction)).toMatchObject(validProduction);
  });

  it("refuses the mock AI provider in production", () => {
    expect(() =>
      validateEnvironment({ ...validProduction, AI_PROVIDER: "mock" }),
    ).toThrow("AI_PROVIDER=mock is forbidden");
  });

  it("refuses incomplete Notion OAuth configuration", () => {
    expect(() =>
      validateEnvironment({ ...validProduction, NOTION_CLIENT_ID: "client" }),
    ).toThrow("must be configured together");
  });

  it("requires a strong state secret and compatible cookies for OAuth", () => {
    const notion = {
      NOTION_CLIENT_ID: "client",
      NOTION_CLIENT_SECRET: "secret",
      NOTION_OAUTH_STATE_SECRET: "short",
      NOTION_REDIRECT_URI:
        "https://api.example.com/api/integrations/notion/callback",
    };

    expect(() =>
      validateEnvironment({ ...validProduction, ...notion }),
    ).toThrow("NOTION_OAUTH_STATE_SECRET");
    expect(() =>
      validateEnvironment({
        ...validProduction,
        ...notion,
        AUTH_COOKIE_SAME_SITE: "strict",
        NOTION_OAUTH_STATE_SECRET: "n".repeat(40),
      }),
    ).toThrow("incompatible with an enabled OAuth flow");
  });

  it("requires an operational invitation email provider", () => {
    expect(() =>
      validateEnvironment({
        ...validProduction,
        INVITATION_EMAIL_PROVIDER: "console",
      }),
    ).toThrow("must be resend in production");
    expect(() =>
      validateEnvironment({ ...validProduction, RESEND_API_KEY: "" }),
    ).toThrow("RESEND_API_KEY");
  });

  it("validates the trusted proxy topology for replicas", () => {
    expect(() =>
      validateEnvironment({
        ...validProduction,
        APP_REPLICA_COUNT: "2",
        RATE_LIMIT_MODE: "local",
      }),
    ).toThrow("RATE_LIMIT_MODE=proxy");
    expect(() =>
      validateEnvironment({
        ...validProduction,
        APP_REPLICA_COUNT: "2",
        RATE_LIMIT_MODE: "proxy",
      }),
    ).toThrow("TRUST_PROXY_HOPS");
  });

  it("refuses a short encryption key", () => {
    expect(() =>
      validateEnvironment({
        ...validProduction,
        INTEGRATION_ENCRYPTION_KEY: "too-short",
      }),
    ).toThrow("must decode to 32 bytes");
  });
});
