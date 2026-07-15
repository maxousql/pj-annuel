import type {
  ApiResponse,
  ContentGenerationFormat,
  CurationFeedMutationPayload,
  CurationPayload,
  CurationResourceMutationPayload,
  CuratedResourceDetailPayload,
  GeneratedContentPayload,
  GenerationLanguage,
  GenerationTargetLength,
} from "@content-ai/shared";

import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";

export type AddResourceInput = {
  tagNames?: string[];
  topic?: string;
  url: string;
};

export type AddFeedInput = {
  title?: string;
  url: string;
};

export type UseResourceForGenerationInput = {
  brief?: string;
  creativity?: number;
  format: ContentGenerationFormat;
  language?: GenerationLanguage;
  targetLength?: GenerationTargetLength;
  toneIntensity?: number;
};

export async function fetchCuration(
  organizationSlug: string,
): Promise<ApiResponse<CurationPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/curation`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<CurationPayload>(response);
}

export async function fetchCurationResource(
  organizationSlug: string,
  resourceId: string,
): Promise<ApiResponse<CuratedResourceDetailPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/curation/resources/${resourceId}`,
    { credentials: "include" },
  );

  return readApiResponse<CuratedResourceDetailPayload>(response);
}

export async function addResourceUrl(
  organizationSlug: string,
  input: AddResourceInput,
): Promise<ApiResponse<CurationResourceMutationPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/curation/resources`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  return readApiResponse<CurationResourceMutationPayload>(response);
}

export async function addRssFeed(
  organizationSlug: string,
  input: AddFeedInput,
): Promise<ApiResponse<CurationFeedMutationPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/curation/feeds`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  return readApiResponse<CurationFeedMutationPayload>(response);
}

export async function importRssFeed(
  organizationSlug: string,
  feedId: string,
): Promise<ApiResponse<CurationFeedMutationPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/curation/feeds/${feedId}/import`,
    {
      credentials: "include",
      method: "POST",
    },
  );

  return readApiResponse<CurationFeedMutationPayload>(response);
}

export async function summarizeResource(
  organizationSlug: string,
  resourceId: string,
): Promise<ApiResponse<CurationResourceMutationPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/curation/resources/${resourceId}/summarize`,
    {
      credentials: "include",
      method: "POST",
    },
  );

  return readApiResponse<CurationResourceMutationPayload>(response);
}

export async function useResourceForGeneration(
  organizationSlug: string,
  resourceId: string,
  input: UseResourceForGenerationInput,
): Promise<ApiResponse<GeneratedContentPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/curation/resources/${resourceId}/use-for-generation`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  return readApiResponse<GeneratedContentPayload>(response);
}
