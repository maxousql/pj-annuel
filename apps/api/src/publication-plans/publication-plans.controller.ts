import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AuthGuard } from "../auth/guards/auth.guard";
import { successResponse } from "../common/responses/api-response";
import { OrganizationGuard } from "../organizations/organization.guard";
import type { OrganizationRequest } from "../organizations/organizations.types";
import { Roles } from "../organizations/roles.decorator";
import { CreatePublicationPlanDto } from "./dto/create-publication-plan.dto";
import { ListPublicationPlansDto } from "./dto/list-publication-plans.dto";
import { UpdatePublicationPlanDto } from "./dto/update-publication-plan.dto";
import { PublicationPlansService } from "./publication-plans.service";

@Controller("organizations/:organizationSlug/publication-plans")
@UseGuards(AuthGuard, OrganizationGuard)
export class PublicationPlansController {
  constructor(
    private readonly publicationPlansService: PublicationPlansService,
  ) {}

  @Get()
  async listPlans(
    @Req() request: OrganizationRequest,
    @Query() query: ListPublicationPlansDto,
  ) {
    const plans = await this.publicationPlansService.listPlans(
      request.organizationContext,
      query,
    );

    return successResponse(plans);
  }

  @Post()
  @Roles("EDITOR")
  async createPlan(
    @Req() request: OrganizationRequest,
    @Body() dto: CreatePublicationPlanDto,
  ) {
    const plan = await this.publicationPlansService.createPlan(
      request.organizationContext,
      dto,
    );

    return successResponse(plan);
  }

  @Patch(":planId")
  @Roles("EDITOR")
  async updatePlan(
    @Req() request: OrganizationRequest,
    @Param("planId") planId: string,
    @Body() dto: UpdatePublicationPlanDto,
  ) {
    const plan = await this.publicationPlansService.updatePlan(
      request.organizationContext,
      planId,
      dto,
    );

    return successResponse(plan);
  }

  @Delete(":planId")
  @Roles("EDITOR")
  async deletePlan(
    @Req() request: OrganizationRequest,
    @Param("planId") planId: string,
  ) {
    await this.publicationPlansService.deletePlan(
      request.organizationContext,
      planId,
    );

    return successResponse({ deleted: true });
  }
}
