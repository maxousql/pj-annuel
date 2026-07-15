"use client";

import type { AuthUser, OrganizationRole } from "@content-ai/shared";
import { LogOut } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/auth/client";
import { getOrganizationRoleLabel } from "@/lib/organizations/roles";

type UserMenuProps = {
  role?: OrganizationRole | undefined;
  user?: AuthUser | undefined;
};

export function UserMenu({ role, user }: UserMenuProps) {
  async function handleLogout() {
    await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
      credentials: "include",
      method: "POST",
    });
    window.location.href = "/login";
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link
        aria-label="Ouvrir les paramètres du compte"
        className="group flex min-w-0 items-center gap-3 rounded-xl p-1 outline-none transition hover:bg-[color:var(--rubric-soft)] focus-visible:ring-2 focus-visible:ring-[color:var(--rubric)]/35"
        href="/app/settings"
        title="Ouvrir les paramètres du compte"
      >
        <div className="hidden min-w-0 justify-items-end gap-0.5 sm:grid">
          <strong className="max-w-[180px] truncate text-[15px] font-extrabold leading-5 text-[color:var(--ink)]">
            {user.name}
          </strong>
          <span className="max-w-[180px] truncate text-[12px] font-semibold leading-4 text-[color:var(--text-muted)]">
            {getOrganizationRoleLabel(role)}
          </span>
        </div>
        <Avatar className="size-11 border-[1.5px] border-[rgba(216,64,31,0.28)] bg-[color:var(--rubric-soft)] transition group-hover:border-[color:var(--rubric)]">
          {user.avatarUrl ? <AvatarImage alt="" src={user.avatarUrl} /> : null}
          <AvatarFallback className="bg-[color:var(--rubric-soft)] font-heading text-sm font-semibold italic text-[color:var(--rubric)]">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      </Link>
      <Button
        className="hidden size-9 rounded-full border-transparent bg-transparent p-0 text-[color:var(--text-muted)] shadow-none hover:bg-[color:var(--rubric-soft)] hover:text-[color:var(--ink)] lg:inline-flex"
        variant="ghost"
        type="button"
        onClick={handleLogout}
        aria-label="Sortir"
        title="Sortir"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
