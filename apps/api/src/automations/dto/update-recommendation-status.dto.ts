import { IsIn } from "class-validator";
import { RECOMMENDATION_STATUSES } from "@content-ai/shared";

import type { RecommendationStatus } from "@content-ai/shared";

export class UpdateRecommendationStatusDto {
  @IsIn(RECOMMENDATION_STATUSES)
  status!: RecommendationStatus;
}
