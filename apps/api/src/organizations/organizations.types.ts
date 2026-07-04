import type { AuthenticatedRequest } from "../auth/auth.types";
import type { OrganizationRole } from "@content-ai/shared";

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  role: OrganizationRole;
};

export type MembershipSummary = {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: OrganizationRole;
  status: "ACTIVE" | "PENDING" | "DISABLED";
};

export type ActiveOrganizationContext = {
  organization: OrganizationSummary;
  membership: {
    id: string;
    role: OrganizationRole;
    status: "ACTIVE" | "PENDING" | "DISABLED";
  };
};

export type OrganizationRequest = AuthenticatedRequest & {
  organizationContext: ActiveOrganizationContext;
};
