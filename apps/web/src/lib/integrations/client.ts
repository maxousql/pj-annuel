import type {
  ApiResponse,
  NotionConnectPayload,
  NotionConflictStrategy,
  NotionDatabasesPayload,
  NotionIntegrationPayload,
  NotionMappingPayload,
  NotionPropertyMappingPayload,
  NotionSyncResultPayload,
} from "@content-ai/shared";

import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";

const notionBaseUrl = (organizationSlug: string) =>
  `${getApiBaseUrl()}/api/organizations/${organizationSlug}/integrations/notion`;

export async function fetchNotionIntegration(
  organizationSlug: string,
): Promise<ApiResponse<NotionIntegrationPayload>> {
  const response = await fetch(notionBaseUrl(organizationSlug), {
    credentials: "include",
  });

  return readApiResponse<NotionIntegrationPayload>(response);
}

export async function connectNotion(
  organizationSlug: string,
): Promise<ApiResponse<NotionConnectPayload>> {
  const response = await fetch(`${notionBaseUrl(organizationSlug)}/connect`, {
    credentials: "include",
    method: "POST",
  });

  return readApiResponse<NotionConnectPayload>(response);
}

export async function disconnectNotion(
  organizationSlug: string,
): Promise<ApiResponse<{ disconnected: boolean }>> {
  const response = await fetch(notionBaseUrl(organizationSlug), {
    credentials: "include",
    method: "DELETE",
  });

  return readApiResponse<{ disconnected: boolean }>(response);
}

export async function listNotionDatabases(
  organizationSlug: string,
): Promise<ApiResponse<NotionDatabasesPayload>> {
  const response = await fetch(`${notionBaseUrl(organizationSlug)}/databases`, {
    credentials: "include",
  });

  return readApiResponse<NotionDatabasesPayload>(response);
}

export async function saveNotionMapping(
  organizationSlug: string,
  input: {
    conflictStrategy: NotionConflictStrategy;
    databaseId: string;
    databaseName: string;
    propertyMapping: NotionPropertyMappingPayload;
  },
): Promise<ApiResponse<{ mapping: NotionMappingPayload }>> {
  const response = await fetch(`${notionBaseUrl(organizationSlug)}/mapping`, {
    body: JSON.stringify(input),
    credentials: "include",
    headers: { "content-type": "application/json" },
    method: "POST",
  });

  return readApiResponse<{ mapping: NotionMappingPayload }>(response);
}

export async function syncNotion(
  organizationSlug: string,
): Promise<ApiResponse<NotionSyncResultPayload>> {
  const response = await fetch(`${notionBaseUrl(organizationSlug)}/sync`, {
    credentials: "include",
    method: "POST",
  });

  return readApiResponse<NotionSyncResultPayload>(response);
}

export async function exportContentToNotion(
  organizationSlug: string,
  contentId: string,
): Promise<ApiResponse<NotionSyncResultPayload>> {
  const response = await fetch(
    `${notionBaseUrl(organizationSlug)}/export/contents/${contentId}`,
    { credentials: "include", method: "POST" },
  );

  return readApiResponse<NotionSyncResultPayload>(response);
}

export async function exportResourceToNotion(
  organizationSlug: string,
  resourceId: string,
): Promise<ApiResponse<NotionSyncResultPayload>> {
  const response = await fetch(
    `${notionBaseUrl(organizationSlug)}/export/resources/${resourceId}`,
    { credentials: "include", method: "POST" },
  );

  return readApiResponse<NotionSyncResultPayload>(response);
}
