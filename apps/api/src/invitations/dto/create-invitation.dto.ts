import { Transform } from "class-transformer";
import { IsEmail, IsIn } from "class-validator";
import type { OrganizationRole } from "@content-ai/shared";
import { ORGANIZATION_ROLES } from "@content-ai/shared";

export class CreateInvitationDto {
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsIn(ORGANIZATION_ROLES)
  role!: OrganizationRole;
}
