import { AiSettingsService } from "./ai-settings.service";

describe("AiSettingsService quality evaluations", () => {
  it("freezes the evaluated format when an existing score is updated", async () => {
    const prisma = {
      aiQualityEvaluation: {
        upsert: jest.fn().mockResolvedValue({
          contentItemId: "content",
          feedback: null,
          format: "BLOG_ARTICLE",
          score: 4,
          updatedAt: new Date("2026-07-10T00:00:00.000Z"),
        }),
      },
      contentItem: {
        findFirst: jest.fn().mockResolvedValue({
          format: "LINKEDIN_POST",
          id: "content",
        }),
      },
    };
    const service = new AiSettingsService(prisma as never);

    await service.evaluateContent("user", organizationContext(), "content", {
      score: 4,
    });

    expect(prisma.aiQualityEvaluation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ format: "LINKEDIN_POST" }),
        update: { feedback: null, score: 4 },
      }),
    );
  });

  it("excludes evaluations whose linked content was soft-deleted", async () => {
    const prisma = {
      aiQualityEvaluation: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const service = new AiSettingsService(prisma as never);

    await service.getQualitySummary(organizationContext());

    expect(prisma.aiQualityEvaluation.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contentItem: { deletedAt: null, status: { not: "DELETED" } },
        }),
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
