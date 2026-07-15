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
import { OrganizationGuard } from "../organizations/organization.guard";
import type { OrganizationRequest } from "../organizations/organizations.types";
import { Roles } from "../organizations/roles.decorator";
import { CurationService } from "./curation.service";
import { AddResourceUrlDto } from "./dto/add-resource-url.dto";
import { AddRssFeedDto } from "./dto/add-rss-feed.dto";
import { UseResourceForGenerationDto } from "./dto/use-resource-for-generation.dto";

@Controller("organizations/:organizationSlug/curation")
@UseGuards(AuthGuard, OrganizationGuard)
export class CurationController {
  constructor(private readonly curationService: CurationService) {}

  @Get()
  async listCuration(@Req() request: OrganizationRequest) {
    const curation = await this.curationService.listCuration(
      request.organizationContext,
    );

    return successResponse(curation);
  }

  @Post("resources")
  @Roles("EDITOR")
  async addResource(
    @Req() request: OrganizationRequest,
    @Body() dto: AddResourceUrlDto,
  ) {
    const resource = await this.curationService.addResourceUrl(
      request.organizationContext,
      dto,
    );

    return successResponse(resource);
  }

  @Get("resources/:resourceId")
  async getResource(
    @Req() request: OrganizationRequest,
    @Param("resourceId") resourceId: string,
  ) {
    return successResponse(
      await this.curationService.getResourceDetail(
        request.organizationContext,
        resourceId,
      ),
    );
  }

  @Post("feeds")
  @Roles("ADMIN")
  async addFeed(
    @Req() request: OrganizationRequest,
    @Body() dto: AddRssFeedDto,
  ) {
    const feed = await this.curationService.addRssFeed(
      request.organizationContext,
      dto,
    );

    return successResponse(feed);
  }

  @Post("feeds/:feedId/import")
  @Roles("ADMIN")
  async importFeed(
    @Req() request: OrganizationRequest,
    @Param("feedId") feedId: string,
  ) {
    const feed = await this.curationService.importFeed(
      request.organizationContext,
      feedId,
    );

    return successResponse(feed);
  }

  @Post("resources/:resourceId/summarize")
  @Roles("EDITOR")
  async summarizeResource(
    @Req() request: OrganizationRequest,
    @Param("resourceId") resourceId: string,
  ) {
    const resource = await this.curationService.summarizeResource(
      request.user.id,
      request.organizationContext,
      resourceId,
    );

    return successResponse(resource);
  }

  @Post("resources/:resourceId/use-for-generation")
  @Roles("EDITOR")
  async useResourceForGeneration(
    @Req() request: OrganizationRequest,
    @Param("resourceId") resourceId: string,
    @Body() dto: UseResourceForGenerationDto,
  ) {
    const generated = await this.curationService.useResourceForGeneration(
      request.user.id,
      request.organizationContext,
      resourceId,
      dto,
    );

    return successResponse(generated);
  }
}
