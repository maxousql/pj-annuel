import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { HistoryController } from "./history.controller";
import { HistoryDuplicatesService } from "./history-duplicates.service";
import { HistoryService } from "./history.service";

@Module({
  controllers: [HistoryController],
  exports: [HistoryDuplicatesService],
  imports: [AuthModule, DatabaseModule, OrganizationsModule],
  providers: [HistoryDuplicatesService, HistoryService],
})
export class HistoryModule {}
