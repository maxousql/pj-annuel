import { ScheduledJobsService } from "./scheduled-jobs.service";

describe("ScheduledJobsService", () => {
  it("executes the handler only after acquiring the database bucket", async () => {
    const prisma = {
      scheduledJobRun: {
        create: jest.fn().mockResolvedValue({ id: "run" }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const service = new ScheduledJobsService(prisma as never);
    const handler = jest.fn().mockResolvedValue("done");

    await expect(
      service.runOncePerBucket("job", 60_000, handler),
    ).resolves.toEqual({
      acquired: true,
      result: "done",
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(prisma.scheduledJobRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCEEDED" }),
      }),
    );
  });

  it("skips a bucket already acquired by another replica", async () => {
    const prisma = {
      scheduledJobRun: {
        create: jest.fn().mockRejectedValue({ code: "P2002" }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const service = new ScheduledJobsService(prisma as never);
    const handler = jest.fn();

    await expect(
      service.runOncePerBucket("job", 60_000, handler),
    ).resolves.toEqual({
      acquired: false,
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not overlap a lease held by a different bucket", async () => {
    const prisma = {
      scheduledJobRun: {
        create: jest.fn().mockRejectedValue({ code: "P2002" }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const service = new ScheduledJobsService(prisma as never);
    const handler = jest.fn();

    await expect(
      service.runWithLease("curation:feed:one", 30_000, handler),
    ).resolves.toEqual({ acquired: false });
    expect(handler).not.toHaveBeenCalled();
    expect(prisma.scheduledJobRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "RUNNING" }),
      }),
    );
  });
});
