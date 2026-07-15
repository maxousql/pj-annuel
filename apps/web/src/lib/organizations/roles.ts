import type { OrganizationRole } from "@content-ai/shared";

const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  ADMIN: "Administrateur",
  EDITOR: "Éditeur",
  READER: "Lecteur",
};

export function getOrganizationRoleLabel(role?: OrganizationRole): string {
  return role ? ORGANIZATION_ROLE_LABELS[role] : "Compte personnel";
}
