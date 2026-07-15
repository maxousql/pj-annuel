import { ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";

type AccessDeniedProps = {
  title?: string;
  description?: string;
};

export function AccessDenied({
  description = "Votre rôle actuel ne permet pas d'accéder à cette section.",
  title = "Accès refusé",
}: AccessDeniedProps) {
  return (
    <section
      className="grid gap-5 rounded-[10px] border-[1.5px] border-[color:var(--danger)]/50 bg-[color:var(--paper-card)] p-5 text-[color:var(--ink)] shadow-[4px_4px_0_rgba(179,38,30,0.25)] sm:p-6"
      role="alert"
    >
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 -rotate-2 place-items-center rounded-lg border-[1.5px] border-[color:var(--danger)] bg-[color:var(--danger)]/8 text-[color:var(--danger)]">
          <ShieldAlert className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--danger)]">
            Permission
          </p>
          <h2 className="mt-1 font-heading text-2xl font-semibold italic leading-tight text-[color:var(--ink)] [overflow-wrap:anywhere]">
            {title}
          </h2>
        </div>
      </div>
      <p className="max-w-[65ch] text-sm leading-6 text-[color:var(--text-muted)] sm:text-base">
        {description}
      </p>
      <Link
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md border-[1.5px] border-[color:var(--ink)] bg-[color:var(--paper-card)] px-4 text-sm font-bold text-[color:var(--ink)] shadow-[3px_3px_0_var(--ink)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        href="/app"
      >
        <ArrowLeft
          className="size-4 text-[color:var(--rubric)]"
          aria-hidden="true"
        />
        Revenir aux organisations
      </Link>
    </section>
  );
}
