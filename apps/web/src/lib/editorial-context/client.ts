import type {
  ApiResponse,
  EditorialContextPayload,
  EditorialContextSummaryPayload,
} from "@content-ai/shared";

import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";

export type EditorialContextInput = {
  positioning?: string;
  resourceNotes?: string;
  sector: string;
  targetAudience: string;
  themes: string[];
  tone: string;
};

export async function fetchEditorialContext(
  organizationSlug: string,
): Promise<ApiResponse<{ editorialContext: EditorialContextPayload | null }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/editorial-context`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<{ editorialContext: EditorialContextPayload | null }>(
    response,
  );
}

export async function saveEditorialContext(
  organizationSlug: string,
  input: EditorialContextInput,
): Promise<ApiResponse<{ editorialContext: EditorialContextPayload }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/editorial-context`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "PUT",
    },
  );

  return readApiResponse<{ editorialContext: EditorialContextPayload }>(
    response,
  );
}

export async function fetchEditorialContextSummary(
  organizationSlug: string,
): Promise<ApiResponse<{ summary: EditorialContextSummaryPayload }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/editorial-context/summary`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<{ summary: EditorialContextSummaryPayload }>(response);
}
