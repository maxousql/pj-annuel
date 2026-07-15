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
  IdeaDiscoveryFeedbackResultPayload,
  IdeaDiscoveryFeedPayload,
  IdeaDiscoveryRejectionReason,
  IdeaDiscoverySignal,
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

export async function fetchIdeaDiscoveryFeed(
  organizationSlug: string,
): Promise<ApiResponse<IdeaDiscoveryFeedPayload>> {
  return requestIdeaDiscovery<IdeaDiscoveryFeedPayload>(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/ideas/discovery`,
    {
      credentials: "include",
    },
  );
}

export async function generateIdeaDiscoveryFeed(
  organizationSlug: string,
): Promise<ApiResponse<IdeaDiscoveryFeedPayload>> {
  return requestIdeaDiscovery<IdeaDiscoveryFeedPayload>(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/ideas/discovery/generate`,
    {
      credentials: "include",
      method: "POST",
    },
  );
}

export async function submitIdeaDiscoveryFeedback(
  organizationSlug: string,
  candidateId: string,
  signal: IdeaDiscoverySignal,
  reason?: IdeaDiscoveryRejectionReason,
): Promise<ApiResponse<IdeaDiscoveryFeedbackResultPayload>> {
  return requestIdeaDiscovery<IdeaDiscoveryFeedbackResultPayload>(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/ideas/discovery/${candidateId}/feedback`,
    {
      body: JSON.stringify({
        ...(reason ? { reason } : {}),
        signal,
      }),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
}

export async function resetIdeaDiscoveryPreferences(
  organizationSlug: string,
): Promise<ApiResponse<{ profile: IdeaDiscoveryFeedPayload["profile"] }>> {
  return requestIdeaDiscovery<{
    profile: IdeaDiscoveryFeedPayload["profile"];
  }>(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/ideas/discovery/preferences/reset`,
    {
      credentials: "include",
      method: "POST",
    },
  );
}

async function requestIdeaDiscovery<TData>(
  url: string,
  init: RequestInit,
): Promise<ApiResponse<TData>> {
  try {
    const response = await fetch(url, init);
    return await readApiResponse<TData>(response);
  } catch {
    return {
      data: null,
      error: {
        code: "IDEA_DISCOVERY_NETWORK_ERROR",
        message:
          "Impossible de joindre le service de découverte. Vérifiez votre connexion puis réessayez.",
      },
    };
  }
}
