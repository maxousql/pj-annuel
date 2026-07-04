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
  ARCHIVED: "Archive",
  DELETED: "Supprime",
  DRAFT: "Brouillon",
  PUBLISHED: "Publie",
  READY: "Pret",
  REVIEW: "A valider",
  SCHEDULED: "Planifie",
};

export const CONTENT_IDEA_STATUS_LABELS: Record<ContentIdeaStatus, string> = {
  ARCHIVED: "Archivee",
  DISMISSED: "Ignoree",
  DRAFT: "Brouillon",
  SAVED: "Sauvegardee",
  USED: "Utilisee",
};

export const SAVE_STATUS_OPTIONS: Array<{
  label: string;
  value: ContentSaveStatus;
}> = [
  { label: "Brouillon", value: "DRAFT" },
  { label: "A relire", value: "REVIEW" },
  { label: "Pret", value: "READY" },
  { label: "Archive", value: "ARCHIVED" },
];

export function formatContentDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
