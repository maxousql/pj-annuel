import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <section className="grid gap-5 rounded-[18px] border border-dashed border-[#24314D] bg-[#0F172A] p-5 text-[#E8EEFF] shadow-[0_18px_48px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[#4D80F0]/35 bg-[#4D80F0]/12 text-[#88A8FF]">
          <Inbox className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-[#88A8FF]">
            Etat vide
          </p>
          <h2 className="mt-1 text-2xl font-extrabold leading-tight text-[#E8EEFF] [overflow-wrap:anywhere]">
            {title}
          </h2>
        </div>
      </div>
      <p className="max-w-[65ch] text-sm leading-6 text-[#A3AEC5] sm:text-base">
        {description}
      </p>
      {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
    </section>
  );
}
