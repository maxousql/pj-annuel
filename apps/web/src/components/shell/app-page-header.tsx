import type { ReactNode } from "react";

type AppPageHeaderProps = {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow: ReactNode;
  title: ReactNode;
  titleId?: string;
};

export function AppPageHeader({
  actions,
  description,
  eyebrow,
  title,
  titleId,
}: AppPageHeaderProps) {
  return (
    <section className="app-page-header">
      <div className="app-page-header-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1 id={titleId}>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? (
        <div className="app-page-header-actions">{actions}</div>
      ) : null}
    </section>
  );
}
