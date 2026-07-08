import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { AiSettingsController } from "./ai-settings.controller";
import { AiSettingsService } from "./ai-settings.service";

@Module({
  controllers: [AiSettingsController],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [AiSettingsService],
})
export class AiSettingsModule {}
