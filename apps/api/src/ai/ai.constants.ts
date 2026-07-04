export const AI_PROVIDER = Symbol("AI_PROVIDER");

export const DEFAULT_AI_MODEL = "gemini-3.1-flash-lite";
export const DEFAULT_AI_TIMEOUT_MS = 15_000;
export const DEFAULT_AI_MAX_RETRIES = 1;

export const AI_PROVIDER_NAMES = ["gemini", "mock"] as const;
export type AiProviderName = (typeof AI_PROVIDER_NAMES)[number];
