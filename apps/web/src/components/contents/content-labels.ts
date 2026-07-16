import type {
  ContentFormat,
  ContentIdeaStatus,
  ContentItemStatus,
  ContentSaveStatus,
} from "@content-ai/shared";

export const CONTENT_FORMAT_LABELS: Record<ContentFormat, string> = {
  BLOG_ARTICLE: "Article de blog",
  EMAIL: "Email marketing",
  HOOK: "Accroche",
  LINKEDIN_POST: "Post LinkedIn",
  OTHER: "Autre",
  SOCIAL_POST: "Post court",
  THREAD: "Thread",
};

export const CONTENT_STATUS_LABELS: Record<ContentItemStatus, string> = {
  ARCHIVED: "Archivé",
  DELETED: "Supprimé",
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  READY: "Prêt",
  REVIEW: "À valider",
  SCHEDULED: "Planifié",
};

export const CONTENT_IDEA_STATUS_LABELS: Record<ContentIdeaStatus, string> = {
  ARCHIVED: "Archivée",
  DISMISSED: "Ignorée",
  DRAFT: "Brouillon",
  SAVED: "Sauvegardée",
  USED: "Utilisée",
};

export const SAVE_STATUS_OPTIONS: Array<{
  label: string;
  value: ContentSaveStatus;
}> = [
  { label: "Brouillon", value: "DRAFT" },
  { label: "À relire", value: "REVIEW" },
  { label: "Prêt", value: "READY" },
  { label: "Archivé", value: "ARCHIVED" },
];

export function formatContentDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
