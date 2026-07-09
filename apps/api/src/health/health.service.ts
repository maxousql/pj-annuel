import { Injectable, ServiceUnavailableException } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service";
import type {
  HealthDataDto,
  ReadinessDataDto,
} from "./dto/health-response.dto";

export const EXPECTED_DATABASE_MIGRATION = "20260710120000_review_hardening";

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth(): HealthDataDto {
    return {
      service: "api",
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? "0.1.0",
    };
  }

  async getReadiness(): Promise<ReadinessDataDto> {
    const expectedMigration =
      process.env.EXPECTED_DATABASE_MIGRATION ?? EXPECTED_DATABASE_MIGRATION;

    try {
      await withTimeout(
        this.prisma.$transaction(
          async (transaction) => {
            await transaction.$executeRawUnsafe(
              "SET LOCAL statement_timeout = '1500ms'",
            );
            const rows = await transaction.$queryRawUnsafe<
              Array<{ migration_ready: boolean }>
            >(
              `select exists (
                select 1 from public._prisma_migrations
                where migration_name = $1
                  and finished_at is not null
                  and rolled_back_at is null
              ) as migration_ready`,
              expectedMigration,
            );

            if (rows[0]?.migration_ready !== true) {
              throw new Error("Expected database migration is missing.");
            }
          },
          { maxWait: 1_000, timeout: 2_000 },
        ),
        2_200,
      );
    } catch {
      throw new ServiceUnavailableException({
        code: "READINESS_FAILED",
        message: "La base de donnees n'est pas disponible.",
      });
    }

    return {
      ...this.getHealth(),
      dependencies: { database: "ok", migration: expectedMigration },
    };
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Database readiness timeout")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
