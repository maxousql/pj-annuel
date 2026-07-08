import type {
  AdvancedOnboardingStep,
  ApiResponse,
  OnboardingStatePayload,
} from "@content-ai/shared";

import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";

export type EditorialContextInput = {
  sector: string;
  targetAudience: string;
  tone: string;
  positioning?: string;
  themes: string[];
  resourceNotes?: string;
};

export async function fetchOnboardingState(
  organizationSlug?: string,
): Promise<ApiResponse<OnboardingStatePayload>> {
  const query = organizationSlug
    ? `?organizationSlug=${encodeURIComponent(organizationSlug)}`
    : "";
  const response = await fetch(`${getApiBaseUrl()}/api/onboarding${query}`, {
    credentials: "include",
  });

  return readApiResponse<OnboardingStatePayload>(response);
}

export async function saveEditorialContext(
  organizationSlug: string,
  input: EditorialContextInput,
): Promise<ApiResponse<OnboardingStatePayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/onboarding/organizations/${organizationSlug}/editorial-context`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "PUT",
    },
  );

  return readApiResponse<OnboardingStatePayload>(response);
}

export async function completeOnboarding(
  organizationSlug: string,
): Promise<ApiResponse<OnboardingStatePayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/onboarding/organizations/${organizationSlug}/complete`,
    {
      credentials: "include",
      method: "POST",
    },
  );

  return readApiResponse<OnboardingStatePayload>(response);
}

export async function applyOnboardingPreset(
  organizationSlug: string,
  presetId: string,
): Promise<ApiResponse<OnboardingStatePayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/onboarding/organizations/${organizationSlug}/presets/apply`,
    {
      body: JSON.stringify({ presetId }),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  return readApiResponse<OnboardingStatePayload>(response);
}

export async function updateAdvancedOnboardingProgress(
  organizationSlug: string,
  step: AdvancedOnboardingStep,
  completed = true,
): Promise<ApiResponse<OnboardingStatePayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/onboarding/organizations/${organizationSlug}/progress`,
    {
      body: JSON.stringify({ completed, step }),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "PATCH",
    },
  );

  return readApiResponse<OnboardingStatePayload>(response);
}

export async function skipAdvancedOnboarding(
  organizationSlug: string,
): Promise<ApiResponse<OnboardingStatePayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/onboarding/organizations/${organizationSlug}/skip-advanced`,
    {
      credentials: "include",
      method: "POST",
    },
  );

  return readApiResponse<OnboardingStatePayload>(response);
}
