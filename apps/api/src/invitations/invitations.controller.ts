import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AuthGuard } from "../auth/guards/auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { successResponse } from "../common/responses/api-response";
import { OrganizationGuard } from "../organizations/organization.guard";
import type { OrganizationRequest } from "../organizations/organizations.types";
import { Roles } from "../organizations/roles.decorator";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { UpdateMemberRoleDto } from "./dto/update-member-role.dto";
import { InvitationsService } from "./invitations.service";

@Controller("organizations/:organizationSlug")
@Roles("ADMIN")
@UseGuards(AuthGuard, OrganizationGuard)
export class InvitationManagementController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get("team")
  async list(@Req() request: OrganizationRequest) {
    return successResponse(
      await this.invitationsService.list(request.organizationContext),
    );
  }

  @Post("invitations")
  async create(
    @Req() request: OrganizationRequest,
    @Body() dto: CreateInvitationDto,
  ) {
    return successResponse(
      await this.invitationsService.create(
        request.user.id,
        request.organizationContext,
        dto,
      ),
    );
  }

  @Post("invitations/:invitationId/resend")
  async resend(
    @Req() request: OrganizationRequest,
    @Param("invitationId") invitationId: string,
  ) {
    return successResponse(
      await this.invitationsService.resend(
        request.user.id,
        request.organizationContext,
        invitationId,
      ),
    );
  }

  @Delete("invitations/:invitationId")
  async revoke(
    @Req() request: OrganizationRequest,
    @Param("invitationId") invitationId: string,
  ) {
    return successResponse({
      invitation: await this.invitationsService.revoke(
        request.user.id,
        request.organizationContext,
        invitationId,
      ),
    });
  }

  @Patch("members/:membershipId/role")
  async updateMemberRole(
    @Req() request: OrganizationRequest,
    @Param("membershipId") membershipId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return successResponse(
      await this.invitationsService.updateMemberRole(
        request.user.id,
        request.organizationContext,
        membershipId,
        dto.role,
      ),
    );
  }

  @Delete("members/:membershipId")
  async removeMember(
    @Req() request: OrganizationRequest,
    @Param("membershipId") membershipId: string,
  ) {
    await this.invitationsService.removeMember(
      request.user.id,
      request.organizationContext,
      membershipId,
    );

    return successResponse({ removed: true });
  }
}

@Controller("invitations")
export class InvitationAcceptanceController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get(":token")
  async preview(@Param("token") token: string) {
    return successResponse(await this.invitationsService.preview(token));
  }

  @Post(":token/accept")
  @UseGuards(AuthGuard)
  async accept(
    @Req() request: AuthenticatedRequest,
    @Param("token") token: string,
  ) {
    return successResponse(
      await this.invitationsService.accept(request.user.id, token),
    );
  }
}
