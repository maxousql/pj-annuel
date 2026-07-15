import { IsIn, IsOptional } from "class-validator";
import {
  IDEA_DISCOVERY_REJECTION_REASONS,
  IDEA_DISCOVERY_SIGNALS,
} from "@content-ai/shared";

import type {
  IdeaDiscoveryRejectionReason,
  IdeaDiscoverySignal,
} from "@content-ai/shared";

export class IdeaDiscoveryFeedbackDto {
  @IsIn(IDEA_DISCOVERY_SIGNALS)
  signal!: IdeaDiscoverySignal;

  @IsIn(IDEA_DISCOVERY_REJECTION_REASONS)
  @IsOptional()
  reason?: IdeaDiscoveryRejectionReason;
}
