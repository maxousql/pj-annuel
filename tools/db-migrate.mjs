import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "npm.cmd" : "npm";

const result = spawnSync(
  command,
  ["run", "db:migrate", "-w", "@content-ai/api"],
  {
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);
