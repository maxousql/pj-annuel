import { IsBoolean, IsIn, IsOptional } from "class-validator";
import { ADVANCED_ONBOARDING_STEPS } from "@content-ai/shared";

import type { AdvancedOnboardingStep } from "@content-ai/shared";

export class UpdateOnboardingProgressDto {
  @IsIn(ADVANCED_ONBOARDING_STEPS)
  step!: AdvancedOnboardingStep;

  @IsBoolean()
  @IsOptional()
  completed?: boolean;
}
