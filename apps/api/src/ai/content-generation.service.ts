import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  AiGenerationErrorCode,
  AiGenerationType,
  ContentIdeasPayload,
  GenerationLanguage,
  GenerationTargetLength,
  MarketingContentPayload,
  ResourceSummaryPayload,
} from "@content-ai/shared";

import {
  AI_PROVIDER,
  DEFAULT_AI_MAX_RETRIES,
  DEFAULT_AI_TIMEOUT_MS,
} from "./ai.constants";
import { AiGenerationException, toAiGenerationException } from "./ai.errors";
import {
  validateContentIdeasOutput,
  validateMarketingContentOutput,
  validateResourceSummaryOutput,
} from "./ai-output.validation";
import {
  buildContentIdeasPrompt,
  buildMarketingContentPrompt,
  buildResourceSummaryPrompt,
} from "./prompt-templates";
import type {
  AiProvider,
  BrandVoiceSnapshot,
  BuiltPrompt,
  ContentGenerationResultByType,
  EditorialContextSnapshot,
  GenerateContentIdeasInput,
  GenerateMarketingContentInput,
  GenerationBaseInput,
  GenerationSettingsSnapshot,
  SummarizeResourceInput,
} from "./ai.types";
import { PrismaService } from "../database/prisma.service";

type Validator<TGenerationType extends AiGenerationType> = (
  rawText: string,
) => ContentGenerationResultByType[TGenerationType];

type BrandVoiceProfileSnapshot = {
  creativity: number;
  examples: string[];
  forbiddenTerms: string[];
  language: GenerationLanguage;
  targetLength: GenerationTargetLength;
  toneRules: string;
} | null;

@Injectable()
export class ContentGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
  ) {}

  async generateContentIdeas(
    input: GenerateContentIdeasInput,
  ): Promise<ContentIdeasPayload> {
    const { brandVoice, context, settings } =
      await this.loadPromptContext(input);
    const prompt = buildContentIdeasPrompt(
      input,
      context,
      brandVoice,
      settings,
    );

    return this.executeGeneration(
      input,
      prompt,
      context,
      brandVoice,
      settings,
      validateContentIdeasOutput,
    );
  }

  async generateMarketingContent(
    input: GenerateMarketingContentInput,
  ): Promise<MarketingContentPayload> {
    const { brandVoice, context, settings } =
      await this.loadPromptContext(input);
    const prompt = buildMarketingContentPrompt(
      input,
      context,
      brandVoice,
      settings,
    );

    return this.executeGeneration(
      input,
      prompt,
      context,
      brandVoice,
      settings,
      validateMarketingContentOutput,
    );
  }

  async summarizeResource(
    input: SummarizeResourceInput,
  ): Promise<ResourceSummaryPayload> {
    const { brandVoice, context, settings } =
      await this.loadPromptContext(input);
    const prompt = buildResourceSummaryPrompt(
      input,
      context,
      brandVoice,
      settings,
    );

    return this.executeGeneration(
      input,
      prompt,
      context,
      brandVoice,
      settings,
      validateResourceSummaryOutput,
    );
  }

  private async executeGeneration<TGenerationType extends AiGenerationType>(
    input: GenerationBaseInput,
    prompt: BuiltPrompt & { type: TGenerationType },
    context: EditorialContextSnapshot,
    brandVoice: BrandVoiceSnapshot,
    settings: GenerationSettingsSnapshot,
    validate: Validator<TGenerationType>,
  ): Promise<ContentGenerationResultByType[TGenerationType]> {
    const inputHash = hashGenerationInput(prompt, input, context, settings);

    try {
      const providerResponse = await this.provider.generateStructuredOutput({
        input: prompt.input,
        maxRetries: this.resolveIntegerConfig(
          "AI_MAX_RETRIES",
          DEFAULT_AI_MAX_RETRIES,
        ),
        responseSchema: prompt.responseSchema,
        responseSchemaName: prompt.responseSchemaName,
        systemInstruction: prompt.systemInstruction,
        timeoutMs: this.resolveIntegerConfig(
          "AI_TIMEOUT_MS",
          DEFAULT_AI_TIMEOUT_MS,
        ),
      });
      const output = validate(providerResponse.text);

      await this.logGeneration({
        errorCode: null,
        errorMessage: null,
        input,
        inputHash,
        brandVoice,
        model: providerResponse.model,
        prompt,
        status: "SUCCEEDED",
      });

      return output;
    } catch (error) {
      const exception = toAiGenerationException(error);

      await this.logGeneration({
        errorCode: exception.code,
        errorMessage: exception.message,
        input,
        inputHash,
        brandVoice,
        model: this.provider.model,
        prompt,
        status: "FAILED",
      });

      throw exception;
    }
  }

  private async loadEditorialContext(
    organizationId: string,
  ): Promise<EditorialContextSnapshot> {
    const context = await this.prisma.editorialContext.findUnique({
      select: {
        positioning: true,
        resourceNotes: true,
        sector: true,
        targetAudience: true,
        themes: true,
        tone: true,
      },
      where: {
        organizationId,
      },
    });

    return context ?? null;
  }

  private async logGeneration(input: {
    errorCode: AiGenerationErrorCode | null;
    errorMessage: string | null;
    brandVoice: BrandVoiceSnapshot;
    input: GenerationBaseInput;
    inputHash: string;
    model: string;
    prompt: BuiltPrompt;
    status: "SUCCEEDED" | "FAILED";
  }): Promise<void> {
    await this.prisma.aiGenerationLog.create({
      data: {
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
        inputHash: input.inputHash,
        model: input.model,
        organizationId: input.input.organizationId,
        promptMetadata: {
          brandVoiceConfigured: Boolean(input.brandVoice),
          inputHash: input.inputHash,
          provider: this.provider.name,
          responseSchema: input.prompt.responseSchemaName,
          ...input.prompt.metadata,
        },
        promptVersion: input.prompt.version,
        resultContentIdeaId: input.input.resultContentIdeaId ?? null,
        resultContentItemId: input.input.resultContentItemId ?? null,
        resultId: input.input.resultId ?? null,
        resultResourceId: input.input.resultResourceId ?? null,
        status: input.status,
        type: input.prompt.type,
        userId: input.input.userId ?? null,
      },
    });
  }

  private resolveIntegerConfig(key: string, fallback: number): number {
    const value = this.configService.get<string>(key)?.trim();
    const parsedValue = value ? Number.parseInt(value, 10) : Number.NaN;

    return Number.isFinite(parsedValue) && parsedValue >= 0
      ? parsedValue
      : fallback;
  }

  private async loadPromptContext(input: GenerationBaseInput): Promise<{
    brandVoice: BrandVoiceSnapshot;
    context: EditorialContextSnapshot;
    settings: GenerationSettingsSnapshot;
  }> {
    const [context, profile] = await Promise.all([
      this.loadEditorialContext(input.organizationId),
      this.loadBrandVoice(input.organizationId),
    ]);

    return {
      brandVoice: profile,
      context,
      settings: resolveGenerationSettings(input.settings, profile),
    };
  }

  private async loadBrandVoice(
    organizationId: string,
  ): Promise<BrandVoiceProfileSnapshot> {
    const profile = await this.prisma.brandVoiceProfile.findUnique({
      select: {
        creativity: true,
        examples: true,
        forbiddenTerms: true,
        language: true,
        targetLength: true,
        toneRules: true,
      },
      where: {
        organizationId,
      },
    });

    if (!profile) {
      return null;
    }

    return {
      creativity: profile.creativity,
      examples: profile.examples,
      forbiddenTerms: profile.forbiddenTerms,
      language: normalizeLanguage(profile.language),
      targetLength: normalizeTargetLength(profile.targetLength),
      toneRules: profile.toneRules,
    };
  }
}

function hashGenerationInput(
  prompt: BuiltPrompt,
  input: GenerationBaseInput,
  context: EditorialContextSnapshot,
  settings: GenerationSettingsSnapshot,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        context,
        input,
        promptVersion: prompt.version,
        settings,
        type: prompt.type,
      }),
    )
    .digest("hex");
}

function resolveGenerationSettings(
  inputSettings: Partial<GenerationSettingsSnapshot> | undefined,
  profile: BrandVoiceProfileSnapshot,
): GenerationSettingsSnapshot {
  return {
    creativity: clampInteger(
      inputSettings?.creativity,
      profile ? profile.creativity : 2,
    ),
    language: inputSettings?.language ?? (profile ? profile.language : "fr"),
    targetLength:
      inputSettings?.targetLength ??
      (profile ? profile.targetLength : "standard"),
    toneIntensity: clampInteger(inputSettings?.toneIntensity, 3),
  };
}

function clampInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, 1), 5);
}

function normalizeLanguage(value: string): GenerationLanguage {
  return ["fr", "en", "es", "de"].includes(value)
    ? (value as GenerationLanguage)
    : "fr";
}

function normalizeTargetLength(value: string): GenerationTargetLength {
  return ["short", "standard", "long"].includes(value)
    ? (value as GenerationTargetLength)
    : "standard";
}
