export const DEFAULT_API_PORT = 4000;

export function resolveApiPort(env: NodeJS.ProcessEnv = process.env): number {
  const rawPort =
    firstNonEmptyValue(env.API_PORT, env.PORT) ?? String(DEFAULT_API_PORT);
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid API port "${rawPort}". Use API_PORT or PORT with a number between 1 and 65535.`,
    );
  }

  return port;
}

export function buildCorsOptions(frontendUrl?: string | undefined) {
  const origins = parseCsvEnv(frontendUrl);

  return {
    credentials: true,
    origin: origins.length > 0 ? origins : true,
  };
}

function parseCsvEnv(value?: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is string => entry.length > 0);
}

function firstNonEmptyValue(
  ...values: Array<string | undefined>
): string | undefined {
  for (const value of values) {
    const normalized = value?.trim();

    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}
