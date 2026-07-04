import { BadRequestException } from "@nestjs/common";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OrganizationScope = {
  organizationId: string;
  userId?: string;
};

export function assertActiveOrganizationId(value: string | undefined): string {
  if (!value || !UUID_PATTERN.test(value)) {
    throw new BadRequestException(
      "A valid active organization id is required.",
    );
  }

  return value;
}

export function organizationScopedWhere<TWhere extends object>(
  scope: OrganizationScope,
  where?: TWhere,
): TWhere & { organizationId: string } {
  return {
    ...(where ?? ({} as TWhere)),
    organizationId: scope.organizationId,
  };
}
