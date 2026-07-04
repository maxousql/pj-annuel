import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  EditorialContextPayload,
  EditorialContextSummaryPayload,
} from "@content-ai/shared";

import { PrismaService } from "../database/prisma.service";
import type { ActiveOrganizationContext } from "../organizations/organizations.types";
import type { UpsertEditorialContextDto } from "./dto/upsert-editorial-context.dto";

@Injectable()
export class EditorialContextsService {
  constructor(private readonly prisma: PrismaService) {}

  async getContext(
    organizationContext: ActiveOrganizationContext,
  ): Promise<EditorialContextPayload | null> {
    const context = await this.prisma.editorialContext.findUnique({
      select: editorialContextSelect,
      where: {
        organizationId: organizationContext.organization.id,
      },
    });

    return context ? toEditorialContextPayload(context) : null;
  }

  async upsertContext(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    input: UpsertEditorialContextDto,
  ): Promise<EditorialContextPayload> {
    const normalizedInput = normalizeEditorialContextInput(input);
    const context = await this.prisma.editorialContext.upsert({
      create: {
        createdById: userId,
        organizationId: organizationContext.organization.id,
        ...normalizedInput,
      },
      select: editorialContextSelect,
      update: normalizedInput,
      where: {
        organizationId: organizationContext.organization.id,
      },
    });

    return toEditorialContextPayload(context);
  }

  async getSummary(
    organizationContext: ActiveOrganizationContext,
  ): Promise<EditorialContextSummaryPayload> {
    const context = await this.prisma.editorialContext.findUnique({
      select: editorialContextSelect,
      where: {
        organizationId: organizationContext.organization.id,
      },
    });

    return buildEditorialContextSummary(
      organizationContext.organization.id,
      context ?? null,
    );
  }
}

export const editorialContextSelect = {
  createdAt: true,
  id: true,
  organizationId: true,
  positioning: true,
  resourceNotes: true,
  sector: true,
  targetAudience: true,
  themes: true,
  tone: true,
  updatedAt: true,
} as const;

export type EditorialContextRecord = {
  createdAt: Date | string;
  id: string;
  organizationId: string;
  positioning: string;
  resourceNotes: string | null;
  sector: string;
  targetAudience: string;
  themes: string[];
  tone: string;
  updatedAt: Date | string;
};

type NormalizedEditorialContextInput = {
  positioning: string;
  resourceNotes: string | null;
  sector: string;
  targetAudience: string;
  themes: string[];
  tone: string;
};

export function normalizeEditorialContextInput(
  input: UpsertEditorialContextDto,
): NormalizedEditorialContextInput {
  const sector = input.sector.trim();
  const targetAudience = input.targetAudience.trim();
  const tone = input.tone.trim();
  const positioning = input.positioning?.trim() || "Positionnement a preciser";
  const resourceNotes = input.resourceNotes?.trim() || null;
  const themes = normalizeThemeList(input.themes);

  if (!sector || !targetAudience || !tone || themes.length === 0) {
    throw new BadRequestException("Contexte editorial incomplet.");
  }

  return {
    positioning,
    resourceNotes,
    sector,
    targetAudience,
    themes,
    tone,
  };
}

export function hasMinimumEditorialContext(
  context: EditorialContextRecord | null | undefined,
): context is EditorialContextRecord {
  return Boolean(
    context?.sector.trim() &&
    context.targetAudience.trim() &&
    context.tone.trim() &&
    context.themes.length > 0,
  );
}

export function toEditorialContextPayload(
  context: EditorialContextRecord,
): EditorialContextPayload {
  return {
    createdAt: toIsoString(context.createdAt) ?? "",
    id: context.id,
    organizationId: context.organizationId,
    positioning: context.positioning,
    resourceNotes: context.resourceNotes,
    sector: context.sector,
    targetAudience: context.targetAudience,
    themes: context.themes,
    tone: context.tone,
    updatedAt: toIsoString(context.updatedAt) ?? "",
  };
}

export function buildEditorialContextSummary(
  organizationId: string,
  context: EditorialContextRecord | null,
): EditorialContextSummaryPayload {
  if (!context || !hasMinimumEditorialContext(context)) {
    return {
      configured: false,
      organizationId,
    };
  }

  const summary: EditorialContextSummaryPayload = {
    configured: true,
    organizationId,
    sector: context.sector.trim(),
    targetAudience: context.targetAudience.trim(),
    themes: normalizeThemeList(context.themes),
    tone: context.tone.trim(),
    updatedAt: toIsoString(context.updatedAt) ?? "",
  };
  const positioning = context.positioning.trim();
  const resourceNotes = context.resourceNotes?.trim();

  if (positioning) {
    summary.positioning = positioning;
  }

  if (resourceNotes) {
    summary.resourceNotes = resourceNotes;
  }

  return summary;
}

function normalizeThemeList(themes: string[]): string[] {
  const uniqueThemes = new Map<string, string>();

  for (const theme of themes) {
    const normalizedTheme = theme.trim();
    const key = normalizedTheme.toLowerCase();

    if (normalizedTheme && !uniqueThemes.has(key)) {
      uniqueThemes.set(key, normalizedTheme);
    }
  }

  return Array.from(uniqueThemes.values()).slice(0, 8);
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}
