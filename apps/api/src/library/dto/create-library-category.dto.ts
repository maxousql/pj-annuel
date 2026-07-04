import { Transform } from "class-transformer";
import { IsString, Length } from "class-validator";

export class CreateLibraryCategoryDto {
  @Transform(trimString)
  @IsString()
  @Length(2, 80)
  name!: string;
}

function trimString({ value }: { value: unknown }) {
  return typeof value === "string" ? value.trim() : value;
}
