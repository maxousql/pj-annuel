import { AutomationsService, isValidTimezone } from "./automations.service";

describe("automation timezone validation", () => {
  it("accepts IANA timezones and rejects arbitrary values", () => {
    expect(isValidTimezone("Europe/Paris")).toBe(true);
    expect(isValidTimezone("America/Montreal")).toBe(true);
    expect(isValidTimezone("Mars/Olympus")).toBe(false);
  });
});

describe("automation idempotence and isolation", () => {
  it("does not recreate a recommendation after it was dismissed", async () => {
    const prisma = {
      contentIdea: { findMany: jest.fn().mockResolvedValue([]) },
      contentItem: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "content",
            publicationPlans: [],
            title: "Draft",
          },
        ]),
      },
      recommendation: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: "dismissed" }),
      },
    };
    const service = new AutomationsService(prisma as never, {} as never);

    await expect(
      service.generateRecommendations(organizationContext()),
    ).resolves.toEqual({ createdRecommendations: 0 });
    expect(prisma.recommendation.create).not.toHaveBeenCalled();
  });

  it("continues with the next organization when one recommendation run fails", async () => {
    const prisma = {
      automationRule: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { organizationId: "organization-a" },
            { organizationId: "organization-b" },
          ]),
      },
      contentIdea: { findMany: jest.fn().mockResolvedValue([]) },
      contentItem: {
        findMany: jest.fn(({ where }: { where: { organizationId: string } }) =>
          where.organizationId === "organization-a"
            ? Promise.reject(new Error("broken tenant"))
            : Promise.resolve([
                { id: "content-b", publicationPlans: [], title: "Draft B" },
              ]),
        ),
      },
      recommendation: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const jobs = {
      runOncePerBucket: jest.fn(
        async (
          _key: string,
          _bucket: number,
          handler: () => Promise<unknown>,
        ) => ({ acquired: true, result: await handler() }),
      ),
    };
    const service = new AutomationsService(prisma as never, jobs as never);

    await (
      service as unknown as { runRecommendationJob(): Promise<void> }
    ).runRecommendationJob();

    expect(prisma.recommendation.create).toHaveBeenCalledTimes(1);
    expect(prisma.recommendation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: "organization-b" }),
      }),
    );
  });
});

function organizationContext() {
  return {
    membership: {
      id: "membership",
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
    },
    organization: {
      createdAt: new Date().toISOString(),
      id: "organization",
      name: "Organization",
      ownerId: "admin",
      role: "ADMIN" as const,
      slug: "organization",
    },
  };
}
