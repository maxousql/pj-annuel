import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { OrganizationRole } from "@content-ai/shared";

import type { AuthenticatedRequest } from "../auth/auth.types";
import { OrganizationsService } from "./organizations.service";
import { assertRole } from "./permissions";
import { ORGANIZATION_ROLES_KEY } from "./roles.decorator";
import type { OrganizationRequest } from "./organizations.types";

type RequestWithParams = AuthenticatedRequest & {
  organizationContext?: OrganizationRequest["organizationContext"];
  params: Record<string, string | undefined>;
};

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithParams>();
    const organizationSlug =
      request.params.organizationSlug ?? request.params.slug;

    if (!organizationSlug) {
      throw new BadRequestException("Organisation active requise.");
    }

    const organizationContext =
      await this.organizationsService.resolveActiveOrganization(
        request.user.id,
        organizationSlug,
      );
    const roles = this.reflector.getAllAndOverride<OrganizationRole[]>(
      ORGANIZATION_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (roles && roles.length > 0) {
      assertRole(organizationContext.membership.role, roles);
    }

    request.organizationContext = organizationContext;

    return true;
  }
}
