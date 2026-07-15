import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AuthGuard } from "../auth/guards/auth.guard";
import { successResponse } from "../common/responses/api-response";
import { OrganizationGuard } from "../organizations/organization.guard";
import type { OrganizationRequest } from "../organizations/organizations.types";
import { Roles } from "../organizations/roles.decorator";
import { AiSettingsService } from "./ai-settings.service";
import { UpdateBrandVoiceProfileDto } from "./dto/update-brand-voice-profile.dto";
import { UpsertQualityEvaluationDto } from "./dto/upsert-quality-evaluation.dto";

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

  @Get("quality")
  async getQualitySummary(@Req() request: OrganizationRequest) {
    return successResponse(
      await this.aiSettingsService.getQualitySummary(
        request.organizationContext,
      ),
    );
  }

  @Post("quality/contents/:contentId")
  @Roles("EDITOR")
  async evaluateContent(
    @Req() request: OrganizationRequest,
    @Param("contentId") contentId: string,
    @Body() dto: UpsertQualityEvaluationDto,
  ) {
    return successResponse({
      evaluation: await this.aiSettingsService.evaluateContent(
        request.user.id,
        request.organizationContext,
        contentId,
        dto,
      ),
    });
  }
}
