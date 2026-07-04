import { SetMetadata } from "@nestjs/common";
import type { OrganizationRole } from "@content-ai/shared";

export const ORGANIZATION_ROLES_KEY = "organizationRoles";

export function Roles(...roles: OrganizationRole[]) {
  return SetMetadata(ORGANIZATION_ROLES_KEY, roles);
}
