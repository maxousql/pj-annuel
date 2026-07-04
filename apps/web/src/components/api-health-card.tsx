import type { HealthCheckResult } from "@/lib/api/health";

type ApiHealthCardProps = {
  health: HealthCheckResult;
};

export function ApiHealthCard({ health }: ApiHealthCardProps) {
  const statusLabel = health.ok
    ? getStatusLabel(health.data.status)
    : "Unavailable";

  return (
    <section className="health-card" aria-labelledby="api-health-title">
      <header>
        <div>
          <p className="eyebrow">Smoke test</p>
          <h2 id="api-health-title">Backend health</h2>
        </div>
        <span
          className="status-pill"
          data-tone={health.ok ? "success" : "warning"}
        >
          {statusLabel}
        </span>
      </header>
      <dl className="health-details">
        <div>
          <dt>Endpoint</dt>
          <dd>{health.baseUrl}/health</dd>
        </div>
        <div>
          <dt>Result</dt>
          <dd>{health.ok ? "Backend reachable" : health.error}</dd>
        </div>
        {health.ok && health.data.timestamp ? (
          <div>
            <dt>Timestamp</dt>
            <dd>{health.data.timestamp}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

function getStatusLabel(status: unknown) {
  if (typeof status === "string" && status.trim().length > 0) {
    return status;
  }

  return "Reachable";
}
