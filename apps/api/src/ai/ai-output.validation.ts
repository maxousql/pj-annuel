import {
  CONTENT_FORMATS,
  type ContentIdeasPayload,
  type MarketingContentPayload,
  type ResourceSummaryPayload,
} from "@content-ai/shared";

import { AiGenerationException } from "./ai.errors";
import type { JsonSchema } from "./ai.types";

const CONTENT_FORMAT_SET = new Set<string>(CONTENT_FORMATS);
const CONTENT_FORMAT_ALIASES: Record<
  string,
  ContentIdeasPayload["ideas"][number]["recommendedFormat"]
> = {
  ACCROCHE: "HOOK",
  ARTICLE: "BLOG_ARTICLE",
  ARTICLEDEBLOG: "BLOG_ARTICLE",
  AUTRE: "OTHER",
  BLOG: "BLOG_ARTICLE",
  BLOGARTICLE: "BLOG_ARTICLE",
  EMAIL: "EMAIL",
  FIL: "THREAD",
  FILX: "THREAD",
  HOOK: "HOOK",
  LINKEDIN: "LINKEDIN_POST",
  LINKEDINPOST: "LINKEDIN_POST",
  MAIL: "EMAIL",
  OTHER: "OTHER",
  POSTLINKEDIN: "LINKEDIN_POST",
  POSTRESEAUSOCIAL: "SOCIAL_POST",
  POSTRESEAUXSOCIAUX: "SOCIAL_POST",
  POSTSOCIAL: "SOCIAL_POST",
  RESEAUSOCIAL: "SOCIAL_POST",
  RESEAUXSOCIAUX: "SOCIAL_POST",
  SOCIALPOST: "SOCIAL_POST",
  THREAD: "THREAD",
  THREADX: "THREAD",
};

export const CONTENT_IDEAS_RESPONSE_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    ideas: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          angle: { type: "string" },
          recommendedFormat: {
            type: "string",
            enum: [...CONTENT_FORMATS],
          },
          justification: { type: "string" },
          category: { type: "string" },
        },
        required: ["title", "angle", "recommendedFormat", "justification"],
      },
    },
  },
  required: ["ideas"],
};

export const MARKETING_CONTENT_RESPONSE_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    body: { type: "string" },
    format: {
      type: "string",
      enum: [...CONTENT_FORMATS],
    },
    rationale: { type: "string" },
  },
  required: ["title", "body", "format"],
};

export const RESOURCE_SUMMARY_RESPONSE_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    keyPoints: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: { type: "string" },
    },
    suggestedTopic: { type: "string" },
  },
  required: ["summary", "keyPoints"],
};

export function validateContentIdeasOutput(
  rawText: string,
): ContentIdeasPayload {
  const value = parseJsonObject(rawText);
  const ideas = value.ideas;

  if (!Array.isArray(ideas) || ideas.length === 0 || ideas.length > 10) {
    throwInvalidOutput();
  }

  return {
    ideas: ideas.map((idea) => {
      const record = asRecord(idea);
      const recommendedFormat = readContentFormat(
        readFirstDefined(record, [
          "recommendedFormat",
          "recommended_format",
          "format",
          "formatRecommande",
          "format_recommande",
        ]),
      );

      return {
        angle: readRequiredString(record.angle),
        category: readOptionalString(
          readFirstDefined(record, ["category", "categorie", "theme", "topic"]),
        ),
        justification: readRequiredString(
          readFirstDefined(record, ["justification", "rationale", "reason"]),
        ),
        recommendedFormat,
        title: readRequiredString(readFirstDefined(record, ["title", "titre"])),
      };
    }),
  };
}

export function validateMarketingContentOutput(
  rawText: string,
): MarketingContentPayload {
  const value = parseJsonObject(rawText);

  return {
    body: readRequiredString(value.body),
    format: readContentFormat(value.format),
    rationale: readOptionalString(value.rationale),
    title: readRequiredString(value.title),
  };
}

export function validateResourceSummaryOutput(
  rawText: string,
): ResourceSummaryPayload {
  const value = parseJsonObject(rawText);
  const keyPoints = value.keyPoints;

  if (!Array.isArray(keyPoints) || keyPoints.length === 0) {
    throwInvalidOutput();
  }

  return {
    keyPoints: keyPoints.map(readRequiredString),
    summary: readRequiredString(value.summary),
    suggestedTopic: readOptionalString(value.suggestedTopic),
  };
}

function parseJsonObject(rawText: string): Record<string, unknown> {
  const normalizedText = stripMarkdownFence(rawText);

  try {
    return asRecord(JSON.parse(normalizedText));
  } catch {
    const jsonCandidate = extractJsonObjectCandidate(normalizedText);

    if (!jsonCandidate) {
      throwInvalidOutput();
    }

    try {
      return asRecord(JSON.parse(jsonCandidate));
    } catch {
      throwInvalidOutput();
    }
  }
}

function stripMarkdownFence(rawText: string): string {
  const trimmedText = rawText.trim();

  if (!trimmedText.startsWith("```")) {
    return trimmedText;
  }

  return trimmedText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonObjectCandidate(rawText: string): string | null {
  const startIndex = rawText.indexOf("{");

  if (startIndex === -1) {
    return null;
  }

  let depth = 0;
  let isEscaped = false;
  let isInsideString = false;

  for (let index = startIndex; index < rawText.length; index += 1) {
    const character = rawText[index];

    if (isInsideString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (character === "\\") {
        isEscaped = true;
        continue;
      }

      if (character === '"') {
        isInsideString = false;
      }

      continue;
    }

    if (character === '"') {
      isInsideString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return rawText.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throwInvalidOutput();
  }

  return value as Record<string, unknown>;
}

function readFirstDefined(
  record: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
}

function readRequiredString(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throwInvalidOutput();
  }

  return value.trim();
}

function readOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return readRequiredString(value);
}

function readContentFormat(
  value: unknown,
): ContentIdeasPayload["ideas"][number]["recommendedFormat"] {
  const format = readRequiredString(value);

  if (!CONTENT_FORMAT_SET.has(format)) {
    const alias = CONTENT_FORMAT_ALIASES[normalizeFormatAlias(format)];

    if (!alias) {
      throwInvalidOutput();
    }

    return alias;
  }

  return format as ContentIdeasPayload["ideas"][number]["recommendedFormat"];
}

function normalizeFormatAlias(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function throwInvalidOutput(): never {
  throw new AiGenerationException("AI_INVALID_OUTPUT");
}
