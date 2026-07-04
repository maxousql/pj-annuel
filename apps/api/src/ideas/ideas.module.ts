import { Module } from "@nestjs/common";

import { AiModule } from "../ai/ai.module";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { HistoryModule } from "../history/history.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { IdeasController } from "./ideas.controller";
import { IdeasService } from "./ideas.service";

@Module({
  controllers: [IdeasController],
  imports: [
    AiModule,
    AuthModule,
    DatabaseModule,
    HistoryModule,
    OrganizationsModule,
  ],
  providers: [IdeasService],
})
export class IdeasModule {}
