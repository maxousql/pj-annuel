import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";
import { CONTENT_FORMATS, HISTORY_ITEM_TYPES } from "@content-ai/shared";

import type { ContentFormat, HistoryItemType } from "@content-ai/shared";

export class CheckHistoryDuplicateDto {
  @IsIn(HISTORY_ITEM_TYPES)
  targetType!: HistoryItemType;

  @Transform(trimString)
  @IsString()
  @Length(2, 180)
  title!: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(2, 12000)
  text?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(2, 160)
  topic?: string;

  @IsIn(CONTENT_FORMATS)
  @IsOptional()
  format?: ContentFormat;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsUUID()
  excludedId?: string;
}

function trimString({ value }: { value: unknown }) {
  return typeof value === "string" ? value.trim() : value;
}

function trimOptionalString({ value }: { value: unknown }) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
