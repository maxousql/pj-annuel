import {
  Body,
  Controller,
  Get,
  Param,
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
import { CheckHistoryDuplicateDto } from "./dto/check-history-duplicate.dto";
import { ListHistoryDto } from "./dto/list-history.dto";
import { HistoryService } from "./history.service";

@Controller("organizations/:organizationSlug/history")
@UseGuards(AuthGuard, OrganizationGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  async listHistory(
    @Req() request: OrganizationRequest,
    @Query() query: ListHistoryDto,
  ) {
    const history = await this.historyService.listHistory(
      request.organizationContext,
      query,
    );

    return successResponse(history);
  }

  @Post("duplicate-check")
  @Roles("EDITOR")
  async checkDuplicate(
    @Req() request: OrganizationRequest,
    @Body() dto: CheckHistoryDuplicateDto,
  ) {
    const duplicate = await this.historyService.checkDuplicate(
      request.organizationContext,
      dto,
    );

    return successResponse({ duplicate });
  }

  @Get(":itemType/:itemId")
  async getHistoryItem(
    @Req() request: OrganizationRequest,
    @Param("itemType") itemType: string,
    @Param("itemId") itemId: string,
  ) {
    const item = await this.historyService.getHistoryItem(
      request.organizationContext,
      itemType,
      itemId,
    );

    return successResponse(item);
  }
}
