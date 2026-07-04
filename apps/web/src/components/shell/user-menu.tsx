"use client";

import type { AuthUser } from "@content-ai/shared";
import { LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/auth/client";

type UserMenuProps = {
  user?: AuthUser | undefined;
};

export function UserMenu({ user }: UserMenuProps) {
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
      <div className="hidden min-w-0 justify-items-end gap-0.5 sm:grid">
        <strong className="max-w-[180px] truncate text-[15px] font-extrabold leading-5 text-[#E8EEFF]">
          {user.name}
        </strong>
        <span className="max-w-[180px] truncate text-[12px] font-semibold leading-4 text-[#A3AEC5]">
          Directeur Creatif
        </span>
      </div>
      <Avatar className="size-11 border-2 border-[#84A4FF] bg-[#121C33]">
        <AvatarFallback className="bg-[#18243A] text-sm font-black text-[#E8EEFF]">
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>
      <Button
        className="hidden size-9 rounded-full border-[#24314D] bg-transparent p-0 text-[#73809A] shadow-none hover:bg-[#121C33] hover:text-[#E8EEFF] lg:inline-flex"
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
