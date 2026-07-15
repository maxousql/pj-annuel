import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { hostname } from "node:os";

import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ScheduledJobsService {
  private readonly instanceId = `${hostname()}:${process.pid}:${randomUUID()}`;

  constructor(private readonly prisma: PrismaService) {}

  async runOncePerBucket<TResult>(
    jobKey: string,
    bucketMilliseconds: number,
    handler: () => Promise<TResult>,
  ): Promise<{ acquired: false } | { acquired: true; result: TResult }> {
    const bucketAt = new Date(
      Math.floor(Date.now() / bucketMilliseconds) * bucketMilliseconds,
    );
    return this.executeWithLease(
      jobKey,
      bucketAt,
      Math.max(bucketMilliseconds * 2, 60_000),
      handler,
    );
  }

  async runWithLease<TResult>(
    jobKey: string,
    leaseMilliseconds: number,
    handler: () => Promise<TResult>,
  ): Promise<{ acquired: false } | { acquired: true; result: TResult }> {
    return this.executeWithLease(
      jobKey,
      new Date(),
      Math.max(leaseMilliseconds, 5_000),
      handler,
    );
  }

  private async executeWithLease<TResult>(
    jobKey: string,
    bucketAt: Date,
    leaseMilliseconds: number,
    handler: () => Promise<TResult>,
  ): Promise<{ acquired: false } | { acquired: true; result: TResult }> {
    const now = new Date();
    await this.prisma.scheduledJobRun.updateMany({
      data: {
        error: "Lease expired before completion",
        finishedAt: now,
        status: "FAILED",
      },
      where: {
        jobKey,
        leaseExpiresAt: { lte: now },
        status: "RUNNING",
      },
    });
    let run: { id: string };

    try {
      run = await this.prisma.scheduledJobRun.create({
        data: {
          bucketAt,
          instanceId: this.instanceId,
          jobKey,
          leaseExpiresAt: new Date(now.getTime() + leaseMilliseconds),
        },
        select: { id: true },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return { acquired: false };
      }

      throw error;
    }

    const heartbeat = setInterval(
      () => {
        void this.prisma.scheduledJobRun
          .updateMany({
            data: {
              leaseExpiresAt: new Date(Date.now() + leaseMilliseconds),
            },
            where: {
              id: run.id,
              instanceId: this.instanceId,
              status: "RUNNING",
            },
          })
          .catch(() => undefined);
      },
      Math.max(1_000, Math.floor(leaseMilliseconds / 3)),
    );
    heartbeat.unref?.();

    try {
      const result = await handler();
      await this.prisma.scheduledJobRun.update({
        data: { finishedAt: new Date(), status: "SUCCEEDED" },
        where: { id: run.id },
      });
      return { acquired: true, result };
    } catch (error) {
      await this.prisma.scheduledJobRun.update({
        data: {
          error: error instanceof Error ? error.name : "Job failed",
          finishedAt: new Date(),
          status: "FAILED",
        },
        where: { id: run.id },
      });
      throw error;
    } finally {
      clearInterval(heartbeat);
    }
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
