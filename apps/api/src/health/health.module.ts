import { Module } from "@nestjs/common";

import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { DatabaseModule } from "../database/database.module";

@Module({
  controllers: [HealthController],
  imports: [DatabaseModule],
  providers: [HealthService],
})
export class HealthModule {}
