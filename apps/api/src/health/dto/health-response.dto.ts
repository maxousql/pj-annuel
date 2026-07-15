import type {
  ApiResponse,
  HealthPayload,
  ReadinessPayload,
} from "@content-ai/shared";

export class HealthDataDto implements HealthPayload {
  status!: "ok";
  service!: "api";
  uptime!: number;
  timestamp!: string;
  version!: string;
}

export type HealthResponseDto = ApiResponse<HealthDataDto>;

export class ReadinessDataDto
  extends HealthDataDto
  implements ReadinessPayload
{
  dependencies!: { database: "ok"; migration: string };
}

export type ReadinessResponseDto = ApiResponse<ReadinessDataDto>;
