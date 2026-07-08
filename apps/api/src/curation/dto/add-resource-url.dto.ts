import { Transform } from "class-transformer";
import { IsArray, IsOptional, IsString, IsUrl, Length } from "class-validator";

export class AddResourceUrlDto {
  @Transform(trimString)
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  url!: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Length(2, 120)
  topic?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagNames?: string[];
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
