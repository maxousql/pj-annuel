import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  Length,
} from "class-validator";

export class UpsertEditorialContextDto {
  @Transform(trimString)
  @IsString()
  @Length(2, 120)
  sector!: string;

  @Transform(trimString)
  @IsString()
  @Length(2, 240)
  targetAudience!: string;

  @Transform(trimString)
  @IsString()
  @Length(2, 120)
  tone!: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Length(2, 240)
  positioning?: string;

  @Transform(normalizeThemes)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ArrayUnique((theme: string) => theme.toLowerCase())
  @IsString({ each: true })
  @Length(2, 80, { each: true })
  themes!: string[];

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(2, 1000)
  resourceNotes?: string;
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

function normalizeThemes({ value }: { value: unknown }) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}
