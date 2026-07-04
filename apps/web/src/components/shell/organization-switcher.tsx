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
      <div className="grid gap-2 rounded-[10px] border border-[#172139] bg-[#0D172B] p-3">
        <div className="flex items-center gap-2 text-[13px] font-bold text-[#A3AEC5]">
          <Building2 className="size-4 text-[#88A8FF]" aria-hidden="true" />
          Aucune organisation
        </div>
        <Link
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#C3F400] px-3 text-[13px] font-black text-[#071123] transition hover:bg-[#C3F400]"
          href="/app/organizations/new"
        >
          <Plus className="size-4" aria-hidden="true" />
          Creer
        </Link>
      </div>
    );
  }

  return (
    <label className="grid gap-2 rounded-[10px] border border-[#172139] bg-[#0D172B] p-3">
      <span className="flex items-center gap-2 text-[11px] font-black uppercase text-[#6F7B95]">
        <Building2 className="size-4 text-[#88A8FF]" aria-hidden="true" />
        Organisation
      </span>
      <select
        className="h-9 w-full rounded-[8px] border border-[#24314D] bg-[#121C33] px-3 text-[13px] font-bold text-[#E8EEFF] outline-none transition focus:border-[#4D80F0] focus:ring-4 focus:ring-[#4D80F0]/25"
        aria-label="Changer d'organisation active"
        value={activeOrganization?.slug ?? ""}
        onChange={handleChange}
      >
        {organizations.map((organization) => (
          <option
            className="bg-[#121C33] text-[#E8EEFF]"
            value={organization.slug}
            key={organization.id}
          >
            {organization.name} - {organization.role}
          </option>
        ))}
      </select>
    </label>
  );
}
