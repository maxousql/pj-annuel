import type { OrganizationRole } from "@content-ai/shared";

export type NavigationAvailability = "available" | "soon";

export type AppNavigationItem = {
  id:
    | "dashboard"
    | "ideas"
    | "contents"
    | "history"
    | "calendar"
    | "curation"
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
    description: "Vue synthese de l'activite editoriale.",
    href: (organizationSlug) => `/app/${organizationSlug}/dashboard`,
    id: "dashboard",
    label: "Tableau de bord",
    minimumRole: "READER",
  },
  {
    availability: "available",
    description: "Sujets et angles sauvegardes.",
    href: (organizationSlug) => `/app/${organizationSlug}/ideas`,
    id: "ideas",
    label: "Idees",
    minimumRole: "READER",
  },
  {
    availability: "available",
    description: "Bibliotheque filtrable des contenus editoriaux.",
    href: (organizationSlug) => `/app/${organizationSlug}/library`,
    id: "contents",
    label: "Contenus",
    minimumRole: "READER",
  },
  {
    availability: "available",
    description: "Timeline des idees et contenus sauvegardes.",
    href: (organizationSlug) => `/app/${organizationSlug}/history`,
    id: "history",
    label: "Historique",
    minimumRole: "READER",
  },
  {
    availability: "available",
    description: "Planification editoriale V1.",
    href: (organizationSlug) => `/app/${organizationSlug}/calendar`,
    id: "calendar",
    label: "Calendrier",
    minimumRole: "READER",
  },
  {
    availability: "soon",
    description: "Veille et ressources V2.",
    href: (organizationSlug) => `/app/${organizationSlug}/curation`,
    id: "curation",
    label: "Veille",
    minimumRole: "EDITOR",
  },
  {
    availability: "soon",
    description: "Connexions Notion et providers.",
    href: (organizationSlug) => `/app/${organizationSlug}/integrations`,
    id: "integrations",
    label: "Integrations",
    minimumRole: "ADMIN",
  },
  {
    availability: "available",
    description: "Parametres de l'organisation.",
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
