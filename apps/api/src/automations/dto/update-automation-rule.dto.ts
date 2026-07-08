import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import {
  AUTOMATION_RULE_STATUSES,
  AUTOMATION_RULE_TYPES,
} from "@content-ai/shared";

import type {
  AutomationRuleStatus,
  AutomationRuleType,
} from "@content-ai/shared";

export class AutomationRuleTypeParamDto {
  @IsIn(AUTOMATION_RULE_TYPES)
  type!: AutomationRuleType;
}

export class UpdateAutomationRuleDto {
  @IsIn(AUTOMATION_RULE_STATUSES)
  @IsOptional()
  status?: AutomationRuleStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  @IsOptional()
  reminderHoursBefore?: number;
}
