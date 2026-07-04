import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PublicationPlansController } from "./publication-plans.controller";
import { PublicationPlansService } from "./publication-plans.service";

@Module({
  controllers: [PublicationPlansController],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [PublicationPlansService],
})
export class PublicationPlansModule {}
