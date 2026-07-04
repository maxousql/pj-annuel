import { Transform } from "class-transformer";
import { IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateLibraryTagDto {
  @Transform(trimString)
  @IsString()
  @Length(2, 48)
  name!: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;
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
