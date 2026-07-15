import {
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from "class-validator";

const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_BYTES = 72;

@ValidatorConstraint({ name: "PasswordPolicy", async: false })
export class PasswordPolicyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isStrongPassword(value);
  }

  defaultMessage(): string {
    return "Le mot de passe doit contenir au moins 10 caracteres, une lettre et un chiffre, sans dépasser la limite de sécurité.";
  }
}

export function isStrongPassword(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length < MIN_PASSWORD_LENGTH ||
    Buffer.byteLength(value, "utf8") > MAX_PASSWORD_BYTES
  ) {
    return false;
  }

  return /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
