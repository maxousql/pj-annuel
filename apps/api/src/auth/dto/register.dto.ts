import { Transform } from "class-transformer";
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  Validate,
} from "class-validator";

import { PasswordPolicyConstraint } from "../utils/password-policy";

export class RegisterDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @IsString()
  @Validate(PasswordPolicyConstraint)
  password!: string;
}
