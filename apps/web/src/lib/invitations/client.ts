import type {
  ApiResponse,
  InvitationMutationPayload,
  InvitationPreviewPayload,
  InvitationsPayload,
  InvitationSummaryPayload,
  MemberMutationPayload,
  OrganizationRole,
} from "@content-ai/shared";

import { getApiBaseUrl, readApiResponse } from "@/lib/auth/client";

export async function fetchTeam(
  organizationSlug: string,
): Promise<ApiResponse<InvitationsPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/team`,
    { credentials: "include" },
  );

  return readApiResponse<InvitationsPayload>(response);
}

export async function createInvitation(
  organizationSlug: string,
  input: { email: string; role: OrganizationRole },
): Promise<ApiResponse<InvitationMutationPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/invitations`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );

  return readApiResponse<InvitationMutationPayload>(response);
}

export async function resendInvitation(
  organizationSlug: string,
  invitationId: string,
): Promise<ApiResponse<InvitationMutationPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/invitations/${invitationId}/resend`,
    { credentials: "include", method: "POST" },
  );

  return readApiResponse<InvitationMutationPayload>(response);
}

export async function revokeInvitation(
  organizationSlug: string,
  invitationId: string,
): Promise<ApiResponse<{ invitation: InvitationSummaryPayload }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/invitations/${invitationId}`,
    { credentials: "include", method: "DELETE" },
  );

  return readApiResponse<{ invitation: InvitationSummaryPayload }>(response);
}

export async function updateMemberRole(
  organizationSlug: string,
  membershipId: string,
  role: OrganizationRole,
): Promise<ApiResponse<MemberMutationPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/members/${membershipId}/role`,
    {
      body: JSON.stringify({ role }),
      credentials: "include",
      headers: { "content-type": "application/json" },
      method: "PATCH",
    },
  );

  return readApiResponse<MemberMutationPayload>(response);
}

export async function removeMember(
  organizationSlug: string,
  membershipId: string,
): Promise<ApiResponse<{ removed: boolean }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/organizations/${organizationSlug}/members/${membershipId}`,
    { credentials: "include", method: "DELETE" },
  );

  return readApiResponse<{ removed: boolean }>(response);
}

export async function fetchInvitationPreview(
  token: string,
): Promise<ApiResponse<InvitationPreviewPayload>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/invitations/${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );

  return readApiResponse<InvitationPreviewPayload>(response);
}

export async function acceptInvitation(
  token: string,
): Promise<ApiResponse<{ organizationSlug: string }>> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/invitations/${encodeURIComponent(token)}/accept`,
    { credentials: "include", method: "POST" },
  );

  return readApiResponse<{ organizationSlug: string }>(response);
}
