import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import {
  CONTENT_FORMATS,
  CONTENT_IDEA_STATUSES,
  CONTENT_ITEM_STATUSES,
  HISTORY_ITEM_TYPES,
} from "@content-ai/shared";

import type {
  ContentFormat,
  ContentIdeaStatus,
  ContentItemStatus,
  HistoryItemType,
} from "@content-ai/shared";

const HISTORY_STATUSES = [
  ...CONTENT_IDEA_STATUSES,
  ...CONTENT_ITEM_STATUSES,
] as const;

type HistoryStatus = ContentIdeaStatus | ContentItemStatus;

export class ListHistoryDto {
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  query?: string;

  @IsIn(HISTORY_ITEM_TYPES)
  @IsOptional()
  type?: HistoryItemType;

  @IsIn(CONTENT_FORMATS)
  @IsOptional()
  format?: ContentFormat;

  @IsIn(HISTORY_STATUSES)
  @IsOptional()
  status?: HistoryStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  pageSize?: number;
}

function trimOptionalString({ value }: { value: unknown }) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
