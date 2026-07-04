import type {
  ApiResponse,
  ContentFormat,
  ContentIdeaStatus,
  ContentItemStatus,
  DuplicateCheckPayload,
  HistoryDetailPayload,
  HistoryItemType,
  HistoryListPayload,
} from "@content-ai/shared";

import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";

export type FetchHistoryInput = {
  format?: ContentFormat;
  page?: number;
  pageSize?: number;
  query?: string;
  status?: ContentIdeaStatus | ContentItemStatus;
  type?: HistoryItemType;
};

export type CheckHistoryDuplicateInput = {
  excludedId?: string;
  format?: ContentFormat;
  targetType: HistoryItemType;
  text?: string;
  title: string;
  topic?: string;
};

export async function fetchHistory(
  organizationSlug: string,
  input: FetchHistoryInput = {},
): Promise<ApiResponse<HistoryListPayload>> {
  const params = new URLSearchParams();

  appendParam(params, "query", input.query);
  appendParam(params, "type", input.type);
  appendParam(params, "format", input.format);
  appendParam(params, "status", input.status);
  appendParam(params, "page", input.page);
  appendParam(params, "pageSize", input.pageSize);

  const queryString = params.toString();
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/history${
      queryString ? `?${queryString}` : ""
    }`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<HistoryListPayload>(response);
}

export async function fetchHistoryItem(
  organizationSlug: string,
  itemType: string,
  itemId: string,
): Promise<ApiResponse<HistoryDetailPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/history/${itemType}/${itemId}`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<HistoryDetailPayload>(response);
}

export async function checkHistoryDuplicate(
  organizationSlug: string,
  input: CheckHistoryDuplicateInput,
): Promise<ApiResponse<{ duplicate: DuplicateCheckPayload }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/history/duplicate-check`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  return readApiResponse<{ duplicate: DuplicateCheckPayload }>(response);
}

function appendParam(
  params: URLSearchParams,
  key: string,
  value: number | string | undefined,
) {
  if (value !== undefined && value !== "") {
    params.set(key, String(value));
  }
}
