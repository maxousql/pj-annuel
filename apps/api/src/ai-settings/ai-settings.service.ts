import { Injectable } from "@nestjs/common";
import type {
  BrandVoiceProfilePayload,
  GenerationLanguage,
  GenerationTargetLength,
} from "@content-ai/shared";

import {
  CONTENT_IDEAS_PROMPT_VERSION,
  MARKETING_CONTENT_PROMPT_VERSION,
  RESOURCE_SUMMARY_PROMPT_VERSION,
} from "../ai/prompt-templates";
import { PrismaService } from "../database/prisma.service";
import type { ActiveOrganizationContext } from "../organizations/organizations.types";
import type { UpdateBrandVoiceProfileDto } from "./dto/update-brand-voice-profile.dto";

@Injectable()
export class AiSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(organizationContext: ActiveOrganizationContext): Promise<{
    profile: BrandVoiceProfilePayload;
    promptVersions: Record<string, string>;
  }> {
    const profile = await this.prisma.brandVoiceProfile.findUnique({
      select: brandVoiceProfileSelect,
      where: {
        organizationId: organizationContext.organization.id,
      },
    });

    return {
      profile: toBrandVoiceProfilePayload(
        organizationContext.organization.id,
        profile,
      ),
      promptVersions: {
        contentIdeas: CONTENT_IDEAS_PROMPT_VERSION,
        marketingContent: MARKETING_CONTENT_PROMPT_VERSION,
        resourceSummary: RESOURCE_SUMMARY_PROMPT_VERSION,
      },
    };
  }

  async updateSettings(
    organizationContext: ActiveOrganizationContext,
    input: UpdateBrandVoiceProfileDto,
  ): Promise<BrandVoiceProfilePayload> {
    const organizationId = organizationContext.organization.id;
    const profile = await this.prisma.brandVoiceProfile.upsert({
      create: {
        creativity: input.creativity ?? 2,
        examples: normalizeStringList(input.examples),
        forbiddenTerms: normalizeStringList(input.forbiddenTerms),
        language: input.language ?? "fr",
        organizationId,
        targetLength: input.targetLength ?? "standard",
        toneRules: input.toneRules ?? "",
      },
      select: brandVoiceProfileSelect,
      update: {
        ...(input.creativity !== undefined
          ? { creativity: input.creativity }
          : {}),
        ...(input.examples !== undefined
          ? { examples: normalizeStringList(input.examples) }
          : {}),
        ...(input.forbiddenTerms !== undefined
          ? { forbiddenTerms: normalizeStringList(input.forbiddenTerms) }
          : {}),
        ...(input.language ? { language: input.language } : {}),
        ...(input.targetLength ? { targetLength: input.targetLength } : {}),
        ...(input.toneRules !== undefined
          ? { toneRules: input.toneRules }
          : {}),
      },
      where: {
        organizationId,
      },
    });

    return toBrandVoiceProfilePayload(organizationId, profile);
  }
}

const brandVoiceProfileSelect = {
  creativity: true,
  examples: true,
  forbiddenTerms: true,
  language: true,
  organizationId: true,
  targetLength: true,
  toneRules: true,
  updatedAt: true,
} as const;

type BrandVoiceProfileRecord = {
  creativity: number;
  examples: string[];
  forbiddenTerms: string[];
  language: string;
  organizationId: string;
  targetLength: string;
  toneRules: string;
  updatedAt: Date | string;
};

function toBrandVoiceProfilePayload(
  organizationId: string,
  profile: BrandVoiceProfileRecord | null,
): BrandVoiceProfilePayload {
  return {
    creativity: profile?.creativity ?? 2,
    examples: profile?.examples ?? [],
    forbiddenTerms: profile?.forbiddenTerms ?? [],
    language: normalizeLanguage(profile?.language),
    organizationId,
    targetLength: normalizeTargetLength(profile?.targetLength),
    toneIntensity: 3,
    toneRules: profile?.toneRules ?? "",
    updatedAt: profile ? toIsoString(profile.updatedAt) : null,
  };
}

function normalizeStringList(values: string[] | undefined): string[] {
  return (
    values
      ?.map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 12) ?? []
  );
}

function normalizeLanguage(value: string | undefined): GenerationLanguage {
  return value && ["fr", "en", "es", "de"].includes(value)
    ? (value as GenerationLanguage)
    : "fr";
}

function normalizeTargetLength(
  value: string | undefined,
): GenerationTargetLength {
  return value && ["short", "standard", "long"].includes(value)
    ? (value as GenerationTargetLength)
    : "standard";
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
