import type {
  NotionPropertyMappingPayload,
  NotionPropertyTypeMappingPayload,
  PublicationChannel,
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

export function buildNotionProperties(input: {
  channel?: string | null;
  date?: Date | string | null;
  entityType: "Contenu" | "Ressource";
  mapping: NotionPropertyMappingPayload;
  propertyTypes?: NotionPropertyTypeMappingPayload;
  sourceUrl?: string | null;
  status: string;
  title: string;
}): Record<string, unknown> {
  return {
    [input.mapping.title]: {
      title: [{ text: { content: input.title.slice(0, 2_000) } }],
    },
    [input.mapping.status]:
      input.propertyTypes?.status === "status"
        ? { status: { name: input.status } }
        : { select: { name: input.status } },
    [input.mapping.entityType]: {
      select: { name: input.entityType },
    },
    [input.mapping.channel]: input.channel
      ? { select: { name: input.channel } }
      : { select: null },
    [input.mapping.date]: input.date
      ? {
          date: {
            start:
              input.date instanceof Date
                ? input.date.toISOString()
                : input.date,
          },
        }
      : { date: null },
    [input.mapping.sourceUrl]: input.sourceUrl
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
        rich_text: [
          {
            text: { content: chunk },
            type: "text",
          },
        ],
      },
      type: "paragraph",
    })),
  );
}

export function readNotionPageFields(
  page: NotionPage,
  mapping: NotionPropertyMappingPayload,
): {
  channel: PublicationChannel | null;
  date: Date | null;
  status: string | null;
  title: string | null;
} {
  return {
    channel: normalizeChannel(readSelect(page.properties[mapping.channel])),
    date: readDate(page.properties[mapping.date]),
    status: readSelect(page.properties[mapping.status]),
    title: readTitle(page.properties[mapping.title]),
  };
}

function readTitle(value: unknown): string | null {
  if (!isRecord(value) || !Array.isArray(value.title)) {
    return null;
  }

  return readRichText(value.title);
}

function readSelect(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const selected = isRecord(value.select)
    ? value.select
    : isRecord(value.status)
      ? value.status
      : null;

  return selected && typeof selected.name === "string" ? selected.name : null;
}

function readDate(value: unknown): Date | null {
  if (!isRecord(value) || !isRecord(value.date)) {
    return null;
  }

  const start = value.date.start;

  if (typeof start !== "string") {
    return null;
  }

  const date = new Date(start);
  return Number.isFinite(date.getTime()) ? date : null;
}

function readRichText(value: unknown[]): string | null {
  const text = value
    .flatMap((entry) => {
      return isRecord(entry) && typeof entry.plain_text === "string"
        ? [entry.plain_text]
        : [];
    })
    .join("")
    .trim();

  return text || null;
}

function normalizeChannel(value: string | null): PublicationChannel | null {
  const channel = value?.toUpperCase();

  if (
    channel === "LINKEDIN" ||
    channel === "BLOG" ||
    channel === "EMAIL" ||
    channel === "X" ||
    channel === "FACEBOOK" ||
    channel === "INSTAGRAM" ||
    channel === "OTHER"
  ) {
    return channel;
  }

  return null;
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
