const webUrl = process.env.SMOKE_WEB_URL;
const apiUrl = process.env.SMOKE_API_URL;

if (!webUrl || !apiUrl) {
  console.error("[smoke] SMOKE_WEB_URL and SMOKE_API_URL are required.");
  process.exit(1);
}

const targets = [
  { label: "web login", url: new URL("/login", webUrl) },
  { label: "api liveness", url: new URL("/health", apiUrl) },
  { label: "api readiness", url: new URL("/health/ready", apiUrl) },
];

for (const target of targets) {
  const response = await fetch(target.url, {
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    console.error(`[smoke] ${target.label} failed with ${response.status}.`);
    process.exit(1);
  }

  console.log(`[smoke] ${target.label}: ${response.status}`);
}
