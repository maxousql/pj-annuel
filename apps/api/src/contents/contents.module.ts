import { Module } from "@nestjs/common";

import { AiModule } from "../ai/ai.module";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { HistoryModule } from "../history/history.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { ContentsController } from "./contents.controller";
import { ContentsService } from "./contents.service";

@Module({
  controllers: [ContentsController],
  imports: [
    AiModule,
    AuthModule,
    DatabaseModule,
    HistoryModule,
    OrganizationsModule,
  ],
  providers: [ContentsService],
})
export class ContentsModule {}
