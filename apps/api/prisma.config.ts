import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

[
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env.local"),
  resolve(process.cwd(), "../../.env"),
].forEach((path) => {
  loadEnv({ path });
});

const fallbackDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node -r tsconfig-paths/register prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? fallbackDatabaseUrl,
  },
});
