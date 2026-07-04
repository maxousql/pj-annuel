type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <article className="metric-card">
      <header>
        <h3>{label}</h3>
      </header>
      <strong>{value}</strong>
      <p className="muted">{detail}</p>
    </article>
  );
}
