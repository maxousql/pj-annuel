import { Transform, Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from "class-validator";
import { CONTENT_FORMATS, CONTENT_ITEM_STATUSES } from "@content-ai/shared";

import type { ContentFormat, ContentItemStatus } from "@content-ai/shared";

export class ListLibraryContentsDto {
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

  @IsIn(CONTENT_ITEM_STATUSES)
  @IsOptional()
  status?: ContentItemStatus;

  @IsIn(CONTENT_FORMATS)
  @IsOptional()
  format?: ContentFormat;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsUUID()
  tagId?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(2, 160)
  category?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(2, 120)
  query?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;
}

function trimOptionalString({ value }: { value: unknown }) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
