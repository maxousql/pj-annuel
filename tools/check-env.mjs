import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const requiredKeys = [
  "SUPABASE_PROJECT_ID",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "FRONTEND_URL",
  "NEXT_PUBLIC_API_URL",
  "API_PORT",
  "WEB_PORT",
  "AUTH_SECRET",
  "AI_PROVIDER",
  "AI_MODEL",
  "AI_TIMEOUT_MS",
  "AI_MAX_RETRIES",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "NOTION_CLIENT_ID",
  "NOTION_CLIENT_SECRET",
  "NOTION_REDIRECT_URI",
];

const runtimeRequiredKeys = [
  "SUPABASE_PROJECT_ID",
  "SUPABASE_URL",
  "DATABASE_URL",
  "FRONTEND_URL",
  "NEXT_PUBLIC_API_URL",
  "API_PORT",
  "WEB_PORT",
  "AUTH_SECRET",
  "AI_PROVIDER",
  "AI_MODEL",
  "AI_TIMEOUT_MS",
  "AI_MAX_RETRIES",
];

const [target = ".env.example"] = process.argv.slice(2);
const envPath = resolve(process.cwd(), target);
const isExampleFile = basename(envPath) === ".env.example";

if (!existsSync(envPath)) {
  console.error(
    `[env] Missing ${target}. Create it from .env.example before starting the project.`,
  );
  process.exit(1);
}

const values = parseEnv(readFileSync(envPath, "utf8"));
const missingKeys = requiredKeys.filter((key) => !(key in values));
const emptyRuntimeKeys = runtimeRequiredKeys.filter((key) => {
  return key in values && values[key]?.trim() === "";
});

if (missingKeys.length > 0) {
  console.error(
    `[env] Missing required keys in ${target}: ${missingKeys.join(", ")}`,
  );
  process.exit(1);
}

if (!isExampleFile && emptyRuntimeKeys.length > 0) {
  console.error(
    `[env] Empty required values in ${target}: ${emptyRuntimeKeys.join(", ")}`,
  );
  process.exit(1);
}

console.log(`[env] ${target} contains the expected environment keys.`);

function parseEnv(source) {
  const entries = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    entries[key] = value;
  }

  return entries;
}
