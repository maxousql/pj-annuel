import { EXPECTED_DATABASE_MIGRATION, HealthService } from "./health.service";

describe("HealthService readiness", () => {
  it("sets a database statement timeout and verifies the expected migration", async () => {
    const transaction = {
      $executeRawUnsafe: jest.fn().mockResolvedValue(0),
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ migration_ready: true }]),
    };
    const prisma = {
      $transaction: jest.fn(
        async (handler: (client: typeof transaction) => Promise<unknown>) =>
          handler(transaction),
      ),
    };
    const service = new HealthService(prisma as never);

    await expect(service.getReadiness()).resolves.toMatchObject({
      dependencies: {
        database: "ok",
        migration: EXPECTED_DATABASE_MIGRATION,
      },
    });
    expect(transaction.$executeRawUnsafe).toHaveBeenCalledWith(
      "SET LOCAL statement_timeout = '1500ms'",
    );
    expect(transaction.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("public._prisma_migrations"),
      EXPECTED_DATABASE_MIGRATION,
    );
  });

  it("fails readiness when the expected schema migration is absent", async () => {
    const transaction = {
      $executeRawUnsafe: jest.fn().mockResolvedValue(0),
      $queryRawUnsafe: jest
        .fn()
        .mockResolvedValue([{ migration_ready: false }]),
    };
    const prisma = {
      $transaction: jest.fn(
        async (handler: (client: typeof transaction) => Promise<unknown>) =>
          handler(transaction),
      ),
    };

    await expect(
      new HealthService(prisma as never).getReadiness(),
    ).rejects.toMatchObject({ status: 503 });
  });
});
