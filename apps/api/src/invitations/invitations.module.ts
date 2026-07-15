import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { InvitationEmailService } from "./invitation-email.service";
import {
  InvitationAcceptanceController,
  InvitationManagementController,
} from "./invitations.controller";
import { InvitationsService } from "./invitations.service";

@Module({
  controllers: [InvitationAcceptanceController, InvitationManagementController],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [InvitationEmailService, InvitationsService],
})
export class InvitationsModule {}
