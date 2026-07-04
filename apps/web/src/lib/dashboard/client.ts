import type { ApiResponse, DashboardSummaryPayload } from "@content-ai/shared";

import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";

export async function fetchDashboardSummary(
  organizationSlug: string,
): Promise<ApiResponse<DashboardSummaryPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/dashboard`,
    {
      credentials: "include",
    },
  );

  return readApiResponse<DashboardSummaryPayload>(response);
}
