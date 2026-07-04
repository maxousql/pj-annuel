import type {
  ApiResponse,
  PublicationChannel,
  PublicationPlanMutationPayload,
  PublicationPlansPayload,
  PublicationStatus,
} from "@content-ai/shared";

import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";

export type FetchPublicationPlansInput = {
  channel?: PublicationChannel;
  from?: string;
  status?: PublicationStatus;
  to?: string;
};

export type SavePublicationPlanInput = {
  channel: PublicationChannel;
  contentId: string;
  notes?: string | null;
  scheduledAt: string;
  status?: PublicationStatus;
};

export type UpdatePublicationPlanInput = Partial<SavePublicationPlanInput>;

export async function fetchPublicationPlans(
  organizationSlug: string,
  input: FetchPublicationPlansInput,
): Promise<ApiResponse<PublicationPlansPayload>> {
  const query = new URLSearchParams();

  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/publication-plans${
      query.size > 0 ? `?${query.toString()}` : ""
    }`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<PublicationPlansPayload>(response);
}

export async function createPublicationPlan(
  organizationSlug: string,
  input: SavePublicationPlanInput,
): Promise<ApiResponse<PublicationPlanMutationPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/publication-plans`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  return readApiResponse<PublicationPlanMutationPayload>(response);
}

export async function updatePublicationPlan(
  organizationSlug: string,
  planId: string,
  input: UpdatePublicationPlanInput,
): Promise<ApiResponse<PublicationPlanMutationPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/publication-plans/${planId}`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "PATCH",
    },
  );

  return readApiResponse<PublicationPlanMutationPayload>(response);
}

export async function deletePublicationPlan(
  organizationSlug: string,
  planId: string,
): Promise<ApiResponse<{ deleted: boolean }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/publication-plans/${planId}`,
    {
      credentials: "include",
      method: "DELETE",
    },
  );

  return readApiResponse<{ deleted: boolean }>(response);
}
