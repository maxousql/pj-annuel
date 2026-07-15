import type { OrganizationRole, OrganizationSummary } from "@content-ai/shared";

export type NavigationAvailability = "available" | "soon";

export type AppNavigationItem = {
  id:
    | "dashboard"
    | "ideas"
    | "contents"
    | "history"
    | "calendar"
    | "curation"
    | "automation"
    | "integrations"
    | "settings";
  label: string;
  description: string;
  availability: NavigationAvailability;
  minimumRole: OrganizationRole;
  href: (organizationSlug: string) => string;
};

export const ROLE_LEVEL: Record<OrganizationRole, number> = {
  READER: 1,
  EDITOR: 2,
  ADMIN: 3,
};

export const APP_NAVIGATION_ITEMS: AppNavigationItem[] = [
  {
    availability: "available",
    description: "Vue synthèse de l'activité éditoriale.",
    href: (organizationSlug) => `/app/${organizationSlug}/dashboard`,
    id: "dashboard",
    label: "Tableau de bord",
    minimumRole: "READER",
  },
  {
    availability: "available",
    description: "Sujets et angles sauvegardés.",
    href: (organizationSlug) => `/app/${organizationSlug}/ideas`,
    id: "ideas",
    label: "Idées",
    minimumRole: "READER",
  },
  {
    availability: "available",
    description: "Bibliothèque filtrable des contenus éditoriaux.",
    href: (organizationSlug) => `/app/${organizationSlug}/library`,
    id: "contents",
    label: "Contenus",
    minimumRole: "READER",
  },
  {
    availability: "available",
    description: "Timeline des idées et contenus sauvegardés.",
    href: (organizationSlug) => `/app/${organizationSlug}/history`,
    id: "history",
    label: "Historique",
    minimumRole: "READER",
  },
  {
    availability: "available",
    description: "Planifiez et suivez vos publications éditoriales.",
    href: (organizationSlug) => `/app/${organizationSlug}/calendar`,
    id: "calendar",
    label: "Calendrier",
    minimumRole: "READER",
  },
  {
    availability: "available",
    description: "Veille, URLs, RSS et résumés IA.",
    href: (organizationSlug) => `/app/${organizationSlug}/curation`,
    id: "curation",
    label: "Veille",
    minimumRole: "EDITOR",
  },
  {
    availability: "available",
    description: "Rappels, recommandations et notifications éditoriales.",
    href: (organizationSlug) => `/app/${organizationSlug}/automation`,
    id: "automation",
    label: "Automatisation",
    minimumRole: "EDITOR",
  },
  {
    availability: "soon",
    description: "Connexions Notion et providers.",
    href: (organizationSlug) => `/app/${organizationSlug}/integrations`,
    id: "integrations",
    label: "Intégrations",
    minimumRole: "ADMIN",
  },
  {
    availability: "available",
    description: "Paramètres de l'organisation.",
    href: (organizationSlug) => `/app/${organizationSlug}/settings`,
    id: "settings",
    label: "Organisation",
    minimumRole: "ADMIN",
  },
];

export function getNavigationItemsForRole(
  role: OrganizationRole | undefined,
): AppNavigationItem[] {
  if (!role) {
    return [];
  }

  return APP_NAVIGATION_ITEMS.filter((item) => {
    return ROLE_LEVEL[role] >= ROLE_LEVEL[item.minimumRole];
  });
}

export function isNavigationItemEnabled(item: AppNavigationItem): boolean {
  return item.availability === "available";
}

export function getDefaultOrganizationHref(organizationSlug: string): string {
  return `/app/${organizationSlug}/dashboard`;
}

export function resolveActiveOrganization(
  organizations: OrganizationSummary[],
  requestedOrganizationSlug?: string,
  recentOrganizationSlug?: string,
): OrganizationSummary | undefined {
  const preferredOrganizationSlug =
    requestedOrganizationSlug ?? recentOrganizationSlug;
  const preferredOrganization = preferredOrganizationSlug
    ? organizations.find(({ slug }) => slug === preferredOrganizationSlug)
    : undefined;

  return preferredOrganization ?? organizations[0];
}

export function getOrganizationSlugFromPath(
  pathname: string,
): string | undefined {
  const [, appSegment, organizationSlug] = pathname.split("/");

  if (appSegment !== "app" || !organizationSlug) {
    return undefined;
  }

  if (APP_TOP_LEVEL_SEGMENTS.has(organizationSlug)) {
    return undefined;
  }

  return organizationSlug;
}

const APP_TOP_LEVEL_SEGMENTS = new Set([
  "onboarding",
  "organizations",
  "settings",
]);
