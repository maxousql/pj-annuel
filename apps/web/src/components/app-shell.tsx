"use client";

import type {
  AuthSessionPayload,
  AuthUser,
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
import { Bell, Puzzle, Search, Settings, Sparkles } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { AccessDenied } from "@/components/shell/access-denied";
import { EmptyState } from "@/components/shell/empty-state";
import { LoadingState } from "@/components/shell/loading-state";
import { MainNav } from "@/components/shell/main-nav";
import { OrganizationSwitcher } from "@/components/shell/organization-switcher";
import { UserMenu } from "@/components/shell/user-menu";
import {
  getApiBaseUrl,
  PROFILE_UPDATED_EVENT,
  readApiResponse,
} from "@/lib/auth/client";
import { fetchIdeas } from "@/lib/ideas/client";
import { fetchLibraryContents } from "@/lib/library/client";
import {
  getDefaultOrganizationHref,
  getOrganizationSlugFromPath,
  resolveActiveOrganization,
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
  const [recentOrganizationSlug, setRecentOrganizationSlug] = useState<
    string | undefined
  >();

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

  useEffect(() => {
    function handleProfileUpdated(event: Event) {
      const user = (event as CustomEvent<AuthUser>).detail;

      if (!user?.id) {
        return;
      }

      setState((currentState) => {
        if (currentState.status !== "ready") {
          return currentState;
        }

        return {
          ...currentState,
          session: { user },
        };
      });
    }

    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);

    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    };
  }, []);

  const requestedOrganizationSlug = getOrganizationSlugFromPath(pathname);

  useEffect(() => {
    if (requestedOrganizationSlug) {
      setRecentOrganizationSlug(requestedOrganizationSlug);
    }
  }, [requestedOrganizationSlug]);

  const activeOrganization = useMemo(() => {
    if (state.status !== "ready") {
      return undefined;
    }

    return resolveActiveOrganization(
      state.organizations,
      requestedOrganizationSlug,
      recentOrganizationSlug,
    );
  }, [recentOrganizationSlug, requestedOrganizationSlug, state]);

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
    <div className="min-h-screen">
      <div className="relative min-h-screen lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r-[1.5px] border-[color:var(--ink)] bg-[color:var(--paper)] px-[24px] pb-[28px] pt-[28px] lg:flex">
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
          <div className="mb-[24px] grid gap-[8px] border-t border-[color:var(--border-strong)] pt-[24px]">
            {activeOrganization ? (
              <Link
                className="flex h-[48px] items-center gap-4 rounded-md px-[16px] text-[15px] font-semibold text-[color:var(--text-muted)] transition hover:bg-[color:var(--rubric-soft)] hover:text-[color:var(--ink)]"
                href={`/app/${activeOrganization.slug}/integrations`}
              >
                <Puzzle className="size-[20px] text-[color:var(--text-subtle)]" />
                <span>Intégrations</span>
              </Link>
            ) : null}
            <Link
              className="flex h-[48px] items-center gap-4 rounded-md px-[16px] text-[15px] font-semibold text-[color:var(--text-muted)] transition hover:bg-[color:var(--rubric-soft)] hover:text-[color:var(--ink)]"
              href="/app/settings"
            >
              <Settings className="size-[20px] text-[color:var(--text-subtle)]" />
              <span>Paramètres</span>
            </Link>
          </div>
          <Link
            className="inline-flex h-[54px] items-center justify-center gap-3 rounded-lg border-[1.5px] border-[color:var(--rubric)] bg-[color:var(--rubric)] px-5 text-[15px] font-bold !text-white shadow-[4px_4px_0_rgba(23,19,15,0.18)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:!text-white hover:shadow-[6px_6px_0_rgba(23,19,15,0.18)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            href={
              activeOrganization
                ? `/app/${activeOrganization.slug}/contents/generate`
                : "/app/organizations/new"
            }
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Générer avec l'IA
          </Link>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 min-h-[72px] border-b-[1.5px] border-[color:var(--ink)] bg-[color:var(--paper)]/85 px-4 py-3 backdrop-blur-md sm:px-5 lg:px-9 lg:py-0">
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
                  className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[color:var(--text-subtle)]"
                  aria-hidden="true"
                />
                <input
                  className="h-10 w-full rounded-full border-[1.5px] border-[color:var(--border-strong)] bg-[color:var(--paper-card)] pl-11 pr-4 text-[15px] font-medium text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--text-subtle)] hover:border-[color:var(--ink)] focus:border-[color:var(--klein)] focus:ring-2 focus:ring-[color:var(--klein)]/20"
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
                  <div className="absolute left-0 top-[48px] z-40 w-full rounded-[14px] border-[1.5px] border-[color:var(--ink)] bg-[color:var(--paper-card)] p-2 shadow-[var(--shadow)]">
                    {searchResults.length > 0 ? (
                      <div className="grid gap-1">
                        {searchResults.map((result) => (
                          <Link
                            className="grid gap-1 rounded-[10px] px-3 py-2 text-left transition hover:bg-[color:var(--paper-2)]"
                            href={result.href}
                            key={result.id}
                            onClick={() => {
                              setSearchQuery("");
                            }}
                          >
                            <span className="text-[14px] font-extrabold text-[color:var(--ink)]">
                              {result.label}
                            </span>
                            <span className="truncate text-[12px] font-medium text-[color:var(--text-muted)]">
                              {result.description}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : isSearching ? (
                      <p className="px-3 py-2 text-[13px] font-semibold text-[color:var(--text-muted)]">
                        Recherche en cours...
                      </p>
                    ) : (
                      <p className="px-3 py-2 text-[13px] font-semibold text-[color:var(--text-muted)]">
                        Aucun resultat pour cette recherche.
                      </p>
                    )}
                  </div>
                ) : null}
              </form>
              <div className="flex shrink-0 items-center gap-5">
                {activeOrganization ? (
                  <Link
                    className="relative hidden size-10 place-items-center rounded-full text-[color:var(--text-muted)] transition hover:bg-[color:var(--rubric-soft)] hover:text-[color:var(--ink)] lg:grid"
                    href={`/app/${activeOrganization.slug}/notifications`}
                    aria-label="Notifications"
                  >
                    <Bell className="size-6" aria-hidden="true" />
                    <span className="absolute right-2 top-2 size-2 rounded-full bg-[color:var(--rubric)]" />
                  </Link>
                ) : null}
                <span className="hidden h-11 w-px bg-[color:var(--border-strong)] lg:block" />
                {state.status === "ready" ? (
                  <UserMenu
                    role={activeOrganization?.role}
                    user={state.session.user}
                  />
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
        <LoadingState
          title="Chargement de l'espace"
          description="La session et les organisations accessibles sont en cours de vérification."
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
      className="flex min-w-0 items-center gap-3 text-[color:var(--ink)]"
      href={getShellHomeHref(activeOrganization)}
    >
      <LogoMark className="shrink-0 text-[color:var(--ink)]" size={42} />
      <span className="min-w-0">
        <span className="block truncate font-heading text-[21px] font-semibold leading-[1.05] text-[color:var(--ink)]">
          Content AI<span className="text-[color:var(--rubric)]">.</span>
        </span>
        <span className="mt-1 block truncate font-mono text-[9.5px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-subtle)]">
          Studio éditorial
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
