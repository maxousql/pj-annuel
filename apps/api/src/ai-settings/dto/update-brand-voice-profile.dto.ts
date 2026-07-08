import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";
import {
  GENERATION_LANGUAGES,
  GENERATION_TARGET_LENGTHS,
} from "@content-ai/shared";

import type {
  GenerationLanguage,
  GenerationTargetLength,
} from "@content-ai/shared";

export class UpdateBrandVoiceProfileDto {
  @IsIn(GENERATION_LANGUAGES)
  @IsOptional()
  language?: GenerationLanguage;

  @Transform(trimOptionalString)
  @IsString()
  @Length(0, 2000)
  @IsOptional()
  toneRules?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  examples?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  forbiddenTerms?: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  creativity?: number;

  @IsIn(GENERATION_TARGET_LENGTHS)
  @IsOptional()
  targetLength?: GenerationTargetLength;
}

function trimOptionalString({ value }: { value: unknown }) {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
}
