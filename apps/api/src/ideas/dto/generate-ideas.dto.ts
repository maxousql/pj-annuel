import { Transform, Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";
import {
  CONTENT_FORMATS,
  GENERATION_LANGUAGES,
  GENERATION_TARGET_LENGTHS,
} from "@content-ai/shared";

import type {
  ContentFormat,
  GenerationLanguage,
  GenerationTargetLength,
} from "@content-ai/shared";

export class GenerateIdeasDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  count?: number;

  @IsIn(CONTENT_FORMATS)
  @IsOptional()
  format?: ContentFormat;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(2, 160)
  topic?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(3, 2000)
  brief?: string;

  @IsIn(GENERATION_LANGUAGES)
  @IsOptional()
  language?: GenerationLanguage;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  creativity?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  toneIntensity?: number;

  @IsIn(GENERATION_TARGET_LENGTHS)
  @IsOptional()
  targetLength?: GenerationTargetLength;
}

function trimOptionalString({ value }: { value: unknown }) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
