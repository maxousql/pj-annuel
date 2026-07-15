import { IsString, MaxLength, MinLength, Validate } from "class-validator";

import { PasswordPolicyConstraint } from "../utils/password-policy";

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MaxLength(72)
  @Validate(PasswordPolicyConstraint)
  newPassword!: string;
}
