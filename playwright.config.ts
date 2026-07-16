import { defineConfig, devices } from "@playwright/test";

// Deliberately ignore DATABASE_URL so a developer can never run browser tests
// against a configured staging or production database by accident.
const databaseUrl = process.env.E2E_DATABASE_URL;
const apiUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:4000";
const webUrl = process.env.E2E_WEB_URL ?? "http://127.0.0.1:3000";
const smokeOnly = process.env.E2E_SMOKE_ONLY === "true";

assertLoopbackTestUrl(apiUrl, "E2E_API_URL");
assertLoopbackTestUrl(webUrl, "E2E_WEB_URL");
if (!smokeOnly && !databaseUrl) {
  throw new Error(
    "E2E_DATABASE_URL is required for the strict browser suite. Use npm run test:e2e:smoke for the permissive UI smoke test.",
  );
}
if (databaseUrl) assertIsolatedTestDatabase(databaseUrl);

export default defineConfig({
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  outputDir: "test-results/artifacts",
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  retries: process.env.CI ? 1 : 0,
  testDir: "./e2e",
  timeout: 90_000,
  use: {
    baseURL: webUrl,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run start:e2e -w @content-ai/api",
      env: {
        ...process.env,
        AI_PROVIDER: "mock",
        API_PORT: "4000",
        API_PUBLIC_URL: apiUrl,
        AUTH_SECRET: "e2e-auth-secret-for-content-ai-at-least-32-characters",
        ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
        DISABLE_SCHEDULED_JOBS: "true",
        FRONTEND_URL: webUrl,
        INVITATION_EMAIL_PROVIDER: "console",
        NODE_ENV: "test",
      },
      reuseExistingServer: false,
      stderr: "pipe",
      stdout: "pipe",
      timeout: 120_000,
      url: `${apiUrl}/health`,
    },
    {
      command: "npm run dev -w @content-ai/web",
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: apiUrl,
        NODE_ENV: "test",
      },
      reuseExistingServer: false,
      stderr: "pipe",
      stdout: "pipe",
      timeout: 120_000,
      url: webUrl,
    },
  ],
});

function assertLoopbackTestUrl(value: string, key: string): void {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname)
  ) {
    throw new Error(`${key} must target a loopback test server.`);
  }
}

function assertIsolatedTestDatabase(value: string): void {
  const url = new URL(value);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (
    !["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname) ||
    !/(?:^|[_-])(test|e2e)(?:$|[_-])/i.test(databaseName)
  ) {
    throw new Error(
      "E2E_DATABASE_URL must target a loopback database explicitly named test or e2e.",
    );
  }
}
