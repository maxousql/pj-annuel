import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "./config/environment.validation";

import { AiModule } from "./ai/ai.module";
import { AiSettingsModule } from "./ai-settings/ai-settings.module";
import { AutomationsModule } from "./automations/automations.module";
import { AuthModule } from "./auth/auth.module";
import { ContentsModule } from "./contents/contents.module";
import { ScheduledJobsModule } from "./common/jobs/scheduled-jobs.module";
import { CurationModule } from "./curation/curation.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DatabaseModule } from "./database/database.module";
import { EditorialContextsModule } from "./editorial-contexts/editorial-contexts.module";
import { HealthModule } from "./health/health.module";
import { HistoryModule } from "./history/history.module";
import { IdeasModule } from "./ideas/ideas.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { InvitationsModule } from "./invitations/invitations.module";
import { LibraryModule } from "./library/library.module";
import { OnboardingModule } from "./onboarding/onboarding.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { PublicationPlansModule } from "./publication-plans/publication-plans.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [".env.local", ".env", "../../.env.local", "../../.env"],
      ignoreEnvFile: process.env.NODE_ENV === "test",
      isGlobal: true,
      validate: validateEnvironment,
    }),
    AiModule,
    AiSettingsModule,
    AutomationsModule,
    AuthModule,
    ContentsModule,
    ScheduledJobsModule,
    CurationModule,
    DashboardModule,
    DatabaseModule,
    EditorialContextsModule,
    HealthModule,
    HistoryModule,
    IdeasModule,
    IntegrationsModule,
    InvitationsModule,
    LibraryModule,
    OnboardingModule,
    OrganizationsModule,
    PublicationPlansModule,
  ],
})
export class AppModule {}
