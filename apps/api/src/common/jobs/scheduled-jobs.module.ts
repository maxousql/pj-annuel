import { Global, Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { ScheduledJobsService } from "./scheduled-jobs.service";

@Global()
@Module({
  exports: [ScheduledJobsService],
  imports: [DatabaseModule],
  providers: [ScheduledJobsService],
})
export class ScheduledJobsModule {}
