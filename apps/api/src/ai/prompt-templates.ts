import { CONTENT_FORMATS, type ContentFormat } from "@content-ai/shared";

import {
  CONTENT_IDEAS_RESPONSE_SCHEMA,
  MARKETING_CONTENT_RESPONSE_SCHEMA,
  RESOURCE_SUMMARY_RESPONSE_SCHEMA,
} from "./ai-output.validation";
import type {
  BrandVoiceSnapshot,
  BuiltPrompt,
  EditorialContextSnapshot,
  GenerateContentIdeasInput,
  GenerateMarketingContentInput,
  GenerationSettingsSnapshot,
  SummarizeResourceInput,
} from "./ai.types";

export const CONTENT_IDEAS_PROMPT_VERSION = "content-ideas.v2";
export const MARKETING_CONTENT_PROMPT_VERSION = "marketing-content.v2";
export const RESOURCE_SUMMARY_PROMPT_VERSION = "resource-summary.v2";

const SYSTEM_INSTRUCTION = [
  "Tu es le moteur IA de Content AI, une plateforme SaaS de content marketing.",
  "Tu produis des sorties en français, exploitables par une équipe marketing.",
  "Tu reponds uniquement avec un JSON conforme au schema fourni.",
  "Tu ne retournes jamais de markdown, de commentaire hors JSON ou de secret.",
].join("\n");

export function buildContentIdeasPrompt(
  input: GenerateContentIdeasInput,
  context: EditorialContextSnapshot,
  brandVoice: BrandVoiceSnapshot,
  settings: GenerationSettingsSnapshot,
): BuiltPrompt & { type: "CONTENT_IDEA" } {
  return {
    input: [
      "Objectif: proposer des idées de contenus marketing.",
      formatEditorialContext(context),
      formatGenerationSettings(settings),
      formatBrandVoice(brandVoice),
      `Nombre d'idées souhaité: ${input.count ?? 5}.`,
      `Format préféré: ${formatContentFormat(input.format)}.`,
      `Thématique demandée: ${input.topic?.trim() || "Non précisée"}.`,
      `Brief utilisateur: ${input.brief?.trim() || "Aucun brief spécifique"}.`,
      formatHistory(input.history),
      "Chaque idée doit contenir un titre, un angle, un format recommandé, une justification et une catégorie si pertinente.",
      'Retourne exactement ce JSON sans texte autour: {"ideas":[{"title":"...","angle":"...","recommendedFormat":"LINKEDIN_POST","justification":"...","category":"..."}]}',
      `recommendedFormat doit être une des valeurs exactes suivantes: ${CONTENT_FORMATS.join(", ")}.`,
    ].join("\n\n"),
    metadata: {
      count: input.count ?? 5,
      creativity: settings.creativity,
      format: input.format ?? null,
      hasBrief: Boolean(input.brief?.trim()),
      hasBrandVoice: Boolean(brandVoice),
      hasEditorialContext: Boolean(context),
      language: settings.language,
      targetLength: settings.targetLength,
      topic: input.topic?.trim() || null,
      toneIntensity: settings.toneIntensity,
    },
    responseSchema: CONTENT_IDEAS_RESPONSE_SCHEMA,
    responseSchemaName: "content_ideas",
    systemInstruction: SYSTEM_INSTRUCTION,
    type: "CONTENT_IDEA",
    version: CONTENT_IDEAS_PROMPT_VERSION,
  };
}

export function buildMarketingContentPrompt(
  input: GenerateMarketingContentInput,
  context: EditorialContextSnapshot,
  brandVoice: BrandVoiceSnapshot,
  settings: GenerationSettingsSnapshot,
): BuiltPrompt & { type: "CONTENT_DRAFT" } {
  return {
    input: [
      "Objectif: rédiger un contenu marketing prêt à retravailler.",
      formatEditorialContext(context),
      formatGenerationSettings(settings),
      formatBrandVoice(brandVoice),
      `Format cible: ${formatContentFormat(input.format)}.`,
      input.idea
        ? `Idée source: ${input.idea.title.trim()} | Angle: ${input.idea.angle.trim()}.`
        : "Idée source: non fournie.",
      `Brief utilisateur: ${input.brief.trim()}.`,
      formatMarketingContentInstructions(input.format),
      formatHistory(input.history),
      "Le contenu doit respecter le ton, la cible et le positionnement de l'organisation.",
      `Le champ JSON format doit être exactement "${input.format}".`,
    ].join("\n\n"),
    metadata: {
      creativity: settings.creativity,
      format: input.format,
      hasBrandVoice: Boolean(brandVoice),
      hasEditorialContext: Boolean(context),
      hasIdea: Boolean(input.idea),
      language: settings.language,
      targetLength: settings.targetLength,
      toneIntensity: settings.toneIntensity,
    },
    responseSchema: MARKETING_CONTENT_RESPONSE_SCHEMA,
    responseSchemaName: "marketing_content",
    systemInstruction: SYSTEM_INSTRUCTION,
    type: "CONTENT_DRAFT",
    version: MARKETING_CONTENT_PROMPT_VERSION,
  };
}

export function buildResourceSummaryPrompt(
  input: SummarizeResourceInput,
  context: EditorialContextSnapshot,
  brandVoice: BrandVoiceSnapshot,
  settings: GenerationSettingsSnapshot,
): BuiltPrompt & { type: "RESOURCE_SUMMARY" } {
  return {
    input: [
      "Objectif: résumer une ressource de veille pour alimenter la curation.",
      formatEditorialContext(context),
      formatGenerationSettings(settings),
      formatBrandVoice(brandVoice),
      `Titre ressource: ${input.title.trim()}.`,
      `Source: ${input.source?.trim() || "Non précisée"}.`,
      `URL: ${input.url?.trim() || "Non précisée"}.`,
      `Thématique: ${input.topic?.trim() || "Non précisée"}.`,
      "Contenu à résumer:",
      input.content.trim(),
      formatHistory(input.history),
      "Le résumé doit extraire les points utiles à une future production éditoriale.",
    ].join("\n\n"),
    metadata: {
      creativity: settings.creativity,
      hasBrandVoice: Boolean(brandVoice),
      hasEditorialContext: Boolean(context),
      hasUrl: Boolean(input.url?.trim()),
      language: settings.language,
      source: input.source?.trim() || null,
      targetLength: settings.targetLength,
      topic: input.topic?.trim() || null,
      toneIntensity: settings.toneIntensity,
    },
    responseSchema: RESOURCE_SUMMARY_RESPONSE_SCHEMA,
    responseSchemaName: "resource_summary",
    systemInstruction: SYSTEM_INSTRUCTION,
    type: "RESOURCE_SUMMARY",
    version: RESOURCE_SUMMARY_PROMPT_VERSION,
  };
}

function formatGenerationSettings(
  settings: GenerationSettingsSnapshot,
): string {
  const languageLabel: Record<GenerationSettingsSnapshot["language"], string> =
    {
      de: "allemand",
      en: "anglais",
      es: "espagnol",
      fr: "français",
    };
  const lengthLabel: Record<
    GenerationSettingsSnapshot["targetLength"],
    string
  > = {
    long: "développée",
    short: "courte",
    standard: "standard",
  };

  return [
    "Réglages de génération:",
    `- Langue obligatoire: ${languageLabel[settings.language]}.`,
    `- Niveau de créativité: ${settings.creativity}/5.`,
    `- Intensité du ton de marque: ${settings.toneIntensity}/5.`,
    `- Longueur cible: ${lengthLabel[settings.targetLength]}.`,
    "Respecte strictement la langue demandée pour tous les champs textuels.",
  ].join("\n");
}

function formatBrandVoice(brandVoice: BrandVoiceSnapshot): string {
  if (!brandVoice) {
    return "Voix de marque avancée: non configurée.";
  }

  return [
    "Voix de marque avancée:",
    `- Règles de ton: ${brandVoice.toneRules || "non précisées"}`,
    `- Exemples a imiter: ${
      brandVoice.examples.length > 0 ? brandVoice.examples.join(" | ") : "aucun"
    }`,
    `- Termes interdits: ${
      brandVoice.forbiddenTerms.length > 0
        ? brandVoice.forbiddenTerms.join(", ")
        : "aucun"
    }`,
  ].join("\n");
}

function formatEditorialContext(context: EditorialContextSnapshot): string {
  if (!context) {
    return [
      "Contexte éditorial:",
      "- Secteur: non configuré",
      "- Cible: non configurée",
      "- Ton: non configuré",
      "- Positionnement: non configuré",
      "- Thématiques: non configurées",
    ].join("\n");
  }

  return [
    "Contexte éditorial:",
    `- Secteur: ${context.sector}`,
    `- Cible: ${context.targetAudience}`,
    `- Ton: ${context.tone}`,
    `- Positionnement: ${context.positioning}`,
    `- Thématiques: ${context.themes.length > 0 ? context.themes.join(", ") : "non configurées"}`,
    `- Notes ressources: ${context.resourceNotes ?? "aucune"}`,
  ].join("\n");
}

function formatHistory(history: string[] | undefined): string {
  const relevantHistory =
    history
      ?.map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8) ?? [];

  if (relevantHistory.length === 0) {
    return "Historique pertinent: aucun.";
  }

  return [
    "Historique pertinent à éviter ou prendre en compte:",
    ...relevantHistory.map((item) => `- ${item}`),
  ].join("\n");
}

function formatContentFormat(format: ContentFormat | undefined): string {
  return format ?? "Non précisé";
}

function formatMarketingContentInstructions(format: ContentFormat): string {
  const instructions: Record<ContentFormat, string> = {
    BLOG_ARTICLE: [
      "Contraintes format:",
      "- Produire un article structuré avec introduction, 2 à 4 sections et conclusion.",
      "- Utiliser des intertitres clairs dans le corps sans markdown.",
      "- Rester dans une longueur exploitable pour un premier brouillon.",
    ].join("\n"),
    EMAIL: [
      "Contraintes format:",
      "- Le titre doit pouvoir servir d'objet d'email.",
      "- Le corps doit contenir une ouverture, une proposition de valeur et un appel à l'action.",
      "- Éviter les tournures trop promotionnelles.",
    ].join("\n"),
    HOOK: [
      "Contraintes format:",
      "- Produire une série d'accroches courtes et distinctes.",
      "- Chaque accroche doit être directement réutilisable en début de contenu.",
      "- Le corps peut contenir les variantes sous forme de lignes séparées.",
    ].join("\n"),
    LINKEDIN_POST: [
      "Contraintes format:",
      "- Commencer par une accroche forte.",
      "- Structurer en paragraphes courts avec une idée par paragraphe.",
      "- Terminer par une question ou un appel à discussion.",
    ].join("\n"),
    OTHER: [
      "Contraintes format:",
      "- Adapter la structure au brief sans inventer de canal non demandé.",
      "- Garder une sortie claire, éditée et prête à retravailler.",
    ].join("\n"),
    SOCIAL_POST: [
      "Contraintes format:",
      "- Produire un post court pour réseau social.",
      "- Rester concis, direct et compréhensible sans contexte externe.",
      "- Inclure un appel à l'action bref si pertinent.",
    ].join("\n"),
    THREAD: [
      "Contraintes format:",
      "- Produire un fil court avec une progression logique.",
      "- Chaque point doit pouvoir être publié comme message séparé.",
      "- Terminer par une synthèse ou une question.",
    ].join("\n"),
  };

  return instructions[format];
}
