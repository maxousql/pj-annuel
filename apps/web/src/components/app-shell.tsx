"use client";

import type {
  AuthSessionPayload,
  OnboardingStatePayload,
  OrganizationSummary,
  OrganizationsListPayload,
} from "@content-ai/shared";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  DraftingCompass,
  Puzzle,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

import { AccessDenied } from "@/components/shell/access-denied";
import { EmptyState } from "@/components/shell/empty-state";
import { MainNav } from "@/components/shell/main-nav";
import { OrganizationSwitcher } from "@/components/shell/organization-switcher";
import { UserMenu } from "@/components/shell/user-menu";
import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";
import {
  getDefaultOrganizationHref,
  getOrganizationSlugFromPath,
} from "@/lib/navigation/app-navigation";

type AppShellProps = {
  children: ReactNode;
};

type ShellState =
  | { status: "loading" }
  | {
      onboarding: OnboardingStatePayload;
      status: "ready";
      session: AuthSessionPayload;
      organizations: OrganizationSummary[];
    }
  | { status: "error"; message: string };

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<ShellState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function loadShellContext() {
      try {
        const [sessionResponse, organizationsResponse, onboardingResponse] =
          await Promise.all([
            fetch(`${getApiBaseUrl()}/api/auth/me`, {
              credentials: "include",
            }),
            fetch(`${getApiBaseUrl()}/api/organizations`, {
              credentials: "include",
            }),
            fetch(`${getApiBaseUrl()}/api/onboarding`, {
              credentials: "include",
            }),
          ]);
        const sessionResult =
          await readApiResponse<AuthSessionPayload>(sessionResponse);
        const organizationsResult =
          await readApiResponse<OrganizationsListPayload>(
            organizationsResponse,
          );
        const onboardingResult =
          await readApiResponse<OnboardingStatePayload>(onboardingResponse);

        if (!isMounted) {
          return;
        }

        if (sessionResult.error) {
          setState({ message: sessionResult.error.message, status: "error" });
          return;
        }

        if (organizationsResult.error) {
          setState({
            message: organizationsResult.error.message,
            status: "error",
          });
          return;
        }

        if (onboardingResult.error) {
          setState({
            message: onboardingResult.error.message,
            status: "error",
          });
          return;
        }

        setState({
          onboarding: onboardingResult.data,
          organizations: organizationsResult.data.organizations,
          session: sessionResult.data,
          status: "ready",
        });
      } catch {
        if (isMounted) {
          setState({
            message: "Contexte applicatif indisponible.",
            status: "error",
          });
        }
      }
    }

    void loadShellContext();

    return () => {
      isMounted = false;
    };
  }, []);

  const requestedOrganizationSlug = getOrganizationSlugFromPath(pathname);
  const activeOrganization = useMemo(() => {
    if (state.status !== "ready") {
      return undefined;
    }

    if (requestedOrganizationSlug) {
      return state.organizations.find((organization) => {
        return organization.slug === requestedOrganizationSlug;
      });
    }

    return state.organizations[0];
  }, [requestedOrganizationSlug, state]);

  const isOnboardingPath = pathname === "/app/onboarding";
  const isOrganizationCreationPath = pathname === "/app/organizations/new";

  useEffect(() => {
    if (state.status !== "ready") {
      return;
    }

    if (
      !state.onboarding.completed &&
      !isOnboardingPath &&
      !isOrganizationCreationPath
    ) {
      router.replace("/app/onboarding");
      return;
    }

    if (
      state.onboarding.completed &&
      activeOrganization &&
      (pathname === "/app" || isOnboardingPath)
    ) {
      router.replace(getDefaultOrganizationHref(activeOrganization.slug));
    }
  }, [
    activeOrganization,
    isOnboardingPath,
    isOrganizationCreationPath,
    pathname,
    router,
    state,
  ]);

  return (
    <div className="min-h-screen bg-[#050B18] text-[#E8EEFF]">
      <div className="relative min-h-screen lg:grid lg:grid-cols-[313px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-[#172139] bg-[#071123] px-[26px] pb-[30px] pt-[30px] lg:flex">
          <ShellBrand activeOrganization={activeOrganization} />
          <div className="mt-6">
            {state.status === "ready" ? (
              <OrganizationSwitcher
                activeOrganization={activeOrganization}
                organizations={state.organizations}
              />
            ) : null}
          </div>
          <div className="mt-[25px] min-h-0 flex-1">
            {state.status === "ready" ? (
              <MainNav activeOrganization={activeOrganization} />
            ) : null}
          </div>
          <div className="mb-[26px] grid gap-[10px] border-t border-[#172139] pt-[27px]">
            {activeOrganization ? (
              <Link
                className="flex h-[50px] items-center gap-4 rounded-[8px] px-[18px] text-[16px] font-bold text-[#A3AEC5] transition hover:bg-[#121C33] hover:text-[#E8EEFF]"
                href={`/app/${activeOrganization.slug}/integrations`}
              >
                <Puzzle className="size-[22px] text-[#9AA6BC]" />
                <span>Integrations</span>
              </Link>
            ) : null}
            <Link
              className="flex h-[50px] items-center gap-4 rounded-[8px] px-[18px] text-[16px] font-bold text-[#A3AEC5] transition hover:bg-[#121C33] hover:text-[#E8EEFF]"
              href="/app/settings"
            >
              <Settings className="size-[22px] text-[#9AA6BC]" />
              <span>Parametres</span>
            </Link>
          </div>
          <Link
            className="inline-flex h-[64px] items-center justify-center gap-3 rounded-[12px] bg-[#C3F400] px-5 text-[16px] font-extrabold text-[#455900] shadow-[0_0_38px_rgba(195,244,0,0.34)] transition hover:bg-[#C3F400]"
            href={
              activeOrganization
                ? `/app/${activeOrganization.slug}/contents/generate`
                : "/app/organizations/new"
            }
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Generer avec l'IA
          </Link>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 min-h-[72px] border-b border-[#172139] bg-[#050B18] px-4 py-3 sm:px-5 lg:px-9 lg:py-0">
            <div className="flex min-h-[47px] min-w-0 items-center justify-between gap-4 lg:min-h-[72px]">
              <div className="min-w-0 lg:hidden">
                <ShellBrand activeOrganization={activeOrganization} />
              </div>
              <div className="hidden h-10 w-full max-w-[504px] items-center gap-3 rounded-[20px] bg-[#141D31] px-4 text-[#6F7B95] lg:flex">
                <Search className="size-5 shrink-0" aria-hidden="true" />
                <span className="truncate text-[15px] font-medium">
                  Rechercher un contenu, une idee...
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-5">
                <button
                  className="relative hidden size-10 place-items-center rounded-full text-[#A3AEC5] transition hover:bg-[#121C33] hover:text-[#E8EEFF] lg:grid"
                  type="button"
                  aria-label="Notifications"
                >
                  <Bell className="size-6" aria-hidden="true" />
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-[#C3F400]" />
                </button>
                <span className="hidden h-11 w-px bg-[#172139] lg:block" />
                {state.status === "ready" ? (
                  <UserMenu user={state.session.user} />
                ) : null}
              </div>
            </div>
            <div className="mt-3 lg:hidden">
              {state.status === "ready" ? (
                <>
                  <OrganizationSwitcher
                    activeOrganization={activeOrganization}
                    organizations={state.organizations}
                  />
                  <MainNav activeOrganization={activeOrganization} />
                </>
              ) : null}
            </div>
          </header>

          <main className="min-h-[calc(100vh-72px)] px-4 py-6 sm:px-5 lg:px-9 lg:py-[38px]">
            <div className="grid w-full gap-6">{renderShellContent()}</div>
          </main>
        </div>
      </div>
    </div>
  );

  function renderShellContent() {
    if (state.status === "loading") {
      return (
        <EmptyState
          title="Chargement de l'espace"
          description="La session et les organisations accessibles sont en cours de verification."
        />
      );
    }

    if (state.status === "error") {
      return (
        <AccessDenied
          title="Session indisponible"
          description={state.message}
        />
      );
    }

    if (requestedOrganizationSlug && !activeOrganization) {
      return (
        <AccessDenied
          title="Organisation inaccessible"
          description="Cette organisation n'existe pas dans vos espaces accessibles."
        />
      );
    }

    if (
      !state.onboarding.completed &&
      !isOnboardingPath &&
      !isOrganizationCreationPath
    ) {
      return (
        <EmptyState
          title="Onboarding requis"
          description="Terminez la creation de l'organisation et du contexte editorial pour ouvrir l'application."
        />
      );
    }

    if (
      state.onboarding.completed &&
      activeOrganization &&
      (pathname === "/app" || isOnboardingPath)
    ) {
      return (
        <EmptyState
          title="Ouverture du dashboard"
          description="Votre espace est configure. Redirection vers le dashboard."
        />
      );
    }

    return children;
  }
}

function ShellBrand({
  activeOrganization,
}: {
  activeOrganization: OrganizationSummary | undefined;
}) {
  return (
    <Link
      className="flex min-w-0 items-center gap-3 text-[#E8EEFF]"
      href={getShellHomeHref(activeOrganization)}
    >
      <span
        className="grid size-[46px] shrink-0 place-items-center rounded-[10px] bg-[#84A4FF] text-[#071123] shadow-[0_8px_28px_rgba(132,164,255,0.22)]"
        aria-hidden="true"
      >
        <DraftingCompass className="size-6" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[26px] font-extrabold leading-[1.05] text-[#8FAEFF]">
          Architect AI
        </span>
        <span className="mt-1 block truncate text-[11px] font-extrabold uppercase text-[#A3AEC5]">
          Edition Premium
        </span>
      </span>
    </Link>
  );
}

function getShellHomeHref(
  activeOrganization: OrganizationSummary | undefined,
): string {
  return activeOrganization
    ? getDefaultOrganizationHref(activeOrganization.slug)
    : "/app";
}
