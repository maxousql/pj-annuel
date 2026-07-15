import { cn } from "@/lib/utils";

type LoadingStateProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function LoadingState({
  title = "Chargement",
  description,
  className,
}: LoadingStateProps) {
  return (
    <section
      className={cn(
        "grid gap-5 rounded-[10px] border-[1.5px] border-[color:var(--border)] bg-[color:var(--paper-card)] p-5 sm:p-6",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg border-[1.5px] border-[color:var(--border-strong)] bg-[color:var(--paper-2)]">
          <LoadingSpinner className="size-5 text-[color:var(--ink)]" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
            En cours
          </p>
          <h2 className="mt-1 font-heading text-2xl font-semibold italic leading-tight text-[color:var(--ink)] [overflow-wrap:anywhere]">
            {title}
          </h2>
        </div>
      </div>
      {description ? (
        <p className="max-w-[65ch] text-sm leading-6 text-[color:var(--text-muted)] sm:text-base">
          {description}
        </p>
      ) : null}
      <span className="sr-only" role="status">
        {title}
      </span>
    </section>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        className="opacity-80"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
