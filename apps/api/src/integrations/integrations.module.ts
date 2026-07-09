import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { IntegrationEncryptionService } from "./integration-encryption.service";
import {
  IntegrationsController,
  NotionOAuthController,
} from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";
import { NotionAdapter } from "./notion/notion.adapter";

@Module({
  controllers: [IntegrationsController, NotionOAuthController],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [IntegrationEncryptionService, IntegrationsService, NotionAdapter],
})
export class IntegrationsModule {}
