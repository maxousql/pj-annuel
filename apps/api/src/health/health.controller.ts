import { Controller, Get } from "@nestjs/common";

import { successResponse } from "../common/responses/api-response";
import type {
  HealthResponseDto,
  ReadinessResponseDto,
} from "./dto/health-response.dto";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): HealthResponseDto {
    return successResponse(this.healthService.getHealth());
  }

  @Get("ready")
  async getReadiness(): Promise<ReadinessResponseDto> {
    return successResponse(await this.healthService.getReadiness());
  }
}
