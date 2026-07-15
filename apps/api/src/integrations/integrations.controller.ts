import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";

import { AuthGuard } from "../auth/guards/auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { successResponse } from "../common/responses/api-response";
import { OrganizationGuard } from "../organizations/organization.guard";
import type { OrganizationRequest } from "../organizations/organizations.types";
import { Roles } from "../organizations/roles.decorator";
import { SaveNotionMappingDto } from "./dto/save-notion-mapping.dto";
import { IntegrationsService } from "./integrations.service";

@Controller("organizations/:organizationSlug/integrations/notion")
@UseGuards(AuthGuard, OrganizationGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  async getIntegration(@Req() request: OrganizationRequest) {
    return successResponse(
      await this.integrationsService.getNotionIntegration(
        request.organizationContext,
      ),
    );
  }

  @Post("connect")
  @Roles("ADMIN")
  connect(@Req() request: OrganizationRequest) {
    return successResponse({
      authorizationUrl: this.integrationsService.createNotionAuthorizationUrl(
        request.user.id,
        request.organizationContext,
        request.headers.origin,
      ),
    });
  }

  @Delete()
  @Roles("ADMIN")
  async disconnect(@Req() request: OrganizationRequest) {
    await this.integrationsService.disconnectNotion(
      request.user.id,
      request.organizationContext,
    );

    return successResponse({ disconnected: true });
  }

  @Get("databases")
  @Roles("ADMIN")
  async listDatabases(@Req() request: OrganizationRequest) {
    return successResponse({
      databases: await this.integrationsService.listNotionDatabases(
        request.organizationContext,
      ),
    });
  }

  @Post("mapping")
  @Roles("ADMIN")
  async saveMapping(
    @Req() request: OrganizationRequest,
    @Body() dto: SaveNotionMappingDto,
  ) {
    return successResponse({
      mapping: await this.integrationsService.saveNotionMapping(
        request.user.id,
        request.organizationContext,
        dto,
      ),
    });
  }

  @Post("export/contents/:contentId")
  @Roles("EDITOR")
  async exportContent(
    @Req() request: OrganizationRequest,
    @Param("contentId") contentId: string,
  ) {
    return successResponse(
      await this.integrationsService.exportContent(
        request.user.id,
        request.organizationContext,
        contentId,
      ),
    );
  }

  @Post("export/resources/:resourceId")
  @Roles("EDITOR")
  async exportResource(
    @Req() request: OrganizationRequest,
    @Param("resourceId") resourceId: string,
  ) {
    return successResponse(
      await this.integrationsService.exportResource(
        request.user.id,
        request.organizationContext,
        resourceId,
      ),
    );
  }

  @Post("sync")
  @Roles("EDITOR")
  async sync(@Req() request: OrganizationRequest) {
    return successResponse(
      await this.integrationsService.syncNotion(
        request.user.id,
        request.organizationContext,
      ),
    );
  }
}

@Controller("integrations/notion")
@UseGuards(AuthGuard)
export class NotionOAuthController {
  private readonly frontendOrigin: string;

  constructor(
    private readonly integrationsService: IntegrationsService,
    configService: ConfigService,
  ) {
    this.frontendOrigin = resolveFrontendOrigin(
      configService.get<string>("FRONTEND_URL"),
    );
  }

  @Get("callback")
  async callback(
    @Req() request: AuthenticatedRequest,
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") oauthError: string | undefined,
    @Res() response: Response,
  ) {
    if (!code || !state || oauthError) {
      response.redirect(`${this.frontendOrigin}/app?notion=error`);
      return;
    }

    try {
      const result = await this.integrationsService.completeNotionOAuth(
        request.user.id,
        code,
        state,
      );
      response.redirect(
        `${result.frontendOrigin}/app/${encodeURIComponent(
          result.organizationSlug,
        )}/integrations?notion=connected`,
      );
    } catch {
      response.redirect(`${this.frontendOrigin}/app?notion=error`);
    }
  }
}

function resolveFrontendOrigin(value?: string): string {
  const candidate = value?.split(",")[0]?.trim() || "http://localhost:3000";

  try {
    return new URL(candidate).origin;
  } catch {
    return "http://localhost:3000";
  }
}
