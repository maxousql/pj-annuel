import { IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class UpsertQualityEvaluationDto {
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @IsString()
  @Length(0, 1_000)
  @IsOptional()
  feedback?: string;
}
