import type {
  ContentItemStatus,
  NotionPropertyIdMappingPayload,
  NotionPropertyMappingPayload,
  NotionPropertyTypeMappingPayload,
  PublicationChannel,
  ResourceStatus,
} from "@content-ai/shared";

import type { NotionPage } from "./notion.types";

export const DEFAULT_NOTION_PROPERTY_MAPPING: NotionPropertyMappingPayload = {
  channel: "Canal",
  date: "Date de publication",
  entityType: "Type",
  sourceUrl: "URL source",
  status: "Statut",
  title: "Nom",
};

export const DEFAULT_NOTION_PROPERTY_TYPES: NotionPropertyTypeMappingPayload = {
  channel: "select",
  date: "date",
  entityType: "select",
  sourceUrl: "url",
  status: "select",
  title: "title",
};

export const MANAGED_NOTION_PROPERTY_TYPES: NotionPropertyTypeMappingPayload = {
  ...DEFAULT_NOTION_PROPERTY_TYPES,
  status: "status",
};

export const CONTENT_STATUS_LABELS: Record<ContentItemStatus, string> = {
  ARCHIVED: "Archivé",
  DELETED: "Supprimé",
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  READY: "Prêt",
  REVIEW: "En révision",
  SCHEDULED: "Planifié",
};

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  ARCHIVED: "Archivé",
  NEW: "Nouveau",
  SUMMARIZED: "Résumé",
  USED: "Utilisé",
};

export const MANAGED_NOTION_STATUS_OPTIONS = Array.from(
  new Set([
    ...Object.values(CONTENT_STATUS_LABELS).filter(
      (label) => label !== "Supprimé",
    ),
    ...Object.values(RESOURCE_STATUS_LABELS),
  ]),
);

export const MANAGED_NOTION_PROPERTY_SCHEMA: Record<string, unknown> = {
  [DEFAULT_NOTION_PROPERTY_MAPPING.title]: { title: {} },
  [DEFAULT_NOTION_PROPERTY_MAPPING.status]: {
    status: {
      options: MANAGED_NOTION_STATUS_OPTIONS.map(managedStatusOption),
    },
  },
  [DEFAULT_NOTION_PROPERTY_MAPPING.date]: { date: {} },
  [DEFAULT_NOTION_PROPERTY_MAPPING.channel]: {
    select: {
      options: [
        "LinkedIn",
        "Blog",
        "Email",
        "X",
        "Facebook",
        "Instagram",
        "Autre",
      ].map((name) => ({ name })),
    },
  },
  [DEFAULT_NOTION_PROPERTY_MAPPING.entityType]: {
    select: { options: ["Contenu", "Ressource"].map((name) => ({ name })) },
  },
  [DEFAULT_NOTION_PROPERTY_MAPPING.sourceUrl]: { url: {} },
};

export function managedStatusOption(name: string): {
  group: "Complete" | "In progress" | "To-do";
  name: string;
} {
  const complete = new Set(["Archivé", "Publié", "Utilisé"]);
  const inProgress = new Set(["En révision", "Planifié", "Prêt", "Résumé"]);
  return {
    group: complete.has(name)
      ? "Complete"
      : inProgress.has(name)
        ? "In progress"
        : "To-do",
    name,
  };
}

export function buildNotionProperties(input: {
  channel?: string | null;
  date?: Date | string | null;
  entityType: "Contenu" | "Ressource";
  mapping: NotionPropertyMappingPayload;
  propertyIds?: NotionPropertyIdMappingPayload;
  propertyTypes?: NotionPropertyTypeMappingPayload;
  sourceUrl?: string | null;
  status: string;
  title: string;
}): Record<string, unknown> {
  const key = (field: keyof NotionPropertyMappingPayload) =>
    input.propertyIds?.[field] || input.mapping[field];
  return {
    [key("title")]: {
      title: [{ text: { content: input.title.slice(0, 2_000) } }],
    },
    [key("status")]:
      input.propertyTypes?.status === "status"
        ? { status: { name: toNotionStatusLabel(input.status) } }
        : { select: { name: toNotionStatusLabel(input.status) } },
    [key("entityType")]: { select: { name: input.entityType } },
    [key("channel")]: input.channel
      ? { select: { name: localizeChannel(input.channel) } }
      : { select: null },
    [key("date")]: input.date
      ? {
          date: {
            start:
              input.date instanceof Date
                ? input.date.toISOString()
                : input.date,
          },
        }
      : { date: null },
    [key("sourceUrl")]: input.sourceUrl
      ? { url: input.sourceUrl }
      : { url: null },
  };
}

export function buildNotionBodyChildren(body: string): unknown[] {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return paragraphs.flatMap((paragraph) =>
    chunkText(paragraph, 1_900).map((chunk) => ({
      object: "block",
      paragraph: {
        rich_text: [{ text: { content: chunk }, type: "text" }],
      },
      type: "paragraph",
    })),
  );
}

export function readNotionPageFields(
  page: NotionPage,
  mapping: NotionPropertyMappingPayload,
  propertyIds?: NotionPropertyIdMappingPayload,
): {
  channel: PublicationChannel | null;
  date: Date | null;
  status: string | null;
  title: string | null;
} {
  const value = (field: keyof NotionPropertyMappingPayload) =>
    resolvePageProperty(page.properties, propertyIds?.[field], mapping[field]);
  return {
    channel: normalizeChannel(readSelect(value("channel"))),
    date: readDate(value("date")),
    status: readSelect(value("status")),
    title: readTitle(value("title")),
  };
}

export function toNotionStatusLabel(status: string): string {
  return (
    CONTENT_STATUS_LABELS[status as ContentItemStatus] ??
    RESOURCE_STATUS_LABELS[status as ResourceStatus] ??
    status
  );
}

export function fromNotionContentStatus(
  value: string | null,
): ContentItemStatus | null {
  return lookupLocalizedStatus(value, CONTENT_STATUS_LABELS);
}

export function fromNotionResourceStatus(
  value: string | null,
): ResourceStatus | null {
  return lookupLocalizedStatus(value, RESOURCE_STATUS_LABELS);
}

function lookupLocalizedStatus<TStatus extends string>(
  value: string | null,
  labels: Record<TStatus, string>,
): TStatus | null {
  const normalized = normalizeLabel(value);
  if (!normalized) return null;
  for (const [status, label] of Object.entries(labels) as Array<
    [TStatus, string]
  >) {
    if (
      normalizeLabel(status) === normalized ||
      normalizeLabel(label) === normalized
    ) {
      return status;
    }
  }
  return null;
}

function resolvePageProperty(
  properties: Record<string, unknown>,
  propertyId: string | undefined,
  propertyName: string,
): unknown {
  if (propertyId) {
    for (const value of Object.values(properties)) {
      if (isRecord(value) && value.id === propertyId) return value;
    }
    if (propertyId in properties) return properties[propertyId];
  }
  return properties[propertyName];
}

function readTitle(value: unknown): string | null {
  return isRecord(value) && Array.isArray(value.title)
    ? readRichText(value.title)
    : null;
}

function readSelect(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const selected = isRecord(value.select)
    ? value.select
    : isRecord(value.status)
      ? value.status
      : null;
  return selected && typeof selected.name === "string" ? selected.name : null;
}

function readDate(value: unknown): Date | null {
  if (!isRecord(value) || !isRecord(value.date)) return null;
  const start = value.date.start;
  if (typeof start !== "string") return null;
  const date = new Date(start);
  return Number.isFinite(date.getTime()) ? date : null;
}

function readRichText(value: unknown[]): string | null {
  const text = value
    .flatMap((entry) =>
      isRecord(entry) && typeof entry.plain_text === "string"
        ? [entry.plain_text]
        : [],
    )
    .join("")
    .trim();
  return text || null;
}

function localizeChannel(value: string): string {
  const labels: Record<string, string> = {
    BLOG: "Blog",
    EMAIL: "Email",
    FACEBOOK: "Facebook",
    INSTAGRAM: "Instagram",
    LINKEDIN: "LinkedIn",
    OTHER: "Autre",
    X: "X",
  };
  return labels[value.toUpperCase()] ?? value;
}

function normalizeChannel(value: string | null): PublicationChannel | null {
  const channel = normalizeLabel(value);
  const channels: Record<string, PublicationChannel> = {
    autre: "OTHER",
    blog: "BLOG",
    email: "EMAIL",
    facebook: "FACEBOOK",
    instagram: "INSTAGRAM",
    linkedin: "LINKEDIN",
    other: "OTHER",
    x: "X",
  };
  return channel ? (channels[channel] ?? null) : null;
}

function normalizeLabel(value: string | null): string | null {
  const normalized = value
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return normalized || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function chunkText(value: string, maximumLength: number): string[] {
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += maximumLength) {
    chunks.push(value.slice(offset, offset + maximumLength));
  }
  return chunks.length > 0 ? chunks : [""];
}
