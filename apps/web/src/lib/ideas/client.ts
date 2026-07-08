import type {
  ApiResponse,
  ContentFormat,
  ContentIdeaDuplicatePayload,
  ContentIdeaMutationPayload,
  ContentIdeasListPayload,
  ContentIdeaStatus,
  GeneratedContentIdeasPayload,
  GenerationLanguage,
  GenerationTargetLength,
} from "@content-ai/shared";

import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";

export type GenerateIdeasInput = {
  brief?: string;
  count?: number;
  creativity?: number;
  format?: ContentFormat;
  language?: GenerationLanguage;
  targetLength?: GenerationTargetLength;
  toneIntensity?: number;
  topic?: string;
};

export type SaveIdeaInput = {
  angle: string;
  category?: string;
  justification: string;
  recommendedFormat: ContentFormat;
  title: string;
};

export async function fetchIdeas(
  organizationSlug: string,
): Promise<ApiResponse<ContentIdeasListPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/ideas`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<ContentIdeasListPayload>(response);
}

export async function generateIdeas(
  organizationSlug: string,
  input: GenerateIdeasInput,
): Promise<ApiResponse<GeneratedContentIdeasPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/ideas/generate`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  return readApiResponse<GeneratedContentIdeasPayload>(response);
}

export async function saveIdea(
  organizationSlug: string,
  input: SaveIdeaInput,
): Promise<ApiResponse<ContentIdeaMutationPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/ideas`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  return readApiResponse<ContentIdeaMutationPayload>(response);
}

export async function updateIdeaStatus(
  organizationSlug: string,
  ideaId: string,
  status: ContentIdeaStatus,
): Promise<ApiResponse<{ idea: ContentIdeasListPayload["ideas"][number] }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/ideas/${ideaId}/status`,
    {
      body: JSON.stringify({ status }),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "PATCH",
    },
  );

  return readApiResponse<{ idea: ContentIdeasListPayload["ideas"][number] }>(
    response,
  );
}

export async function checkIdeaDuplicate(
  organizationSlug: string,
  input: Pick<SaveIdeaInput, "angle" | "category" | "title">,
): Promise<ApiResponse<{ duplicate: ContentIdeaDuplicatePayload }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/ideas/duplicate-check`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  return readApiResponse<{ duplicate: ContentIdeaDuplicatePayload }>(response);
}
