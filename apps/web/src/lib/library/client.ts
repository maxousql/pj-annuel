import type {
  ApiResponse,
  ContentCategoryPayload,
  ContentFormat,
  ContentItemStatus,
  ContentLibraryDetailPayload,
  ContentLibraryPayload,
  ContentTagPayload,
} from "@content-ai/shared";

import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";

export type FetchLibraryInput = {
  category?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  format?: ContentFormat;
  page?: number;
  pageSize?: number;
  query?: string;
  status?: ContentItemStatus;
  tagId?: string;
};

export type UpdateLibraryContentInput = {
  body?: string;
  categoryId?: string | null;
  categoryName?: string;
  format?: ContentFormat;
  status?: ContentItemStatus;
  tagIds?: string[];
  title?: string;
  topic?: string;
};

export async function fetchLibraryContents(
  organizationSlug: string,
  input: FetchLibraryInput = {},
): Promise<ApiResponse<ContentLibraryPayload>> {
  const query = new URLSearchParams();

  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/library${
      query.size > 0 ? `?${query.toString()}` : ""
    }`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<ContentLibraryPayload>(response);
}

export async function fetchLibraryContent(
  organizationSlug: string,
  contentId: string,
): Promise<ApiResponse<ContentLibraryDetailPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/library/${contentId}`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<ContentLibraryDetailPayload>(response);
}

export async function updateLibraryContent(
  organizationSlug: string,
  contentId: string,
  input: UpdateLibraryContentInput,
): Promise<ApiResponse<ContentLibraryDetailPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/library/${contentId}`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "PATCH",
    },
  );

  return readApiResponse<ContentLibraryDetailPayload>(response);
}

export async function archiveLibraryContent(
  organizationSlug: string,
  contentId: string,
): Promise<ApiResponse<ContentLibraryDetailPayload>> {
  return patchLibraryLifecycle(organizationSlug, contentId, "archive");
}

export async function restoreLibraryContent(
  organizationSlug: string,
  contentId: string,
): Promise<ApiResponse<ContentLibraryDetailPayload>> {
  return patchLibraryLifecycle(organizationSlug, contentId, "restore");
}

export async function createLibraryTag(
  organizationSlug: string,
  input: { color?: string; name: string },
): Promise<ApiResponse<{ tag: ContentTagPayload }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/library/tags`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  return readApiResponse<{ tag: ContentTagPayload }>(response);
}

export async function createLibraryCategory(
  organizationSlug: string,
  input: { name: string },
): Promise<ApiResponse<{ category: ContentCategoryPayload }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/library/categories`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  return readApiResponse<{ category: ContentCategoryPayload }>(response);
}

async function patchLibraryLifecycle(
  organizationSlug: string,
  contentId: string,
  action: "archive" | "restore",
): Promise<ApiResponse<ContentLibraryDetailPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/library/${contentId}/${action}`,
    {
      credentials: "include",
      method: "PATCH",
    },
  );

  return readApiResponse<ContentLibraryDetailPayload>(response);
}
