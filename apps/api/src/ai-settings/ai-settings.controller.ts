import { Body, Controller, Get, Put, Req, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/guards/auth.guard";
import { successResponse } from "../common/responses/api-response";
import { OrganizationGuard } from "../organizations/organization.guard";
import type { OrganizationRequest } from "../organizations/organizations.types";
import { Roles } from "../organizations/roles.decorator";
import { AiSettingsService } from "./ai-settings.service";
import { UpdateBrandVoiceProfileDto } from "./dto/update-brand-voice-profile.dto";

@Controller("organizations/:organizationSlug/ai-settings")
@UseGuards(AuthGuard, OrganizationGuard)
export class AiSettingsController {
  constructor(private readonly aiSettingsService: AiSettingsService) {}

  @Get()
  async getSettings(@Req() request: OrganizationRequest) {
    const settings = await this.aiSettingsService.getSettings(
      request.organizationContext,
    );

    return successResponse(settings);
  }

  @Put("brand-voice")
  @Roles("ADMIN")
  async updateBrandVoice(
    @Req() request: OrganizationRequest,
    @Body() dto: UpdateBrandVoiceProfileDto,
  ) {
    const profile = await this.aiSettingsService.updateSettings(
      request.organizationContext,
      dto,
    );

    return successResponse({ profile });
  }
}
