import type {
  ApiResponse,
  AutomationRulePayload,
  AutomationRuleStatus,
  AutomationRuleType,
  AutomationsPayload,
  NotificationPayload,
  NotificationPreferencePayload,
  RecommendationPayload,
  RecommendationStatus,
} from "@content-ai/shared";

import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";

export type UpdateAutomationRuleInput = {
  reminderHoursBefore?: number;
  status?: AutomationRuleStatus;
};

export async function fetchAutomations(
  organizationSlug: string,
): Promise<ApiResponse<AutomationsPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/automations`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<AutomationsPayload>(response);
}

export async function updateAutomationRule(
  organizationSlug: string,
  type: AutomationRuleType,
  input: UpdateAutomationRuleInput,
): Promise<ApiResponse<{ rule: AutomationRulePayload }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/automations/rules/${type}`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "PUT",
    },
  );

  return readApiResponse<{ rule: AutomationRulePayload }>(response);
}

export async function updateNotificationPreferences(
  organizationSlug: string,
  input: Partial<NotificationPreferencePayload>,
): Promise<ApiResponse<{ preferences: NotificationPreferencePayload }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/automations/preferences`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "PUT",
    },
  );

  return readApiResponse<{ preferences: NotificationPreferencePayload }>(
    response,
  );
}

export async function processPublicationReminders(
  organizationSlug: string,
): Promise<
  ApiResponse<{ createdNotifications: number; createdReminders: number }>
> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/automations/jobs/publication-reminders`,
    {
      credentials: "include",
      method: "POST",
    },
  );

  return readApiResponse<{
    createdNotifications: number;
    createdReminders: number;
  }>(response);
}

export async function generateAutomationRecommendations(
  organizationSlug: string,
): Promise<ApiResponse<{ createdRecommendations: number }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/automations/jobs/recommendations`,
    {
      credentials: "include",
      method: "POST",
    },
  );

  return readApiResponse<{ createdRecommendations: number }>(response);
}

export async function markNotificationAsRead(
  organizationSlug: string,
  notificationId: string,
): Promise<ApiResponse<{ notification: NotificationPayload }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/automations/notifications/${notificationId}/read`,
    {
      credentials: "include",
      method: "PATCH",
    },
  );

  return readApiResponse<{ notification: NotificationPayload }>(response);
}

export async function markAllNotificationsAsRead(
  organizationSlug: string,
): Promise<ApiResponse<{ updatedCount: number }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/automations/notifications/read-all`,
    {
      credentials: "include",
      method: "PATCH",
    },
  );

  return readApiResponse<{ updatedCount: number }>(response);
}

export async function updateRecommendationStatus(
  organizationSlug: string,
  recommendationId: string,
  status: RecommendationStatus,
): Promise<ApiResponse<{ recommendation: RecommendationPayload }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/automations/recommendations/${recommendationId}/status`,
    {
      body: JSON.stringify({ status }),
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      method: "PATCH",
    },
  );

  return readApiResponse<{ recommendation: RecommendationPayload }>(response);
}
