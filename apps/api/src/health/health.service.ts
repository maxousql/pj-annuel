import { Injectable } from "@nestjs/common";

import type { HealthDataDto } from "./dto/health-response.dto";

@Injectable()
export class HealthService {
  getHealth(): HealthDataDto {
    return {
      service: "api",
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? "0.1.0",
    };
  }
}
