import { IsBoolean, IsOptional } from "class-validator";

export class UpdateNotificationPreferencesDto {
  @IsBoolean()
  @IsOptional()
  inAppEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;
}
