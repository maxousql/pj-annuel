import type {
  ActiveOrganizationPayload,
  ApiResponse,
  MembersListPayload,
  OrganizationsListPayload,
} from "@content-ai/shared";

import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";

export async function fetchOrganizations(): Promise<
  ApiResponse<OrganizationsListPayload>
> {
  const response = await fetch(`${getApiBaseUrl()}/api/organizations`, {
    credentials: "include",
  });

  return readApiResponse<OrganizationsListPayload>(response);
}

export async function createOrganization(input: {
  name: string;
  slug?: string;
}): Promise<ApiResponse<ActiveOrganizationPayload>> {
  const response = await fetch(`${getApiBaseUrl()}/api/organizations`, {
    body: JSON.stringify(input),
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  return readApiResponse<ActiveOrganizationPayload>(response);
}

export async function fetchActiveOrganization(
  organizationSlug: string,
): Promise<ApiResponse<ActiveOrganizationPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<ActiveOrganizationPayload>(response);
}

export async function fetchMembers(
  organizationSlug: string,
): Promise<ApiResponse<MembersListPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/members`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<MembersListPayload>(response);
}
