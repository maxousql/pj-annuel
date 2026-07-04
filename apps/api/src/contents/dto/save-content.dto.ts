import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";
import {
  CONTENT_GENERATION_FORMATS,
  CONTENT_SAVE_STATUSES,
} from "@content-ai/shared";

import type {
  ContentGenerationFormat,
  ContentSaveStatus,
} from "@content-ai/shared";

export class SaveContentDto {
  @Transform(trimString)
  @IsString()
  @Length(2, 160)
  title!: string;

  @Transform(trimString)
  @IsString()
  @Length(10, 12000)
  body!: string;

  @IsIn(CONTENT_GENERATION_FORMATS)
  format!: ContentGenerationFormat;

  @IsIn(CONTENT_SAVE_STATUSES)
  @IsOptional()
  status?: ContentSaveStatus;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsUUID()
  ideaId?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(3, 2000)
  brief?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(2, 160)
  topic?: string;
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
