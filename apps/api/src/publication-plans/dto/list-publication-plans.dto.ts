import { IsDateString, IsIn, IsOptional } from "class-validator";
import { PUBLICATION_CHANNELS, PUBLICATION_STATUSES } from "@content-ai/shared";

import type { PublicationChannel, PublicationStatus } from "@content-ai/shared";

export class ListPublicationPlansDto {
  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;

  @IsIn(PUBLICATION_CHANNELS)
  @IsOptional()
  channel?: PublicationChannel;

  @IsIn(PUBLICATION_STATUSES)
  @IsOptional()
  status?: PublicationStatus;
}
