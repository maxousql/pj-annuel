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
    expect(prompt.version).toBe("content-ideas.v3");
    expect(prompt.responseSchemaName).toBe("content_ideas");
    expect(prompt.input).toContain("Secteur: SaaS B2B");
    expect(prompt.input).toContain("Cible: CMO et founders");
    expect(prompt.input).toContain("Ton: Clair et direct");
    expect(prompt.input).toContain("Positionnement: Expert pragmatique");
    expect(prompt.input).toContain("Thématiques: IA, content marketing");
    expect(prompt.input).toContain(
      "Brief utilisateur: Trouver des angles pratiques.",
    );
    expect(prompt.input).toContain("Ancien sujet a eviter");
  });

  it("keeps editorial context authoritative while injecting discovery preferences", () => {
    const prompt = buildContentIdeasPrompt(
      {
        count: 5,
        discovery: {
          explorationCount: 1,
          preferences: {
            avoidedFormats: ["EMAIL"],
            avoidedThemes: ["Recrutement"],
            learnedSignals: 6,
            preferredFormats: ["LINKEDIN_POST"],
            preferredThemes: ["IA", "Productivité"],
          },
        },
        organizationId: "organization-id",
      },
      {
        positioning: "Expert pragmatique",
        resourceNotes: null,
        sector: "SaaS B2B",
        targetAudience: "CMO et founders",
        themes: ["IA"],
        tone: "Clair et direct",
      },
      null,
      DEFAULT_SETTINGS,
    );

    expect(prompt.input).toContain(
      "Le contexte éditorial déclaré reste prioritaire",
    );
    expect(prompt.input).toContain("Thèmes appréciés: IA, Productivité");
    expect(prompt.input).toContain("Formats à éviter: EMAIL");
    expect(prompt.input).toContain("Réserve exactement 1 proposition");
    expect(prompt.input).toContain(
      "Place exactement ces 1 proposition(s) exploratoire(s) à la fin",
    );
    expect(prompt.metadata).toMatchObject({
      explorationCount: 1,
      hasLearnedPreferences: true,
    });
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
      'Le champ JSON format doit être exactement "EMAIL".',
    );
    expect(prompt.input).toContain("Ancienne campagne a eviter");
  });
});
