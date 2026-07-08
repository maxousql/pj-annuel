import type {
  AiGenerationType,
  ContentFormat,
  ContentIdeasPayload,
  GenerationLanguage,
  GenerationTargetLength,
  MarketingContentPayload,
  ResourceSummaryPayload,
} from "@content-ai/shared";

export type JsonSchema = {
  type: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: string[];
  description?: string;
  minItems?: number;
  maxItems?: number;
};

export type AiResponseSchemaName =
  "content_ideas" | "marketing_content" | "resource_summary";

export type AiProviderRequest = {
  input: string;
  maxRetries: number;
  responseSchema: JsonSchema;
  responseSchemaName: AiResponseSchemaName;
  systemInstruction: string;
  timeoutMs: number;
};

export type AiProviderResponse = {
  model: string;
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

export type AiProvider = {
  readonly model: string;
  readonly name: string;
  generateStructuredOutput(
    request: AiProviderRequest,
  ): Promise<AiProviderResponse>;
};

export type EditorialContextSnapshot = {
  sector: string;
  targetAudience: string;
  tone: string;
  positioning: string;
  themes: string[];
  resourceNotes: string | null;
} | null;

export type GenerationSettingsSnapshot = {
  creativity: number;
  language: GenerationLanguage;
  targetLength: GenerationTargetLength;
  toneIntensity: number;
};

export type BrandVoiceSnapshot = {
  examples: string[];
  forbiddenTerms: string[];
  toneRules: string;
} | null;

export type GenerationBaseInput = {
  organizationId: string;
  userId?: string | null;
  history?: string[] | undefined;
  settings?: Partial<GenerationSettingsSnapshot> | undefined;
  resultId?: string | null;
  resultContentIdeaId?: string | null;
  resultContentItemId?: string | null;
  resultResourceId?: string | null;
};

export type GenerateContentIdeasInput = GenerationBaseInput & {
  brief?: string | undefined;
  count?: number | undefined;
  format?: ContentFormat | undefined;
  topic?: string | undefined;
};

export type GenerateMarketingContentInput = GenerationBaseInput & {
  brief: string;
  format: ContentFormat;
  idea?: {
    title: string;
    angle: string;
  };
};

export type SummarizeResourceInput = GenerationBaseInput & {
  content: string;
  source?: string | undefined;
  title: string;
  topic?: string | undefined;
  url?: string | undefined;
};

export type BuiltPrompt = {
  input: string;
  metadata: Record<string, string | number | boolean | null>;
  responseSchema: JsonSchema;
  responseSchemaName: AiResponseSchemaName;
  systemInstruction: string;
  type: AiGenerationType;
  version: string;
};

export type ContentGenerationResultByType = {
  CONTENT_IDEA: ContentIdeasPayload;
  CONTENT_DRAFT: MarketingContentPayload;
  RESOURCE_SUMMARY: ResourceSummaryPayload;
};
