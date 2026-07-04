import { Transform } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from "class-validator";
import { PUBLICATION_CHANNELS, PUBLICATION_STATUSES } from "@content-ai/shared";

import type { PublicationChannel, PublicationStatus } from "@content-ai/shared";

export class CreatePublicationPlanDto {
  @IsUUID()
  contentId!: string;

  @IsIn(PUBLICATION_CHANNELS)
  channel!: PublicationChannel;

  @IsDateString()
  scheduledAt!: string;

  @IsIn(PUBLICATION_STATUSES)
  @IsOptional()
  status?: PublicationStatus;

  @Transform(trimNullableOptionalString)
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string | null;
}

function trimNullableOptionalString({ value }: { value: unknown }) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
