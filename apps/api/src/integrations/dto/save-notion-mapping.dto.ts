import { Type } from "class-transformer";
import { IsIn, IsNotEmpty, IsString, ValidateNested } from "class-validator";
import type { NotionConflictStrategy } from "@content-ai/shared";
import { NOTION_CONFLICT_STRATEGIES } from "@content-ai/shared";

class NotionPropertyMappingDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  status!: string;

  @IsString()
  @IsNotEmpty()
  date!: string;

  @IsString()
  @IsNotEmpty()
  channel!: string;

  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  sourceUrl!: string;
}

export class SaveNotionMappingDto {
  @IsString()
  @IsNotEmpty()
  databaseId!: string;

  @IsString()
  @IsNotEmpty()
  dataSourceId!: string;

  @IsString()
  @IsNotEmpty()
  databaseName!: string;

  @ValidateNested()
  @Type(() => NotionPropertyMappingDto)
  propertyMapping!: NotionPropertyMappingDto;

  @IsIn(NOTION_CONFLICT_STRATEGIES)
  conflictStrategy!: NotionConflictStrategy;
}
