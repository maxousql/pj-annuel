import type { ConfigService } from "@nestjs/config";

import { AiGenerationException } from "./ai.errors";
import { ContentGenerationService } from "./content-generation.service";
import {
  CONTENT_IDEAS_PROMPT_VERSION,
  RESOURCE_SUMMARY_PROMPT_VERSION,
} from "./prompt-templates";
import type {
  AiProvider,
  AiProviderRequest,
  AiProviderResponse,
} from "./ai.types";

describe("ContentGenerationService", () => {
  let prisma: FakeAiPrismaService;
  let provider: StubAiProvider;
  let service: ContentGenerationService;

  beforeEach(() => {
    prisma = new FakeAiPrismaService();
    provider = new StubAiProvider();
    service = new ContentGenerationService(
      prisma as never,
      buildConfigService(),
      provider,
    );
  });

  it("calls the provider with editorial context and logs successful generations", async () => {
    const output = await service.generateContentIdeas({
      brief: "Des idees concretes",
      organizationId: "organization-id",
      userId: "user-id",
    });

    expect(output.ideas).toHaveLength(1);
    expect(provider.lastRequest?.input).toContain("Secteur: SaaS B2B");
    expect(provider.lastRequest?.input).toContain("Cible: CMO");
    expect(prisma.aiGenerationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        errorCode: null,
        inputHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        model: "stub-model",
        organizationId: "organization-id",
        promptMetadata: expect.objectContaining({ resultCount: 1 }),
        promptVersion: CONTENT_IDEAS_PROMPT_VERSION,
        status: "SUCCEEDED",
        type: "CONTENT_IDEA",
        userId: "user-id",
      }),
    });
  });

  it("logs invalid provider output with a standard AI error", async () => {
    provider.responseText = JSON.stringify({ ideas: [] });

    await expect(
      service.generateContentIdeas({
        organizationId: "organization-id",
      }),
    ).rejects.toMatchObject({
      code: "AI_INVALID_OUTPUT",
    });

    expect(prisma.aiGenerationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        errorCode: "AI_INVALID_OUTPUT",
        status: "FAILED",
        type: "CONTENT_IDEA",
      }),
    });
  });

  it("propagates provider failures as standard AI errors", async () => {
    provider.error = new AiGenerationException("AI_TIMEOUT");

    await expect(
      service.summarizeResource({
        content: "Long contenu source",
        organizationId: "organization-id",
        title: "Ressource",
      }),
    ).rejects.toMatchObject({
      code: "AI_TIMEOUT",
    });

    expect(prisma.aiGenerationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        errorCode: "AI_TIMEOUT",
        promptVersion: RESOURCE_SUMMARY_PROMPT_VERSION,
        status: "FAILED",
        type: "RESOURCE_SUMMARY",
      }),
    });
  });
});

class StubAiProvider implements AiProvider {
  readonly name = "stub";
  readonly model = "stub-model";
  error: unknown;
  lastRequest: AiProviderRequest | undefined;
  responseText = JSON.stringify({
    ideas: [
      {
        angle: "Angle genere",
        category: "Strategie",
        justification: "Justification generee",
        recommendedFormat: "LINKEDIN_POST",
        title: "Idee generee",
      },
    ],
  });

  async generateStructuredOutput(
    request: AiProviderRequest,
  ): Promise<AiProviderResponse> {
    this.lastRequest = request;

    if (this.error) {
      throw this.error;
    }

    return {
      model: this.model,
      text: this.responseText,
    };
  }
}

class FakeAiPrismaService {
  readonly editorialContext = {
    findUnique: jest.fn(async () => {
      return {
        positioning: "Expert pragmatique",
        resourceNotes: "Prioriser les exemples concrets",
        sector: "SaaS B2B",
        targetAudience: "CMO",
        themes: ["IA", "contenu"],
        tone: "Clair",
      };
    }),
  };

  readonly brandVoiceProfile = {
    findUnique: jest.fn(async () => null),
  };

  readonly aiGenerationLog = {
    create: jest.fn(async (args: { data: Record<string, unknown> }) => {
      return {
        id: "generation-log-id",
        ...args.data,
      };
    }),
  };
}

function buildConfigService(): ConfigService {
  return {
    get: (key: string) => {
      const values: Record<string, string> = {
        AI_MAX_RETRIES: "0",
        AI_TIMEOUT_MS: "1000",
      };

      return values[key];
    },
  } as ConfigService;
}
