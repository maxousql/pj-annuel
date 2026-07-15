import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const DEFAULT_API_URL = "http://localhost:4000";

export function buildContentSecurityPolicy(
  phase,
  apiUrl = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL,
) {
  const scriptSources = ["'self'", "'unsafe-inline'"];

  if (phase === PHASE_DEVELOPMENT_SERVER) {
    scriptSources.push("'unsafe-eval'");
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSources.join(" ")}`,
    `connect-src 'self' ${apiUrl}`,
    "form-action 'self'",
  ].join("; ");
}

export function createNextConfig(phase) {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    output: "standalone",
    reactStrictMode: true,
    transpilePackages: ["@content-ai/shared"],
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "DENY" },
            {
              key: "Referrer-Policy",
              value: "strict-origin-when-cross-origin",
            },
            {
              key: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=()",
            },
            {
              key: "Content-Security-Policy",
              value: buildContentSecurityPolicy(phase),
            },
          ],
        },
      ];
    },
  };

  return nextConfig;
}

export default createNextConfig;
