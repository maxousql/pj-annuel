"use client";

import type { OrganizationSummary } from "@content-ai/shared";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  Gauge,
  History,
  Lightbulb,
  Link2,
  Lock,
  Plus,
  Rss,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  type AppNavigationItem,
  getNavigationItemsForRole,
  isNavigationItemEnabled,
} from "@/lib/navigation/app-navigation";
import { cn } from "@/lib/utils";

type MainNavProps = {
  activeOrganization?: OrganizationSummary | undefined;
};

export function MainNav({ activeOrganization }: MainNavProps) {
  const pathname = usePathname();
  const items = getNavigationItemsForRole(activeOrganization?.role).filter(
    (item) => item.id !== "integrations" && item.id !== "history",
  );

  if (!activeOrganization) {
    return (
      <nav aria-label="Navigation modules">
        <Link
          className="inline-flex h-[50px] items-center gap-3 rounded-[8px] bg-[#182F1E] px-[18px] text-[16px] font-bold text-[#C3F400] transition hover:bg-[#203A25]"
          href="/app/organizations/new"
        >
          <Plus className="size-5 text-[#C3F400]" aria-hidden="true" />
          Nouvelle organisation
        </Link>
      </nav>
    );
  }

  return (
    <>
      <nav
        className="hidden gap-[10px] lg:grid"
        aria-label="Navigation modules"
      >
        {items.map((item) => {
          const href = item.href(activeOrganization.slug);
          const isEnabled = isNavigationItemEnabled(item);
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = getNavigationIcon(item.id);

          if (!isEnabled) {
            return (
              <span
                className="flex h-[50px] cursor-not-allowed items-center gap-4 rounded-[8px] px-[18px] text-[16px] font-bold text-[#73809A]"
                aria-disabled="true"
                title={item.description}
                key={item.id}
              >
                <Icon className="size-[22px] shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </span>
            );
          }

          return (
            <Link
              className={cn(
                "group flex h-[50px] items-center gap-4 rounded-[8px] px-[18px] text-[16px] font-bold transition",
                isActive
                  ? "bg-[#182F1E] text-[#C3F400]"
                  : "text-[#A3AEC5] hover:bg-[#121C33] hover:text-[#E8EEFF]",
              )}
              aria-current={isActive ? "page" : undefined}
              href={href}
              title={item.description}
              key={item.id}
            >
              <Icon
                className={cn(
                  "size-[22px] shrink-0 transition",
                  isActive ? "text-[#C3F400]" : "text-[#9AA6BC]",
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <details className="mt-3 lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-2xl border border-[#24314D] bg-[#0F172A] px-4 text-sm font-bold text-[#E8EEFF] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] [&::-webkit-details-marker]:hidden">
          Modules
          <ChevronDown className="size-4 text-[#88A8FF]" aria-hidden="true" />
        </summary>
        <nav className="mt-2 grid gap-2" aria-label="Navigation mobile">
          {items.map((item) => {
            const href = item.href(activeOrganization.slug);
            const isEnabled = isNavigationItemEnabled(item);
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);
            const Icon = getNavigationIcon(item.id);

            if (!isEnabled) {
              return (
                <span
                  className="flex min-h-11 items-center gap-3 rounded-2xl border border-[#18243A] bg-[#071123] px-3 text-sm font-bold text-[#6F7B95]"
                  aria-disabled="true"
                  key={item.id}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                </span>
              );
            }

            return (
              <Link
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-2xl border px-3 text-sm font-bold",
                  isActive
                    ? "border-[#C3F400]/35 bg-[#C3F400]/12 text-[#E8EEFF]"
                    : "border-[#18243A] bg-[#071123] text-[#A3AEC5]",
                )}
                aria-current={isActive ? "page" : undefined}
                href={href}
                key={item.id}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    isActive ? "text-[#C3F400]" : "text-[#88A8FF]",
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </details>
    </>
  );
}

function getNavigationIcon(id: AppNavigationItem["id"]): LucideIcon {
  const icons: Record<AppNavigationItem["id"], LucideIcon> = {
    calendar: CalendarDays,
    contents: BookOpen,
    curation: Rss,
    dashboard: Gauge,
    history: History,
    ideas: Lightbulb,
    integrations: Link2,
    settings: Settings,
  };

  return icons[id];
}
