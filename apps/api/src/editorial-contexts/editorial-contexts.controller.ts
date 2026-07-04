import { Body, Controller, Get, Put, Req, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/guards/auth.guard";
import { successResponse } from "../common/responses/api-response";
import { OrganizationGuard } from "../organizations/organization.guard";
import type { OrganizationRequest } from "../organizations/organizations.types";
import { Roles } from "../organizations/roles.decorator";
import { UpsertEditorialContextDto } from "./dto/upsert-editorial-context.dto";
import { EditorialContextsService } from "./editorial-contexts.service";

@Controller("organizations/:organizationSlug/editorial-context")
@UseGuards(AuthGuard, OrganizationGuard)
export class EditorialContextsController {
  constructor(
    private readonly editorialContextsService: EditorialContextsService,
  ) {}

  @Get()
  async getEditorialContext(@Req() request: OrganizationRequest) {
    const editorialContext = await this.editorialContextsService.getContext(
      request.organizationContext,
    );

    return successResponse({ editorialContext });
  }

  @Put()
  @Roles("EDITOR")
  async upsertEditorialContext(
    @Req() request: OrganizationRequest,
    @Body() dto: UpsertEditorialContextDto,
  ) {
    const editorialContext = await this.editorialContextsService.upsertContext(
      request.user.id,
      request.organizationContext,
      dto,
    );

    return successResponse({ editorialContext });
  }

  @Get("summary")
  async getEditorialContextSummary(@Req() request: OrganizationRequest) {
    const summary = await this.editorialContextsService.getSummary(
      request.organizationContext,
    );

    return successResponse({ summary });
  }
}
