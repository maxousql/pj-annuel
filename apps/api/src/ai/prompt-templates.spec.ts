import {
  buildContentIdeasPrompt,
  buildMarketingContentPrompt,
} from "./prompt-templates";
import type { GenerationSettingsSnapshot } from "./ai.types";

const DEFAULT_SETTINGS: GenerationSettingsSnapshot = {
  creativity: 2,
  language: "fr",
  targetLength: "standard",
  toneIntensity: 3,
};

describe("AI prompt templates", () => {
  it("injects the editorial context in the content ideas prompt", () => {
    const prompt = buildContentIdeasPrompt(
      {
        brief: "Trouver des angles pratiques.",
        count: 3,
        format: "LINKEDIN_POST",
        history: ["Ancien sujet a eviter"],
        organizationId: "organization-id",
        topic: "productivite",
      },
      {
        positioning: "Expert pragmatique",
        resourceNotes: "Favoriser les cas concrets",
        sector: "SaaS B2B",
        targetAudience: "CMO et founders",
        themes: ["IA", "content marketing"],
        tone: "Clair et direct",
      },
      null,
      DEFAULT_SETTINGS,
    );

    expect(prompt.type).toBe("CONTENT_IDEA");
    expect(prompt.version).toBe("content-ideas.v2");
    expect(prompt.responseSchemaName).toBe("content_ideas");
    expect(prompt.input).toContain("Secteur: SaaS B2B");
    expect(prompt.input).toContain("Cible: CMO et founders");
    expect(prompt.input).toContain("Ton: Clair et direct");
    expect(prompt.input).toContain("Positionnement: Expert pragmatique");
    expect(prompt.input).toContain("Thematiques: IA, content marketing");
    expect(prompt.input).toContain(
      "Brief utilisateur: Trouver des angles pratiques.",
    );
    expect(prompt.input).toContain("Ancien sujet a eviter");
  });

  it("adds format-specific constraints to marketing content prompts", () => {
    const prompt = buildMarketingContentPrompt(
      {
        brief: "Rediger un email pour convertir les essais gratuits.",
        format: "EMAIL",
        history: ["Ancienne campagne a eviter"],
        organizationId: "organization-id",
      },
      {
        positioning: "Expert pragmatique",
        resourceNotes: null,
        sector: "SaaS B2B",
        targetAudience: "CMO et founders",
        themes: ["IA", "content marketing"],
        tone: "Clair et direct",
      },
      null,
      DEFAULT_SETTINGS,
    );

    expect(prompt.type).toBe("CONTENT_DRAFT");
    expect(prompt.responseSchemaName).toBe("marketing_content");
    expect(prompt.input).toContain("Format cible: EMAIL.");
    expect(prompt.input).toContain("Le titre doit pouvoir servir d'objet");
    expect(prompt.input).toContain(
      'Le champ JSON format doit etre exactement "EMAIL".',
    );
    expect(prompt.input).toContain("Ancienne campagne a eviter");
  });
});
