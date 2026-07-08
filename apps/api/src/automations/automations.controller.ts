import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { AutomationRuleType } from "@content-ai/shared";

import { AuthGuard } from "../auth/guards/auth.guard";
import { successResponse } from "../common/responses/api-response";
import { OrganizationGuard } from "../organizations/organization.guard";
import type { OrganizationRequest } from "../organizations/organizations.types";
import { Roles } from "../organizations/roles.decorator";
import { AutomationsService } from "./automations.service";
import { UpdateAutomationRuleDto } from "./dto/update-automation-rule.dto";
import { UpdateNotificationPreferencesDto } from "./dto/update-notification-preferences.dto";
import { UpdateRecommendationStatusDto } from "./dto/update-recommendation-status.dto";

@Controller("organizations/:organizationSlug/automations")
@UseGuards(AuthGuard, OrganizationGuard)
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get()
  async getState(@Req() request: OrganizationRequest) {
    const state = await this.automationsService.getState(
      request.user.id,
      request.organizationContext,
    );

    return successResponse(state);
  }

  @Put("rules/:type")
  @Roles("ADMIN")
  async updateRule(
    @Req() request: OrganizationRequest,
    @Param("type") type: AutomationRuleType,
    @Body() dto: UpdateAutomationRuleDto,
  ) {
    const rule = await this.automationsService.updateRule(
      request.organizationContext,
      type,
      dto,
    );

    return successResponse({ rule });
  }

  @Put("preferences")
  async updatePreferences(
    @Req() request: OrganizationRequest,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const preferences = await this.automationsService.updatePreferences(
      request.user.id,
      request.organizationContext,
      dto,
    );

    return successResponse({ preferences });
  }

  @Post("jobs/publication-reminders")
  @Roles("ADMIN")
  async processPublicationReminders(@Req() request: OrganizationRequest) {
    const result = await this.automationsService.processPublicationReminders(
      request.organizationContext,
    );

    return successResponse(result);
  }

  @Post("jobs/recommendations")
  @Roles("EDITOR")
  async generateRecommendations(@Req() request: OrganizationRequest) {
    const result = await this.automationsService.generateRecommendations(
      request.organizationContext,
    );

    return successResponse(result);
  }

  @Patch("notifications/read-all")
  async markAllNotificationsAsRead(@Req() request: OrganizationRequest) {
    const result = await this.automationsService.markAllNotificationsAsRead(
      request.user.id,
      request.organizationContext,
    );

    return successResponse(result);
  }

  @Patch("notifications/:notificationId/read")
  async markNotificationAsRead(
    @Req() request: OrganizationRequest,
    @Param("notificationId") notificationId: string,
  ) {
    const notification = await this.automationsService.markNotificationAsRead(
      request.user.id,
      request.organizationContext,
      notificationId,
    );

    return successResponse({ notification });
  }

  @Patch("recommendations/:recommendationId/status")
  @Roles("EDITOR")
  async updateRecommendationStatus(
    @Req() request: OrganizationRequest,
    @Param("recommendationId") recommendationId: string,
    @Body() dto: UpdateRecommendationStatusDto,
  ) {
    const recommendation =
      await this.automationsService.updateRecommendationStatus(
        request.organizationContext,
        recommendationId,
        dto.status,
      );

    return successResponse({ recommendation });
  }
}
