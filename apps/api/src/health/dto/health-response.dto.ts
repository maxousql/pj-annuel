import type { ApiResponse, HealthPayload } from "@content-ai/shared";

export class HealthDataDto implements HealthPayload {
  status!: "ok";
  service!: "api";
  uptime!: number;
  timestamp!: string;
  version!: string;
}

export type HealthResponseDto = ApiResponse<HealthDataDto>;
