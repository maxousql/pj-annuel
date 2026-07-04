import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AiModule } from "./ai/ai.module";
import { AuthModule } from "./auth/auth.module";
import { ContentsModule } from "./contents/contents.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DatabaseModule } from "./database/database.module";
import { EditorialContextsModule } from "./editorial-contexts/editorial-contexts.module";
import { HealthModule } from "./health/health.module";
import { HistoryModule } from "./history/history.module";
import { IdeasModule } from "./ideas/ideas.module";
import { LibraryModule } from "./library/library.module";
import { OnboardingModule } from "./onboarding/onboarding.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { PublicationPlansModule } from "./publication-plans/publication-plans.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [".env.local", ".env", "../../.env.local", "../../.env"],
      isGlobal: true,
    }),
    AiModule,
    AuthModule,
    ContentsModule,
    DashboardModule,
    DatabaseModule,
    EditorialContextsModule,
    HealthModule,
    HistoryModule,
    IdeasModule,
    LibraryModule,
    OnboardingModule,
    OrganizationsModule,
    PublicationPlansModule,
  ],
})
export class AppModule {}
