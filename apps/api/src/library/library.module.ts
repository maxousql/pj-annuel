import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { LibraryController } from "./library.controller";
import { LibraryService } from "./library.service";

@Module({
  controllers: [LibraryController],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [LibraryService],
})
export class LibraryModule {}
