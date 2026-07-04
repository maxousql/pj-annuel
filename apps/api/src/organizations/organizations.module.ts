import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { OrganizationGuard } from "./organization.guard";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

@Module({
  controllers: [OrganizationsController],
  exports: [OrganizationGuard, OrganizationsService],
  imports: [AuthModule, DatabaseModule],
  providers: [OrganizationsService, OrganizationGuard],
})
export class OrganizationsModule {}
