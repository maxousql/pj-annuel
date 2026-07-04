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
import { CONTENT_FORMATS } from "@content-ai/shared";

import type { ContentFormat } from "@content-ai/shared";

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
}

function trimOptionalString({ value }: { value: unknown }) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
