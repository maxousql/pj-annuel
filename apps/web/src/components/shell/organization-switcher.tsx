"use client";

import type { OrganizationSummary } from "@content-ai/shared";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDefaultOrganizationHref } from "@/lib/navigation/app-navigation";

type OrganizationSwitcherProps = {
  activeOrganization?: OrganizationSummary | undefined;
  organizations: OrganizationSummary[];
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  EDITOR: "Éditeur",
  READER: "Lecteur",
};

export function OrganizationSwitcher({
  activeOrganization,
  organizations,
}: OrganizationSwitcherProps) {
  const router = useRouter();

  function handleValueChange(slug: string | null) {
    if (!slug) return;
    const next = organizations.find((o) => o.slug === slug);
    if (next) router.push(getDefaultOrganizationHref(next.slug));
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
          Créer
        </Link>
      </div>
    );
  }

  const activeRole = activeOrganization?.role;
  const roleLabel = activeRole ? (ROLE_LABELS[activeRole] ?? activeRole) : null;

  return (
    <div className="grid gap-1.5 rounded-lg border-[1.5px] border-[color:var(--border-strong)] bg-[color:var(--paper-card)] p-3">
      <span className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
        <Building2
          className="size-4 text-[color:var(--rubric)]"
          aria-hidden="true"
        />
        Organisation
      </span>
      <Select
        value={activeOrganization?.slug ?? ""}
        onValueChange={handleValueChange}
      >
        <SelectTrigger
          className="h-9 w-full border-[1.5px] border-(--border-strong) bg-paper text-[13px] font-semibold text-ink hover:border-ink"
          aria-label="Changer d'organisation active"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} sideOffset={6}>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.slug}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {roleLabel ? (
        <span className="text-[11px] font-medium text-(--text-subtle)">
          {roleLabel}
        </span>
      ) : null}
    </div>
  );
}
