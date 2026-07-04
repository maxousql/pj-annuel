import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
} from "class-validator";
import { CONTENT_FORMATS, CONTENT_ITEM_STATUSES } from "@content-ai/shared";

import type { ContentFormat, ContentItemStatus } from "@content-ai/shared";

export class UpdateLibraryContentDto {
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(2, 160)
  title?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(10, 12000)
  body?: string;

  @IsIn(CONTENT_FORMATS)
  @IsOptional()
  format?: ContentFormat;

  @IsIn(CONTENT_ITEM_STATUSES)
  @IsOptional()
  status?: ContentItemStatus;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(2, 160)
  topic?: string;

  @Transform(trimNullableOptionalString)
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsUUID()
  categoryId?: string | null;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(2, 80)
  categoryName?: string;

  @IsArray()
  @ArrayMaxSize(12)
  @IsUUID(undefined, { each: true })
  @IsOptional()
  tagIds?: string[];
}

function trimOptionalString({ value }: { value: unknown }) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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
