import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AuthGuard } from "../auth/guards/auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { successResponse } from "../common/responses/api-response";
import { OrganizationGuard } from "../organizations/organization.guard";
import type { OrganizationRequest } from "../organizations/organizations.types";
import { Roles } from "../organizations/roles.decorator";
import { UpsertEditorialContextDto } from "../editorial-contexts/dto/upsert-editorial-context.dto";
import { OnboardingService } from "./onboarding.service";

@Controller("onboarding")
@UseGuards(AuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  async getState(
    @Req() request: AuthenticatedRequest,
    @Query("organizationSlug") organizationSlug?: string,
  ) {
    const state = await this.onboardingService.getState(
      request.user.id,
      organizationSlug,
    );

    return successResponse(state);
  }

  @Put("organizations/:organizationSlug/editorial-context")
  @Roles("EDITOR")
  @UseGuards(OrganizationGuard)
  async saveEditorialContext(
    @Req() request: OrganizationRequest,
    @Body() dto: UpsertEditorialContextDto,
  ) {
    const state = await this.onboardingService.saveEditorialContext(
      request.user.id,
      request.organizationContext,
      dto,
    );

    return successResponse(state);
  }

  @Post("organizations/:organizationSlug/complete")
  @Roles("EDITOR")
  @UseGuards(OrganizationGuard)
  async completeOnboarding(@Req() request: OrganizationRequest) {
    const state = await this.onboardingService.completeOnboarding(
      request.user.id,
      request.organizationContext,
    );

    return successResponse(state);
  }
}
