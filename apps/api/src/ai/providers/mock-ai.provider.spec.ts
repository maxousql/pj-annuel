import type { AiProviderRequest } from "../ai.types";
import { MockAiProvider } from "./mock-ai.provider";

describe("MockAiProvider", () => {
  it("returns the requested number of content ideas", async () => {
    const provider = new MockAiProvider();
    const request: AiProviderRequest = {
      input: "Nombre d'idées souhaité: 3.",
      maxRetries: 0,
      responseSchema: { type: "object" },
      responseSchemaName: "content_ideas",
      systemInstruction: "Réponds en JSON.",
      timeoutMs: 1_000,
    };

    const response = await provider.generateStructuredOutput(request);
    const output = JSON.parse(response.text) as { ideas: unknown[] };

    expect(output.ideas).toHaveLength(3);
  });
});
