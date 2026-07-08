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
  "Tu es le moteur IA de Projet Annuel, une plateforme SaaS de content marketing.",
  "Tu produis des sorties en francais, exploitables par une equipe marketing.",
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
      "Objectif: proposer des idees de contenus marketing.",
      formatEditorialContext(context),
      formatGenerationSettings(settings),
      formatBrandVoice(brandVoice),
      `Nombre d'idees souhaite: ${input.count ?? 5}.`,
      `Format prefere: ${formatContentFormat(input.format)}.`,
      `Thematique demandee: ${input.topic?.trim() || "Non precisee"}.`,
      `Brief utilisateur: ${input.brief?.trim() || "Aucun brief specifique"}.`,
      formatHistory(input.history),
      "Chaque idee doit contenir un titre, un angle, un format recommande, une justification et une categorie si pertinente.",
      'Retourne exactement ce JSON sans texte autour: {"ideas":[{"title":"...","angle":"...","recommendedFormat":"LINKEDIN_POST","justification":"...","category":"..."}]}',
      `recommendedFormat doit etre une des valeurs exactes suivantes: ${CONTENT_FORMATS.join(", ")}.`,
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
      "Objectif: rediger un contenu marketing pret a retravailler.",
      formatEditorialContext(context),
      formatGenerationSettings(settings),
      formatBrandVoice(brandVoice),
      `Format cible: ${formatContentFormat(input.format)}.`,
      input.idea
        ? `Idee source: ${input.idea.title.trim()} | Angle: ${input.idea.angle.trim()}.`
        : "Idee source: non fournie.",
      `Brief utilisateur: ${input.brief.trim()}.`,
      formatMarketingContentInstructions(input.format),
      formatHistory(input.history),
      "Le contenu doit respecter le ton, la cible et le positionnement de l'organisation.",
      `Le champ JSON format doit etre exactement "${input.format}".`,
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
      "Objectif: resumer une ressource de veille pour alimenter la curation.",
      formatEditorialContext(context),
      formatGenerationSettings(settings),
      formatBrandVoice(brandVoice),
      `Titre ressource: ${input.title.trim()}.`,
      `Source: ${input.source?.trim() || "Non precisee"}.`,
      `URL: ${input.url?.trim() || "Non precisee"}.`,
      `Thematique: ${input.topic?.trim() || "Non precisee"}.`,
      "Contenu a resumer:",
      input.content.trim(),
      formatHistory(input.history),
      "Le resume doit extraire les points utiles a une future production editoriale.",
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
      fr: "francais",
    };
  const lengthLabel: Record<
    GenerationSettingsSnapshot["targetLength"],
    string
  > = {
    long: "developpee",
    short: "courte",
    standard: "standard",
  };

  return [
    "Reglages de generation:",
    `- Langue obligatoire: ${languageLabel[settings.language]}.`,
    `- Niveau de creativite: ${settings.creativity}/5.`,
    `- Intensite du ton de marque: ${settings.toneIntensity}/5.`,
    `- Longueur cible: ${lengthLabel[settings.targetLength]}.`,
    "Respecte strictement la langue demandee pour tous les champs textuels.",
  ].join("\n");
}

function formatBrandVoice(brandVoice: BrandVoiceSnapshot): string {
  if (!brandVoice) {
    return "Voix de marque avancee: non configuree.";
  }

  return [
    "Voix de marque avancee:",
    `- Regles de ton: ${brandVoice.toneRules || "non precisees"}`,
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
      "Contexte editorial:",
      "- Secteur: non configure",
      "- Cible: non configuree",
      "- Ton: non configure",
      "- Positionnement: non configure",
      "- Thematiques: non configurees",
    ].join("\n");
  }

  return [
    "Contexte editorial:",
    `- Secteur: ${context.sector}`,
    `- Cible: ${context.targetAudience}`,
    `- Ton: ${context.tone}`,
    `- Positionnement: ${context.positioning}`,
    `- Thematiques: ${context.themes.length > 0 ? context.themes.join(", ") : "non configurees"}`,
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
    "Historique pertinent a eviter ou prendre en compte:",
    ...relevantHistory.map((item) => `- ${item}`),
  ].join("\n");
}

function formatContentFormat(format: ContentFormat | undefined): string {
  return format ?? "Non precise";
}

function formatMarketingContentInstructions(format: ContentFormat): string {
  const instructions: Record<ContentFormat, string> = {
    BLOG_ARTICLE: [
      "Contraintes format:",
      "- Produire un article structure avec introduction, 2 a 4 sections et conclusion.",
      "- Utiliser des intertitres clairs dans le corps sans markdown.",
      "- Rester dans une longueur exploitable pour un premier brouillon.",
    ].join("\n"),
    EMAIL: [
      "Contraintes format:",
      "- Le titre doit pouvoir servir d'objet d'email.",
      "- Le corps doit contenir une ouverture, une proposition de valeur et un appel a l'action.",
      "- Eviter les tournures trop promotionnelles.",
    ].join("\n"),
    HOOK: [
      "Contraintes format:",
      "- Produire une serie d'accroches courtes et distinctes.",
      "- Chaque accroche doit etre directement reutilisable en debut de contenu.",
      "- Le corps peut contenir les variantes sous forme de lignes separees.",
    ].join("\n"),
    LINKEDIN_POST: [
      "Contraintes format:",
      "- Commencer par une accroche forte.",
      "- Structurer en paragraphes courts avec une idee par paragraphe.",
      "- Terminer par une question ou un appel a discussion.",
    ].join("\n"),
    OTHER: [
      "Contraintes format:",
      "- Adapter la structure au brief sans inventer de canal non demande.",
      "- Garder une sortie claire, editee et prete a retravailler.",
    ].join("\n"),
    SOCIAL_POST: [
      "Contraintes format:",
      "- Produire un post court pour reseau social.",
      "- Rester concis, direct et comprehensible sans contexte externe.",
      "- Inclure un appel a l'action bref si pertinent.",
    ].join("\n"),
    THREAD: [
      "Contraintes format:",
      "- Produire un fil court avec une progression logique.",
      "- Chaque point doit pouvoir etre publie comme message separe.",
      "- Terminer par une synthese ou une question.",
    ].join("\n"),
  };

  return instructions[format];
}
