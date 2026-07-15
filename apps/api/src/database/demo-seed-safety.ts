export function assertDemoSeedSafety(
  env: NodeJS.ProcessEnv,
  databaseUrl: string,
): boolean {
  if (env.SEED_DEMO_DATA !== "true") return false;

  if (env.ALLOW_DEMO_SEED !== "true") {
    throw new Error(
      "Demo seed requires the explicit ALLOW_DEMO_SEED=true opt-in.",
    );
  }

  if (env.NODE_ENV === "production") {
    throw new Error("Demo seed is forbidden when NODE_ENV=production.");
  }

  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is invalid for the demo seed.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const localHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const explicitlyNonProductionName =
    /(?:^|[_-])(demo|dev|test|local)(?:$|[_-])/i.test(databaseName);

  if (!localHost || !explicitlyNonProductionName) {
    throw new Error(
      "Demo seed is restricted to a loopback database explicitly named demo, dev, test or local.",
    );
  }

  return true;
}
