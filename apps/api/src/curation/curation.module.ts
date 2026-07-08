import { Module } from "@nestjs/common";

import { AiModule } from "../ai/ai.module";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { HistoryModule } from "../history/history.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { CurationController } from "./curation.controller";
import { CurationService } from "./curation.service";

@Module({
  controllers: [CurationController],
  imports: [
    AiModule,
    AuthModule,
    DatabaseModule,
    HistoryModule,
    OrganizationsModule,
  ],
  providers: [CurationService],
})
export class CurationModule {}
