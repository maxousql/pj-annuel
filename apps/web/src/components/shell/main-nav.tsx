"use client";

import type { OrganizationSummary } from "@content-ai/shared";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  BellRing,
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
          className="inline-flex h-[48px] items-center gap-3 rounded-md px-[16px] text-[15px] font-bold text-[color:var(--rubric)] shadow-[inset_0_0_0_1.5px_rgba(216,64,31,0.45)] transition hover:bg-[color:var(--rubric-soft)]"
          href="/app/organizations/new"
        >
          <Plus className="size-5" aria-hidden="true" />
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
        {items.map((item, index) => {
          const href = item.href(activeOrganization.slug);
          const isEnabled = isNavigationItemEnabled(item);
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = getNavigationIcon(item.id);
          const itemNumber = String(index + 1).padStart(2, "0");

          if (!isEnabled) {
            return (
              <span
                className="flex h-[48px] cursor-not-allowed items-center gap-3 rounded-md px-[16px] text-[15px] font-semibold text-[color:var(--text-subtle)] opacity-70"
                aria-disabled="true"
                title={item.description}
                key={item.id}
              >
                <span className="w-6 shrink-0 font-mono text-[11px] font-semibold opacity-70">
                  {itemNumber}
                </span>
                <Icon className="size-[19px] shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </span>
            );
          }

          return (
            <Link
              className={cn(
                "group flex h-[48px] items-center gap-3 rounded-md px-[16px] text-[15px] font-semibold transition",
                isActive
                  ? "bg-[color:var(--rubric-soft)] text-[color:var(--ink)] shadow-[inset_0_0_0_1.5px_rgba(216,64,31,0.28)]"
                  : "text-[color:var(--text-muted)] hover:bg-[color:var(--rubric-soft)] hover:text-[color:var(--ink)]",
              )}
              aria-current={isActive ? "page" : undefined}
              href={href}
              title={item.description}
              key={item.id}
            >
              <span
                className={cn(
                  "w-6 shrink-0 font-mono text-[11px] font-semibold",
                  isActive
                    ? "text-[color:var(--rubric)]"
                    : "text-[color:var(--text-subtle)] opacity-70",
                )}
              >
                {itemNumber}
              </span>
              <Icon
                className={cn(
                  "size-[19px] shrink-0 transition",
                  isActive
                    ? "text-[color:var(--rubric)]"
                    : "text-[color:var(--text-subtle)]",
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <details className="mt-3 lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-lg border-[1.5px] border-[color:var(--ink)] bg-[color:var(--paper-card)] px-4 text-sm font-bold text-[color:var(--ink)] [&::-webkit-details-marker]:hidden">
          Modules
          <ChevronDown
            className="size-4 text-[color:var(--rubric)]"
            aria-hidden="true"
          />
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
                  className="flex min-h-11 items-center gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--paper-2)] px-3 text-sm font-bold text-[color:var(--text-subtle)]"
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
                    ? "border-[rgba(216,64,31,0.28)] bg-[color:var(--rubric-soft)] text-[color:var(--ink)]"
                    : "border-[color:var(--border-strong)] bg-[color:var(--paper-card)] text-[color:var(--text-muted)]",
                )}
                aria-current={isActive ? "page" : undefined}
                href={href}
                key={item.id}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    isActive
                      ? "text-[color:var(--rubric)]"
                      : "text-[color:var(--text-subtle)]",
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
    automation: BellRing,
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
