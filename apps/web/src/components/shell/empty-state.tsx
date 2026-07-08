import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <section className="grid gap-5 rounded-[10px] border-[1.5px] border-dashed border-[color:var(--border-strong)] bg-[color:var(--paper-card)] p-5 text-[color:var(--ink)] sm:p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 rotate-2 place-items-center rounded-lg border-[1.5px] border-[color:var(--klein)] bg-[color:var(--klein)]/6 text-[color:var(--klein)]">
          <Inbox className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--klein)]">
            Etat vide
          </p>
          <h2 className="mt-1 font-heading text-2xl font-semibold italic leading-tight text-[color:var(--ink)] [overflow-wrap:anywhere]">
            {title}
          </h2>
        </div>
      </div>
      <p className="max-w-[65ch] text-sm leading-6 text-[color:var(--text-muted)] sm:text-base">
        {description}
      </p>
      {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
    </section>
  );
}
