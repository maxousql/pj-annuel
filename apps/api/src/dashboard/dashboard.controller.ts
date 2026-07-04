import { Controller, Get, Req, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/guards/auth.guard";
import { successResponse } from "../common/responses/api-response";
import { OrganizationGuard } from "../organizations/organization.guard";
import type { OrganizationRequest } from "../organizations/organizations.types";
import { DashboardService } from "./dashboard.service";

@Controller("organizations/:organizationSlug/dashboard")
@UseGuards(AuthGuard, OrganizationGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboardSummary(@Req() request: OrganizationRequest) {
    const dashboard = await this.dashboardService.getSummary(
      request.organizationContext,
    );

    return successResponse(dashboard);
  }
}
