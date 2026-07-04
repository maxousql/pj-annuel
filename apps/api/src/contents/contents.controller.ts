import {
  Body,
  Controller,
  Get,
  Param,
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
import { ContentsService } from "./contents.service";
import { GenerateContentDto } from "./dto/generate-content.dto";
import { SaveContentDto } from "./dto/save-content.dto";
import { UpdateContentDto } from "./dto/update-content.dto";

@Controller("organizations/:organizationSlug/contents")
@UseGuards(AuthGuard, OrganizationGuard)
export class ContentsController {
  constructor(private readonly contentsService: ContentsService) {}

  @Get()
  async listContents(@Req() request: OrganizationRequest) {
    const contents = await this.contentsService.listContents(
      request.organizationContext,
    );

    return successResponse({ contents });
  }

  @Get("source-ideas")
  async listSourceIdeas(@Req() request: OrganizationRequest) {
    const ideas = await this.contentsService.listSourceIdeas(
      request.organizationContext,
    );

    return successResponse({ ideas });
  }

  @Post("generate")
  @Roles("EDITOR")
  async generateContent(
    @Req() request: OrganizationRequest,
    @Body() dto: GenerateContentDto,
  ) {
    const generatedContent = await this.contentsService.generateDraft(
      request.user.id,
      request.organizationContext,
      dto,
    );

    return successResponse(generatedContent);
  }

  @Post()
  @Roles("EDITOR")
  async saveContent(
    @Req() request: OrganizationRequest,
    @Body() dto: SaveContentDto,
  ) {
    const content = await this.contentsService.saveContent(
      request.user.id,
      request.organizationContext,
      dto,
    );

    return successResponse(content);
  }

  @Get(":contentId")
  async getContent(
    @Req() request: OrganizationRequest,
    @Param("contentId") contentId: string,
  ) {
    const content = await this.contentsService.getContent(
      request.organizationContext,
      contentId,
    );

    return successResponse({ content });
  }

  @Patch(":contentId")
  @Roles("EDITOR")
  async updateContent(
    @Req() request: OrganizationRequest,
    @Param("contentId") contentId: string,
    @Body() dto: UpdateContentDto,
  ) {
    const content = await this.contentsService.updateContent(
      request.organizationContext,
      contentId,
      dto,
    );

    return successResponse(content);
  }
}
