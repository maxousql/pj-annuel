import { IsBoolean, IsOptional, IsString, Length } from "class-validator";

export class ApplyOnboardingPresetDto {
  @IsString()
  @Length(2, 80)
  presetId!: string;

  @IsBoolean()
  @IsOptional()
  confirmOverwrite?: boolean;
}
