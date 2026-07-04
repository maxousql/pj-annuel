import { AiGenerationException } from "./ai.errors";
import {
  validateContentIdeasOutput,
  validateMarketingContentOutput,
  validateResourceSummaryOutput,
} from "./ai-output.validation";

describe("AI output validation", () => {
  it("accepts structured content ideas", () => {
    const output = validateContentIdeasOutput(
      JSON.stringify({
        ideas: [
          {
            angle: "Un angle utile",
            justification: "Pertinent pour la cible",
            recommendedFormat: "LINKEDIN_POST",
            title: "Une idee",
          },
        ],
      }),
    );

    expect(output.ideas[0]).toMatchObject({
      category: null,
      recommendedFormat: "LINKEDIN_POST",
      title: "Une idee",
    });
  });

  it("accepts Gemini-style content ideas with recoverable field aliases", () => {
    const output = validateContentIdeasOutput(`
Voici la reponse JSON:

\`\`\`json
{
  "ideas": [
    {
      "titre": "Un titre exploitable",
      "angle": "Un angle utile",
      "format": "Post LinkedIn",
      "justification": "Pertinent pour la cible",
      "categorie": "Acquisition"
    }
  ]
}
\`\`\`
`);

    expect(output.ideas[0]).toMatchObject({
      category: "Acquisition",
      recommendedFormat: "LINKEDIN_POST",
      title: "Un titre exploitable",
    });
  });

  it("rejects invalid JSON and unsupported formats", () => {
    expect(() => validateMarketingContentOutput("not-json")).toThrow(
      AiGenerationException,
    );
    expect(() =>
      validateContentIdeasOutput(
        JSON.stringify({
          ideas: [
            {
              angle: "Angle",
              justification: "Justification",
              recommendedFormat: "UNKNOWN",
              title: "Titre",
            },
          ],
        }),
      ),
    ).toThrow(AiGenerationException);
  });

  it("normalizes resource summaries", () => {
    const output = validateResourceSummaryOutput(
      JSON.stringify({
        keyPoints: [" Point 1 ", "Point 2"],
        summary: " Resume ",
      }),
    );

    expect(output).toEqual({
      keyPoints: ["Point 1", "Point 2"],
      summary: "Resume",
      suggestedTopic: null,
    });
  });
});
