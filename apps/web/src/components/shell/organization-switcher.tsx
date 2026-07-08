"use client";

import type { OrganizationSummary } from "@content-ai/shared";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent } from "react";

import { getDefaultOrganizationHref } from "@/lib/navigation/app-navigation";

type OrganizationSwitcherProps = {
  activeOrganization?: OrganizationSummary | undefined;
  organizations: OrganizationSummary[];
};

export function OrganizationSwitcher({
  activeOrganization,
  organizations,
}: OrganizationSwitcherProps) {
  const router = useRouter();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextOrganization = organizations.find((organization) => {
      return organization.slug === event.target.value;
    });

    if (nextOrganization) {
      router.push(getDefaultOrganizationHref(nextOrganization.slug));
    }
  }

  if (organizations.length === 0) {
    return (
      <div className="grid gap-2 rounded-lg border-[1.5px] border-[color:var(--border-strong)] bg-[color:var(--paper-card)] p-3">
        <div className="flex items-center gap-2 text-[13px] font-bold text-[color:var(--text-muted)]">
          <Building2
            className="size-4 text-[color:var(--rubric)]"
            aria-hidden="true"
          />
          Aucune organisation
        </div>
        <Link
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border-[1.5px] border-[color:var(--rubric)] bg-[color:var(--rubric)] px-3 text-[13px] font-bold text-[color:var(--paper-card)] shadow-[3px_3px_0_rgba(23,19,15,0.18)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(23,19,15,0.18)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          href="/app/organizations/new"
        >
          <Plus className="size-4" aria-hidden="true" />
          Creer
        </Link>
      </div>
    );
  }

  return (
    <label className="grid gap-2 rounded-lg border-[1.5px] border-[color:var(--border-strong)] bg-[color:var(--paper-card)] p-3">
      <span className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
        <Building2
          className="size-4 text-[color:var(--rubric)]"
          aria-hidden="true"
        />
        Organisation
      </span>
      <select
        className="h-9 w-full rounded-md border-[1.5px] border-[color:var(--border-strong)] bg-[color:var(--paper)] px-3 text-[13px] font-bold text-[color:var(--ink)] outline-none transition focus:border-[color:var(--klein)] focus:ring-4 focus:ring-[color:var(--klein)]/15"
        aria-label="Changer d'organisation active"
        value={activeOrganization?.slug ?? ""}
        onChange={handleChange}
      >
        {organizations.map((organization) => (
          <option value={organization.slug} key={organization.id}>
            {organization.name} - {organization.role}
          </option>
        ))}
      </select>
    </label>
  );
}
