"use client";

import type {
  AuthSessionPayload,
  ContentIdeaPayload,
  ContentItemPayload,
  OnboardingStatePayload,
  OrganizationSummary,
  OrganizationsListPayload,
} from "@content-ai/shared";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
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
import { fetchIdeas } from "@/lib/ideas/client";
import { fetchLibraryContents } from "@/lib/library/client";
import {
  getDefaultOrganizationHref,
  getOrganizationSlugFromPath,
} from "@/lib/navigation/app-navigation";

type AppShellProps = {
  children: ReactNode;
};

type ShellSearchResult = {
  description: string;
  href: string;
  id: string;
  keywords: string[];
  label: string;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteSearchResults, setRemoteSearchResults] = useState<
    ShellSearchResult[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);

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

  useEffect(() => {
    const normalizedQuery = normalizeShellSearch(searchQuery);

    if (!activeOrganization || normalizedQuery.length < 2) {
      setRemoteSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isMounted = true;
    setRemoteSearchResults([]);
    setIsSearching(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const [libraryResult, ideasResult] = await Promise.all([
          fetchLibraryContents(activeOrganization.slug, {
            page: 1,
            pageSize: 3,
            query: searchQuery.trim(),
          }),
          fetchIdeas(activeOrganization.slug),
        ]);

        if (!isMounted) {
          return;
        }

        const nextResults: ShellSearchResult[] = [];

        if (!libraryResult.error) {
          nextResults.push(
            ...libraryResult.data.contents
              .slice(0, 3)
              .map((content) =>
                toContentSearchResult(activeOrganization.slug, content),
              ),
          );
        }

        if (!ideasResult.error) {
          nextResults.push(
            ...ideasResult.data.ideas
              .filter((idea) => {
                return normalizeShellSearch(
                  [
                    idea.title,
                    idea.angle,
                    idea.category ?? "",
                    idea.justification,
                  ].join(" "),
                ).includes(normalizedQuery);
              })
              .slice(0, 3)
              .map((idea) => toIdeaSearchResult(activeOrganization.slug, idea)),
          );
        }

        setRemoteSearchResults(nextResults);
      } catch {
        if (isMounted) {
          setRemoteSearchResults([]);
        }
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    }, 260);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [activeOrganization, searchQuery]);

  const navigationSearchResults = useMemo(() => {
    const normalizedQuery = normalizeShellSearch(searchQuery);
    const results = buildShellSearchResults(activeOrganization);

    if (!normalizedQuery) {
      return results;
    }

    return results
      .filter((result) => {
        const haystack = normalizeShellSearch(
          [result.label, result.description, ...result.keywords].join(" "),
        );
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 6);
  }, [activeOrganization, searchQuery]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return navigationSearchResults;
    }

    return [...remoteSearchResults, ...navigationSearchResults].slice(0, 8);
  }, [navigationSearchResults, remoteSearchResults, searchQuery]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!searchQuery.trim()) {
      return;
    }

    const [firstResult] = searchResults;

    if (firstResult) {
      setSearchQuery("");
      router.push(firstResult.href);
    }
  }

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
            className="inline-flex h-[64px] items-center justify-center gap-3 rounded-[12px] bg-[#C3F400] px-5 text-[16px] font-extrabold !text-[#455900] shadow-[0_0_38px_rgba(195,244,0,0.34)] transition hover:bg-[#C3F400] hover:!text-[#455900] [&_*]:!text-[#455900]"
            href={
              activeOrganization
                ? `/app/${activeOrganization.slug}/contents/generate`
                : "/app/organizations/new"
            }
            style={{ color: "#455900" }}
          >
            <Sparkles className="size-4 !text-[#455900]" aria-hidden="true" />
            Generer avec l'IA
          </Link>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 min-h-[72px] border-b border-[#172139] bg-[#050B18] px-4 py-3 sm:px-5 lg:px-9 lg:py-0">
            <div className="flex min-h-[47px] min-w-0 items-center justify-between gap-4 lg:min-h-[72px]">
              <div className="min-w-0 lg:hidden">
                <ShellBrand activeOrganization={activeOrganization} />
              </div>
              <form
                className="relative hidden w-full max-w-[504px] lg:block"
                onSubmit={handleSearchSubmit}
                role="search"
              >
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#6F7B95]"
                  aria-hidden="true"
                />
                <input
                  className="h-10 w-full rounded-[20px] border border-transparent bg-[#141D31] pl-11 pr-4 text-[15px] font-medium text-[#E8EEFF] outline-none transition placeholder:text-[#6F7B95] focus:border-[#24314D] focus:ring-2 focus:ring-[#84A4FF]/20"
                  aria-label="Rechercher dans l'application"
                  autoComplete="off"
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                  }}
                  placeholder="Rechercher un contenu, une idee..."
                  type="search"
                  value={searchQuery}
                />
                {searchQuery.trim() ? (
                  <div className="absolute left-0 top-[48px] z-40 w-full rounded-[14px] border border-[#172139] bg-[#0B1326] p-2 shadow-[0_18px_48px_rgba(0,0,0,0.34)]">
                    {searchResults.length > 0 ? (
                      <div className="grid gap-1">
                        {searchResults.map((result) => (
                          <Link
                            className="grid gap-1 rounded-[10px] px-3 py-2 text-left transition hover:bg-[#121C33]"
                            href={result.href}
                            key={result.id}
                            onClick={() => {
                              setSearchQuery("");
                            }}
                          >
                            <span className="text-[14px] font-extrabold text-[#E8EEFF]">
                              {result.label}
                            </span>
                            <span className="truncate text-[12px] font-medium text-[#A3AEC5]">
                              {result.description}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : isSearching ? (
                      <p className="px-3 py-2 text-[13px] font-semibold text-[#A3AEC5]">
                        Recherche en cours...
                      </p>
                    ) : (
                      <p className="px-3 py-2 text-[13px] font-semibold text-[#A3AEC5]">
                        Aucun resultat pour cette recherche.
                      </p>
                    )}
                  </div>
                ) : null}
              </form>
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

function buildShellSearchResults(
  activeOrganization: OrganizationSummary | undefined,
): ShellSearchResult[] {
  if (!activeOrganization) {
    return [
      {
        description: "Creer un espace avant d'ouvrir les modules.",
        href: "/app/organizations/new",
        id: "navigation:new-organization",
        keywords: ["creation", "organisation", "espace"],
        label: "Nouvelle organisation",
      },
    ];
  }

  const basePath = `/app/${activeOrganization.slug}`;

  return [
    {
      description: "Vue globale des contenus, idees et publications.",
      href: `${basePath}/dashboard`,
      id: "navigation:dashboard",
      keywords: ["dashboard", "tableau", "bord", "accueil", "stats"],
      label: "Tableau de bord",
    },
    {
      description: "Explorer et qualifier les idees editoriales.",
      href: `${basePath}/ideas`,
      id: "navigation:ideas",
      keywords: ["idees", "idee", "inspiration", "brainstorm"],
      label: "Idees",
    },
    {
      description: "Generer un nouveau contenu assiste par IA.",
      href: `${basePath}/contents/generate`,
      id: "navigation:content-generate",
      keywords: ["generer", "ia", "creation", "contenu", "redaction"],
      label: "Generer un contenu",
    },
    {
      description: "Retrouver les contenus crees et leurs statuts.",
      href: `${basePath}/library`,
      id: "navigation:library",
      keywords: ["contenus", "bibliotheque", "articles", "posts", "library"],
      label: "Contenus",
    },
    {
      description: "Planifier les prochaines publications.",
      href: `${basePath}/calendar`,
      id: "navigation:calendar",
      keywords: ["calendrier", "planning", "planification", "calendar"],
      label: "Calendrier",
    },
    {
      description: "Consulter l'historique et les generations precedentes.",
      href: `${basePath}/history`,
      id: "navigation:history",
      keywords: ["historique", "versions", "anti doublon", "archives"],
      label: "Historique",
    },
    {
      description: "Gerer l'organisation, les membres et les parametres.",
      href: `${basePath}/settings`,
      id: "navigation:settings",
      keywords: ["organisation", "parametres", "membres", "settings"],
      label: "Organisation",
    },
  ];
}

function toContentSearchResult(
  organizationSlug: string,
  content: ContentItemPayload,
): ShellSearchResult {
  return {
    description: `Contenu - ${content.topic ?? content.status}`,
    href: `/app/${organizationSlug}/library/${content.id}`,
    id: `content:${content.id}`,
    keywords: [
      content.title,
      content.topic ?? "",
      content.status,
      content.format,
      ...content.tags.map((tag) => tag.name),
    ],
    label: content.title,
  };
}

function toIdeaSearchResult(
  organizationSlug: string,
  idea: ContentIdeaPayload,
): ShellSearchResult {
  return {
    description: `Idee - ${idea.category ?? idea.recommendedFormat}`,
    href: `/app/${organizationSlug}/ideas`,
    id: `idea:${idea.id}`,
    keywords: [
      idea.title,
      idea.angle,
      idea.category ?? "",
      idea.recommendedFormat,
      idea.status,
    ],
    label: idea.title,
  };
}

function normalizeShellSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
