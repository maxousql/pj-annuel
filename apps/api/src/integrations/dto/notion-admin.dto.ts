import { IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class ProvisionNotionDatabaseDto {
  @IsBoolean()
  confirmed!: boolean;

  @IsString()
  @IsNotEmpty()
  parentPageId!: string;
}

export class RepairNotionDatabaseDto {
  @IsBoolean()
  confirmed!: boolean;
}
