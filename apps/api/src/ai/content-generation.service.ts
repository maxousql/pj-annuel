import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  AiGenerationErrorCode,
  AiGenerationType,
  ContentIdeasPayload,
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
  BuiltPrompt,
  ContentGenerationResultByType,
  EditorialContextSnapshot,
  GenerateContentIdeasInput,
  GenerateMarketingContentInput,
  GenerationBaseInput,
  SummarizeResourceInput,
} from "./ai.types";
import { PrismaService } from "../database/prisma.service";

type Validator<TGenerationType extends AiGenerationType> = (
  rawText: string,
) => ContentGenerationResultByType[TGenerationType];

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
    const context = await this.loadEditorialContext(input.organizationId);
    const prompt = buildContentIdeasPrompt(input, context);

    return this.executeGeneration(
      input,
      prompt,
      context,
      validateContentIdeasOutput,
    );
  }

  async generateMarketingContent(
    input: GenerateMarketingContentInput,
  ): Promise<MarketingContentPayload> {
    const context = await this.loadEditorialContext(input.organizationId);
    const prompt = buildMarketingContentPrompt(input, context);

    return this.executeGeneration(
      input,
      prompt,
      context,
      validateMarketingContentOutput,
    );
  }

  async summarizeResource(
    input: SummarizeResourceInput,
  ): Promise<ResourceSummaryPayload> {
    const context = await this.loadEditorialContext(input.organizationId);
    const prompt = buildResourceSummaryPrompt(input, context);

    return this.executeGeneration(
      input,
      prompt,
      context,
      validateResourceSummaryOutput,
    );
  }

  private async executeGeneration<TGenerationType extends AiGenerationType>(
    input: GenerationBaseInput,
    prompt: BuiltPrompt & { type: TGenerationType },
    context: EditorialContextSnapshot,
    validate: Validator<TGenerationType>,
  ): Promise<ContentGenerationResultByType[TGenerationType]> {
    const inputHash = hashGenerationInput(prompt, input, context);

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
}

function hashGenerationInput(
  prompt: BuiltPrompt,
  input: GenerationBaseInput,
  context: EditorialContextSnapshot,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        context,
        input,
        promptVersion: prompt.version,
        type: prompt.type,
      }),
    )
    .digest("hex");
}
