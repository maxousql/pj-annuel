import {
  Body,
  Controller,
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
import { CreateLibraryCategoryDto } from "./dto/create-library-category.dto";
import { CreateLibraryTagDto } from "./dto/create-library-tag.dto";
import { ListLibraryContentsDto } from "./dto/list-library-contents.dto";
import { UpdateLibraryContentDto } from "./dto/update-library-content.dto";
import { LibraryService } from "./library.service";

@Controller("organizations/:organizationSlug/library")
@UseGuards(AuthGuard, OrganizationGuard)
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get()
  async listContents(
    @Req() request: OrganizationRequest,
    @Query() query: ListLibraryContentsDto,
  ) {
    const library = await this.libraryService.listContents(
      request.organizationContext,
      query,
    );

    return successResponse(library);
  }

  @Get(":contentId")
  async getContent(
    @Req() request: OrganizationRequest,
    @Param("contentId") contentId: string,
  ) {
    const content = await this.libraryService.getContent(
      request.organizationContext,
      contentId,
    );

    return successResponse(content);
  }

  @Patch(":contentId")
  @Roles("EDITOR")
  async updateContent(
    @Req() request: OrganizationRequest,
    @Param("contentId") contentId: string,
    @Body() dto: UpdateLibraryContentDto,
  ) {
    const content = await this.libraryService.updateContent(
      request.organizationContext,
      contentId,
      dto,
    );

    return successResponse(content);
  }

  @Patch(":contentId/archive")
  @Roles("ADMIN")
  async archiveContent(
    @Req() request: OrganizationRequest,
    @Param("contentId") contentId: string,
  ) {
    const content = await this.libraryService.archiveContent(
      request.organizationContext,
      contentId,
    );

    return successResponse(content);
  }

  @Patch(":contentId/restore")
  @Roles("ADMIN")
  async restoreContent(
    @Req() request: OrganizationRequest,
    @Param("contentId") contentId: string,
  ) {
    const content = await this.libraryService.restoreContent(
      request.organizationContext,
      contentId,
    );

    return successResponse(content);
  }

  @Post("tags")
  @Roles("EDITOR")
  async createTag(
    @Req() request: OrganizationRequest,
    @Body() dto: CreateLibraryTagDto,
  ) {
    const tag = await this.libraryService.createTag(
      request.organizationContext,
      dto,
    );

    return successResponse({ tag });
  }

  @Post("categories")
  @Roles("EDITOR")
  async createCategory(
    @Req() request: OrganizationRequest,
    @Body() dto: CreateLibraryCategoryDto,
  ) {
    const category = await this.libraryService.createCategory(
      request.organizationContext,
      dto,
    );

    return successResponse({ category });
  }
}
