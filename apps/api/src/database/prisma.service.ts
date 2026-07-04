import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

const TEST_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/postgres";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly shouldConnectOnInit: boolean;

  constructor(configService: ConfigService) {
    const configuredDatabaseUrl = configService.get<string>("DATABASE_URL");
    const databaseUrl =
      configuredDatabaseUrl ??
      (process.env.NODE_ENV === "test" ? TEST_DATABASE_URL : undefined);

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required to start the API.");
    }

    const hasConfiguredDatabaseUrl = Boolean(configuredDatabaseUrl);

    super({
      adapter: new PrismaPg({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes("supabase.co")
          ? { rejectUnauthorized: false }
          : undefined,
      }),
    });

    this.shouldConnectOnInit = hasConfiguredDatabaseUrl;
  }

  async onModuleInit(): Promise<void> {
    if (this.shouldConnectOnInit) {
      await this.$connect();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
