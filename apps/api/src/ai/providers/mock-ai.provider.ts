import { Injectable } from "@nestjs/common";
import { CONTENT_FORMATS, type ContentFormat } from "@content-ai/shared";

import { DEFAULT_AI_MODEL } from "../ai.constants";
import type {
  AiProvider,
  AiProviderRequest,
  AiProviderResponse,
} from "../ai.types";

@Injectable()
export class MockAiProvider implements AiProvider {
  readonly name = "mock";
  readonly model = `mock-${DEFAULT_AI_MODEL}`;

  async generateStructuredOutput(
    request: AiProviderRequest,
  ): Promise<AiProviderResponse> {
    return {
      model: this.model,
      text: JSON.stringify(buildMockResponse(request)),
      usage: {
        inputTokens: Math.ceil(request.input.length / 4),
        outputTokens: 120,
      },
    };
  }
}

function buildMockResponse(request: AiProviderRequest) {
  if (request.responseSchemaName === "content_ideas") {
    const count = readRequestedIdeasCount(request.input);

    return {
      ideas: Array.from({ length: count }, (_, index) => {
        const position = index + 1;

        return {
          angle:
            "Mettre en avant une methode simple et directement applicable.",
          category: "Strategie editoriale",
          justification:
            "Cette idee peut nourrir une production MVP sans dependance externe.",
          recommendedFormat: "LINKEDIN_POST",
          title:
            position === 1
              ? "Structurer sa production de contenu avec l'IA"
              : `Declinaison editoriale IA ${position}`,
        };
      }),
    };
  }

  if (request.responseSchemaName === "marketing_content") {
    const format = readRequestedFormat(request.input);

    return {
      body: "Voici un brouillon marketing genere par le provider mock. Il respecte le format demande et sert aux tests locaux.",
      format,
      rationale:
        "Le contenu est volontairement court pour rester exploitable en test.",
      title: "Brouillon de contenu IA",
    };
  }

  return {
    keyPoints: [
      "La ressource contient des informations utiles pour la veille.",
      "Le sujet peut alimenter une future idee de contenu.",
    ],
    suggestedTopic: "Veille editoriale",
    summary: "Resume de test genere par le provider mock.",
  };
}

function readRequestedFormat(input: string): ContentFormat {
  const formatMatch = input.match(/Format cible: ([A-Z_]+)/);
  const requestedFormat = formatMatch?.[1];

  return CONTENT_FORMATS.includes(requestedFormat as ContentFormat)
    ? (requestedFormat as ContentFormat)
    : "LINKEDIN_POST";
}

function readRequestedIdeasCount(input: string): number {
  const countMatch = input.match(/Nombre d['’]idées souhaité: (\d+)/u);
  const requestedCount = countMatch?.[1]
    ? Number.parseInt(countMatch[1], 10)
    : 1;

  if (!Number.isFinite(requestedCount)) {
    return 1;
  }

  return Math.min(Math.max(requestedCount, 1), 10);
}
