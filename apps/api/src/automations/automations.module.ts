import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { AutomationsController } from "./automations.controller";
import { AutomationsService } from "./automations.service";

@Module({
  controllers: [AutomationsController],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [AutomationsService],
})
export class AutomationsModule {}
