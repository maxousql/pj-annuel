import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { DEFAULT_AI_MODEL } from "../ai.constants";
import { AiGenerationException } from "../ai.errors";
import type {
  AiProvider,
  AiProviderRequest,
  AiProviderResponse,
} from "../ai.types";

const GEMINI_INTERACTIONS_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

type GeminiInteractionResponse = {
  output_text?: string;
  steps?: {
    content?: {
      text?: string;
      type?: string;
    }[];
    type?: string;
  }[];
  usage?: {
    total_input_tokens?: number;
    total_output_tokens?: number;
  };
  usage_metadata?: {
    input_token_count?: number;
    output_token_count?: number;
  };
};

@Injectable()
export class GeminiAiProvider implements AiProvider {
  readonly name = "gemini";

  constructor(private readonly configService: ConfigService) {}

  get model(): string {
    return (
      this.configService.get<string>("AI_MODEL")?.trim() || DEFAULT_AI_MODEL
    );
  }

  async generateStructuredOutput(
    request: AiProviderRequest,
  ): Promise<AiProviderResponse> {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY")?.trim();

    if (!apiKey) {
      throw new AiGenerationException("AI_PROVIDER_ERROR");
    }

    const response = await this.postWithRetries(apiKey, request);
    const outputText = extractOutputText(response);

    if (!outputText) {
      throw new AiGenerationException("AI_INVALID_OUTPUT");
    }

    const usage = buildUsage(response);

    return usage
      ? {
          model: this.model,
          text: outputText,
          usage,
        }
      : {
          model: this.model,
          text: outputText,
        };
  }

  private async postWithRetries(
    apiKey: string,
    request: AiProviderRequest,
  ): Promise<GeminiInteractionResponse> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= request.maxRetries; attempt += 1) {
      try {
        return await this.post(apiKey, request);
      } catch (error) {
        if (
          error instanceof AiGenerationException &&
          error.code === "AI_QUOTA_EXCEEDED"
        ) {
          throw error;
        }

        lastError = error;

        if (attempt < request.maxRetries) {
          await sleep(250 * (attempt + 1));
          continue;
        }
      }
    }

    if (lastError instanceof AiGenerationException) {
      throw lastError;
    }

    throw new AiGenerationException("AI_PROVIDER_ERROR");
  }

  private async post(
    apiKey: string,
    request: AiProviderRequest,
  ): Promise<GeminiInteractionResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);

    try {
      const response = await fetch(GEMINI_INTERACTIONS_ENDPOINT, {
        body: JSON.stringify({
          generation_config: {
            temperature: 0.7,
          },
          input: request.input,
          model: this.model,
          response_format: {
            mime_type: "application/json",
            schema: request.responseSchema,
            type: "text",
          },
          store: false,
          system_instruction: request.systemInstruction,
        }),
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        method: "POST",
        signal: controller.signal,
      });

      if (response.status === 429) {
        throw new AiGenerationException("AI_QUOTA_EXCEEDED");
      }

      if (!response.ok) {
        throw new AiGenerationException("AI_PROVIDER_ERROR");
      }

      return (await response.json()) as GeminiInteractionResponse;
    } catch (error) {
      if (isAbortError(error)) {
        throw new AiGenerationException("AI_TIMEOUT");
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function extractOutputText(response: GeminiInteractionResponse): string | null {
  const directOutput = response.output_text?.trim();

  if (directOutput) {
    return directOutput;
  }

  const modelOutputText = response.steps
    ?.filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .filter((content) => content.type === "text")
    .map((content) => content.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();

  return modelOutputText || null;
}

function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function buildUsage(
  response: GeminiInteractionResponse,
): AiProviderResponse["usage"] {
  const usage: NonNullable<AiProviderResponse["usage"]> = {};

  if (typeof response.usage?.total_input_tokens === "number") {
    usage.inputTokens = response.usage.total_input_tokens;
  }

  if (typeof response.usage?.total_output_tokens === "number") {
    usage.outputTokens = response.usage.total_output_tokens;
  }

  if (typeof response.usage_metadata?.input_token_count === "number") {
    usage.inputTokens = response.usage_metadata.input_token_count;
  }

  if (typeof response.usage_metadata?.output_token_count === "number") {
    usage.outputTokens = response.usage_metadata.output_token_count;
  }

  return Object.keys(usage).length > 0 ? usage : undefined;
}
