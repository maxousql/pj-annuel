import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { EditorialContextsController } from "./editorial-contexts.controller";
import { EditorialContextsService } from "./editorial-contexts.service";

@Module({
  controllers: [EditorialContextsController],
  exports: [EditorialContextsService],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [EditorialContextsService],
})
export class EditorialContextsModule {}
