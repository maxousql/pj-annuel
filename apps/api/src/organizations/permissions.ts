import { ForbiddenException } from "@nestjs/common";
import type { OrganizationRole } from "@content-ai/shared";

export const ROLE_ORDER: Record<OrganizationRole, number> = {
  READER: 1,
  EDITOR: 2,
  ADMIN: 3,
};

export function canReadContent(role: OrganizationRole): boolean {
  return ROLE_ORDER[role] >= ROLE_ORDER.READER;
}

export function canEditContent(role: OrganizationRole): boolean {
  return ROLE_ORDER[role] >= ROLE_ORDER.EDITOR;
}

export function canManageOrganization(role: OrganizationRole): boolean {
  return ROLE_ORDER[role] >= ROLE_ORDER.ADMIN;
}

export function hasAnyRole(
  role: OrganizationRole,
  allowedRoles: readonly OrganizationRole[],
): boolean {
  return allowedRoles.some(
    (allowedRole) => ROLE_ORDER[role] >= ROLE_ORDER[allowedRole],
  );
}

export function assertRole(
  role: OrganizationRole,
  allowedRoles: readonly OrganizationRole[],
): void {
  if (!hasAnyRole(role, allowedRoles)) {
    throw new ForbiddenException("Role insuffisant pour cette organisation.");
  }
}
