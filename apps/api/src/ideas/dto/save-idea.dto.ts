import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, Length } from "class-validator";
import { CONTENT_FORMATS } from "@content-ai/shared";

import type { ContentFormat } from "@content-ai/shared";

export class SaveIdeaDto {
  @Transform(trimString)
  @IsString()
  @Length(2, 180)
  title!: string;

  @Transform(trimString)
  @IsString()
  @Length(10, 1000)
  angle!: string;

  @IsIn(CONTENT_FORMATS)
  recommendedFormat!: ContentFormat;

  @Transform(trimString)
  @IsString()
  @Length(10, 1200)
  justification!: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(2, 160)
  category?: string;
}

export class CheckIdeaDuplicateDto {
  @Transform(trimString)
  @IsString()
  @Length(2, 180)
  title!: string;

  @Transform(trimString)
  @IsString()
  @Length(10, 1000)
  angle!: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(2, 160)
  category?: string;
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
