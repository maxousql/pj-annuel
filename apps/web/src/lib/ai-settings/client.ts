import type {
  ApiResponse,
  BrandVoiceProfilePayload,
  AiQualityEvaluationPayload,
  AiQualitySummaryPayload,
  GenerationLanguage,
  GenerationTargetLength,
} from "@content-ai/shared";

import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";

export type UpdateBrandVoiceProfileInput = {
  creativity?: number;
  examples?: string[];
  forbiddenTerms?: string[];
  language?: GenerationLanguage;
  targetLength?: GenerationTargetLength;
  toneRules?: string;
};

export async function fetchAiSettings(organizationSlug: string): Promise<
  ApiResponse<{
    profile: BrandVoiceProfilePayload;
    promptVersions: Record<string, string>;
  }>
> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/ai-settings`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<{
    profile: BrandVoiceProfilePayload;
    promptVersions: Record<string, string>;
  }>(response);
}

export async function evaluateContentQuality(
  organizationSlug: string,
  contentId: string,
  input: { feedback?: string; score: number },
): Promise<ApiResponse<{ evaluation: AiQualityEvaluationPayload }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/ai-settings/quality/contents/${contentId}`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );

  return readApiResponse<{ evaluation: AiQualityEvaluationPayload }>(response);
}

export async function fetchAiQualitySummary(
  organizationSlug: string,
): Promise<ApiResponse<AiQualitySummaryPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/ai-settings/quality`,
    { credentials: "include" },
  );

  return readApiResponse<AiQualitySummaryPayload>(response);
}

export async function updateBrandVoiceProfile(
  organizationSlug: string,
  input: UpdateBrandVoiceProfileInput,
): Promise<ApiResponse<{ profile: BrandVoiceProfilePayload }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/ai-settings/brand-voice`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "PUT",
    },
  );

  return readApiResponse<{ profile: BrandVoiceProfilePayload }>(response);
}
