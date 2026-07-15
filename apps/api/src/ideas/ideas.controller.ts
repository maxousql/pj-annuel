import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AuthGuard } from "../auth/guards/auth.guard";
import { successResponse } from "../common/responses/api-response";
import { OrganizationGuard } from "../organizations/organization.guard";
import type { OrganizationRequest } from "../organizations/organizations.types";
import { Roles } from "../organizations/roles.decorator";
import { GenerateIdeasDto } from "./dto/generate-ideas.dto";
import { IdeaDiscoveryFeedbackDto } from "./dto/idea-discovery-feedback.dto";
import { CheckIdeaDuplicateDto, SaveIdeaDto } from "./dto/save-idea.dto";
import { UpdateIdeaStatusDto } from "./dto/update-idea-status.dto";
import { IdeasService } from "./ideas.service";

@Controller("organizations/:organizationSlug/ideas")
@UseGuards(AuthGuard, OrganizationGuard)
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @Get()
  async listIdeas(@Req() request: OrganizationRequest) {
    const ideas = await this.ideasService.listIdeas(
      request.organizationContext,
    );

    return successResponse({ ideas });
  }

  @Post("generate")
  @Roles("EDITOR")
  async generateIdeas(
    @Req() request: OrganizationRequest,
    @Body() dto: GenerateIdeasDto,
  ) {
    const ideas = await this.ideasService.generateIdeas(
      request.user.id,
      request.organizationContext,
      dto,
    );

    return successResponse(ideas);
  }

  @Get("discovery")
  @Roles("EDITOR")
  async getDiscoveryFeed(@Req() request: OrganizationRequest) {
    const feed = await this.ideasService.getDiscoveryFeed(
      request.user.id,
      request.organizationContext,
    );

    return successResponse(feed);
  }

  @Post("discovery/generate")
  @Roles("EDITOR")
  async generateDiscoveryFeed(@Req() request: OrganizationRequest) {
    const feed = await this.ideasService.generateDiscoveryFeed(
      request.user.id,
      request.organizationContext,
    );

    return successResponse(feed);
  }

  @Post("discovery/:candidateId/feedback")
  @Roles("EDITOR")
  async submitDiscoveryFeedback(
    @Req() request: OrganizationRequest,
    @Param("candidateId", new ParseUUIDPipe()) candidateId: string,
    @Body() dto: IdeaDiscoveryFeedbackDto,
  ) {
    const result = await this.ideasService.submitDiscoveryFeedback(
      request.user.id,
      request.organizationContext,
      candidateId,
      dto,
    );

    return successResponse(result);
  }

  @Post("discovery/preferences/reset")
  @Roles("EDITOR")
  async resetDiscoveryPreferences(@Req() request: OrganizationRequest) {
    const profile = await this.ideasService.resetDiscoveryPreferences(
      request.organizationContext,
    );

    return successResponse({ profile });
  }

  @Post("duplicate-check")
  @Roles("EDITOR")
  async checkDuplicate(
    @Req() request: OrganizationRequest,
    @Body() dto: CheckIdeaDuplicateDto,
  ) {
    const duplicate = await this.ideasService.checkDuplicate(
      request.organizationContext,
      dto,
    );

    return successResponse({ duplicate });
  }

  @Post()
  @Roles("EDITOR")
  async saveIdea(
    @Req() request: OrganizationRequest,
    @Body() dto: SaveIdeaDto,
  ) {
    const idea = await this.ideasService.saveIdea(
      request.user.id,
      request.organizationContext,
      dto,
    );

    return successResponse(idea);
  }

  @Patch(":ideaId/status")
  @Roles("EDITOR")
  async updateIdeaStatus(
    @Req() request: OrganizationRequest,
    @Param("ideaId") ideaId: string,
    @Body() dto: UpdateIdeaStatusDto,
  ) {
    const idea = await this.ideasService.updateIdeaStatus(
      request.organizationContext,
      ideaId,
      dto,
    );

    return successResponse({ idea });
  }
}
