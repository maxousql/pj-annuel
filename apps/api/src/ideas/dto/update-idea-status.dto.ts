import { IsIn } from "class-validator";
import { CONTENT_IDEA_STATUSES } from "@content-ai/shared";

import type { ContentIdeaStatus } from "@content-ai/shared";

export class UpdateIdeaStatusDto {
  @IsIn(CONTENT_IDEA_STATUSES)
  status!: ContentIdeaStatus;
}
