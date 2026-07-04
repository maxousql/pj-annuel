import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AuthGuard } from "../auth/guards/auth.guard";
import { successResponse } from "../common/responses/api-response";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { OrganizationGuard } from "./organization.guard";
import { OrganizationsService } from "./organizations.service";
import type { OrganizationRequest } from "./organizations.types";
import { Roles } from "./roles.decorator";

@Controller("organizations")
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async listOrganizations(@Req() request: OrganizationRequest) {
    const organizations = await this.organizationsService.listOrganizations(
      request.user.id,
    );

    return successResponse({ organizations });
  }

  @Post()
  async createOrganization(
    @Req() request: OrganizationRequest,
    @Body() dto: CreateOrganizationDto,
  ) {
    const organizationContext =
      await this.organizationsService.createOrganization(request.user.id, dto);

    return successResponse(organizationContext);
  }

  @Get(":organizationSlug")
  @UseGuards(OrganizationGuard)
  getOrganization(@Req() request: OrganizationRequest) {
    return successResponse(request.organizationContext);
  }

  @Post(":organizationSlug/switch")
  @UseGuards(OrganizationGuard)
  switchOrganization(@Req() request: OrganizationRequest) {
    return successResponse(request.organizationContext);
  }

  @Get(":organizationSlug/members")
  @Roles("ADMIN")
  @UseGuards(OrganizationGuard)
  async listMembers(
    @Req() request: OrganizationRequest,
    @Param("organizationSlug") organizationSlug: string,
  ) {
    const members = await this.organizationsService.listMembers(
      organizationSlug,
      request.user.id,
    );

    return successResponse({ members });
  }
}
