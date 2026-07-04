import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  AI_PROVIDER,
  AI_PROVIDER_NAMES,
  type AiProviderName,
} from "./ai.constants";
import { ContentGenerationService } from "./content-generation.service";
import { GeminiAiProvider } from "./providers/gemini-ai.provider";
import { MockAiProvider } from "./providers/mock-ai.provider";
import { DatabaseModule } from "../database/database.module";

@Module({
  exports: [ContentGenerationService],
  imports: [DatabaseModule],
  providers: [
    ContentGenerationService,
    GeminiAiProvider,
    MockAiProvider,
    {
      inject: [ConfigService, GeminiAiProvider, MockAiProvider],
      provide: AI_PROVIDER,
      useFactory: (
        configService: ConfigService,
        geminiProvider: GeminiAiProvider,
        mockProvider: MockAiProvider,
      ) => {
        const providerName = resolveProviderName(configService);

        return providerName === "gemini" ? geminiProvider : mockProvider;
      },
    },
  ],
})
export class AiModule {}

function resolveProviderName(configService: ConfigService): AiProviderName {
  const configuredProvider = configService
    .get<string>("AI_PROVIDER")
    ?.trim()
    .toLowerCase();

  if (configuredProvider) {
    if (AI_PROVIDER_NAMES.includes(configuredProvider as AiProviderName)) {
      return configuredProvider as AiProviderName;
    }

    throw new Error(`Unsupported AI_PROVIDER "${configuredProvider}".`);
  }

  const geminiApiKey = configService.get<string>("GEMINI_API_KEY")?.trim();

  if (geminiApiKey) {
    return "gemini";
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AI_PROVIDER or GEMINI_API_KEY is required in production.");
  }

  return "mock";
}
