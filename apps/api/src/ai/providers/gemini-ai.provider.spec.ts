import { ConfigService } from "@nestjs/config";

import { GeminiAiProvider } from "./gemini-ai.provider";
import type { AiProviderRequest } from "../ai.types";

const request: AiProviderRequest = {
  input: "Genere des idees.",
  maxRetries: 0,
  responseSchema: {
    properties: {
      ideas: {
        items: {
          properties: {
            title: { type: "string" },
          },
          type: "object",
        },
        type: "array",
      },
    },
    type: "object",
  },
  responseSchemaName: "content_ideas",
  systemInstruction: "Reponds en JSON.",
  timeoutMs: 1_000,
};

describe("GeminiAiProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("extracts structured output from Interactions API model_output steps", async () => {
    global.fetch = jest.fn(async () => {
      return {
        json: async () => ({
          model: "gemini-3.1-flash-lite",
          status: "completed",
          steps: [
            {
              type: "thought",
            },
            {
              content: [
                {
                  text: JSON.stringify({
                    ideas: [
                      {
                        angle: "Angle",
                        justification: "Justification",
                        recommendedFormat: "LINKEDIN_POST",
                        title: "Titre",
                      },
                    ],
                  }),
                  type: "text",
                },
              ],
              type: "model_output",
            },
          ],
          usage: {
            total_input_tokens: 12,
            total_output_tokens: 34,
          },
        }),
        ok: true,
        status: 200,
      } as Response;
    });

    const provider = new GeminiAiProvider(
      new ConfigService({
        AI_MODEL: "gemini-3.1-flash-lite",
        GEMINI_API_KEY: "test-key",
      }),
    );

    const output = await provider.generateStructuredOutput(request);

    expect(output).toEqual({
      model: "gemini-3.1-flash-lite",
      text: JSON.stringify({
        ideas: [
          {
            angle: "Angle",
            justification: "Justification",
            recommendedFormat: "LINKEDIN_POST",
            title: "Titre",
          },
        ],
      }),
      usage: {
        inputTokens: 12,
        outputTokens: 34,
      },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      expect.objectContaining({
        body: expect.stringContaining('"store":false'),
      }),
    );
  });

  it("keeps compatibility with direct output_text responses", async () => {
    global.fetch = jest.fn(async () => {
      return {
        json: async () => ({
          output_text: '{"ideas":[]}',
          usage_metadata: {
            input_token_count: 3,
            output_token_count: 4,
          },
        }),
        ok: true,
        status: 200,
      } as Response;
    });

    const provider = new GeminiAiProvider(
      new ConfigService({
        AI_MODEL: "gemini-3.1-flash-lite",
        GEMINI_API_KEY: "test-key",
      }),
    );

    await expect(provider.generateStructuredOutput(request)).resolves.toEqual({
      model: "gemini-3.1-flash-lite",
      text: '{"ideas":[]}',
      usage: {
        inputTokens: 3,
        outputTokens: 4,
      },
    });
  });
});
