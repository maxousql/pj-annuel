import { ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";

type AccessDeniedProps = {
  title?: string;
  description?: string;
};

export function AccessDenied({
  description = "Votre role actuel ne permet pas d'acceder a cette section.",
  title = "Acces refuse",
}: AccessDeniedProps) {
  return (
    <section
      className="grid gap-5 rounded-[18px] border border-[#24314D] bg-[#0F172A] p-5 text-[#E8EEFF] shadow-[0_18px_48px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6"
      role="alert"
    >
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[#F56C7A]/30 bg-[#F56C7A]/12 text-[#F56C7A]">
          <ShieldAlert className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-[#F56C7A]">
            Permission
          </p>
          <h2 className="mt-1 text-2xl font-extrabold leading-tight text-[#E8EEFF] [overflow-wrap:anywhere]">
            {title}
          </h2>
        </div>
      </div>
      <p className="max-w-[65ch] text-sm leading-6 text-[#A3AEC5] sm:text-base">
        {description}
      </p>
      <Link
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-2xl border border-[#24314D] bg-[#121C33] px-4 text-sm font-bold text-[#E8EEFF] transition hover:border-[#88A8FF]/60 hover:bg-[#1A2742]"
        href="/app"
      >
        <ArrowLeft className="size-4 text-[#88A8FF]" aria-hidden="true" />
        Revenir aux organisations
      </Link>
    </section>
  );
}
