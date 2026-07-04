import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";
import { CONTENT_GENERATION_FORMATS } from "@content-ai/shared";

import type { ContentGenerationFormat } from "@content-ai/shared";

export class GenerateContentDto {
  @IsIn(CONTENT_GENERATION_FORMATS)
  format!: ContentGenerationFormat;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(3, 2000)
  brief?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsUUID()
  ideaId?: string;
}

function trimOptionalString({ value }: { value: unknown }) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
