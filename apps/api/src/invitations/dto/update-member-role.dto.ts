import { IsIn } from "class-validator";
import type { OrganizationRole } from "@content-ai/shared";
import { ORGANIZATION_ROLES } from "@content-ai/shared";

export class UpdateMemberRoleDto {
  @IsIn(ORGANIZATION_ROLES)
  role!: OrganizationRole;
}
