export function sanitizeNextPath(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    return "/app";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  return value;
}

export function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const suffix = path.startsWith("/") ? path : `/${path}`;

  return `${base}${suffix}`;
}
