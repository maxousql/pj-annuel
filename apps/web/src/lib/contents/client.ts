import type {
  ApiResponse,
  ContentGenerationFormat,
  ContentIdeaOptionsPayload,
  ContentItemPayload,
  ContentItemsListPayload,
  ContentMutationPayload,
  ContentSaveStatus,
  GeneratedContentPayload,
} from "@content-ai/shared";

import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";

export type GenerateContentInput = {
  brief?: string;
  format: ContentGenerationFormat;
  ideaId?: string;
};

export type SaveContentInput = {
  body: string;
  brief?: string;
  format: ContentGenerationFormat;
  ideaId?: string;
  status?: ContentSaveStatus;
  title: string;
  topic?: string;
};

export type UpdateContentInput = Partial<SaveContentInput>;

export async function fetchContents(
  organizationSlug: string,
): Promise<ApiResponse<ContentItemsListPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/contents`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<ContentItemsListPayload>(response);
}

export async function fetchSourceIdeas(
  organizationSlug: string,
): Promise<ApiResponse<ContentIdeaOptionsPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/contents/source-ideas`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<ContentIdeaOptionsPayload>(response);
}

export async function generateContent(
  organizationSlug: string,
  input: GenerateContentInput,
): Promise<ApiResponse<GeneratedContentPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/contents/generate`,
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

export async function saveContent(
  organizationSlug: string,
  input: SaveContentInput,
): Promise<ApiResponse<ContentMutationPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/contents`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  return readApiResponse<ContentMutationPayload>(response);
}

export async function fetchContent(
  organizationSlug: string,
  contentId: string,
): Promise<ApiResponse<{ content: ContentItemPayload }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/contents/${contentId}`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<{ content: ContentItemPayload }>(response);
}

export async function updateContent(
  organizationSlug: string,
  contentId: string,
  input: UpdateContentInput,
): Promise<ApiResponse<ContentMutationPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/contents/${contentId}`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "PATCH",
    },
  );

  return readApiResponse<ContentMutationPayload>(response);
}
