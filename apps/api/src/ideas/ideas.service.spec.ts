import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";

import { IdeasService } from "./ideas.service";

describe("IdeasService discovery", () => {
  it("lists the creator's minimal identity and preserves a missing creator", async () => {
    const prisma = createPrismaMock();
    prisma.contentIdea.findMany.mockResolvedValue([
      {
        ...contentIdea(discoveryCandidate(0)),
        createdBy: { id: "user-id", name: "Camille Martin" },
      },
      {
        ...contentIdea(discoveryCandidate(1)),
        createdBy: null,
        id: "idea-without-creator",
      },
    ]);
    const service = new IdeasService(prisma as never, {} as never, {} as never);

    const result = await service.listIdeas(organizationContext());

    expect(result[0]?.createdBy).toEqual({
      id: "user-id",
      name: "Camille Martin",
    });
    expect(result[1]?.createdBy).toBeNull();
    expect(prisma.contentIdea.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          createdBy: { select: { id: true, name: true } },
        }),
      }),
    );
  });

  it("creates an atomic five-card batch with one exploratory proposal", async () => {
    const candidates = Array.from({ length: 5 }, (_, index) =>
      discoveryCandidate(index),
    );
    const prisma = createPrismaMock();
    prisma.ideaDiscoveryCandidate.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(candidates);
    prisma.ideaDiscoveryCandidate.upsert.mockImplementation(
      ({ create }: { create: Record<string, unknown> }) =>
        Promise.resolve({ ...candidates[0], ...create }),
    );
    const contentGenerationService = {
      generateContentIdeas: jest.fn().mockResolvedValue({
        ideas: candidates.map((candidate) => ({
          angle: candidate.angle,
          category: candidate.category,
          justification: candidate.justification,
          recommendedFormat: candidate.recommendedFormat,
          title: candidate.title,
        })),
      }),
    };
    const duplicates = {
      checkDuplicate: jest.fn().mockResolvedValue({
        matchedId: null,
        matchedTitle: null,
        matchedType: null,
        score: 0,
        warning: false,
      }),
    };
    const service = new IdeasService(
      prisma as never,
      contentGenerationService as never,
      duplicates as never,
    );

    const result = await service.generateDiscoveryFeed(
      "user-id",
      organizationContext(),
    );

    expect(result.candidates).toHaveLength(5);
    expect(contentGenerationService.generateContentIdeas).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 5,
        discovery: expect.objectContaining({ explorationCount: 1 }),
        organizationId: "organization-id",
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const createCalls = prisma.ideaDiscoveryCandidate.upsert.mock.calls.map(
      ([call]) => call.create,
    );
    expect(
      createCalls.filter(({ isExploratory }) => isExploratory),
    ).toHaveLength(1);
    expect(createCalls.at(-1)?.isExploratory).toBe(true);
  });

  it("rejects an incomplete discovery batch before persisting candidates", async () => {
    const prisma = createPrismaMock();
    const contentGenerationService = {
      generateContentIdeas: jest.fn().mockResolvedValue({
        ideas: Array.from({ length: 4 }, (_, index) => {
          const candidate = discoveryCandidate(index);
          return {
            angle: candidate.angle,
            category: candidate.category,
            justification: candidate.justification,
            recommendedFormat: candidate.recommendedFormat,
            title: candidate.title,
          };
        }),
      }),
    };
    const service = new IdeasService(
      prisma as never,
      contentGenerationService as never,
      {} as never,
    );

    await expect(
      service.generateDiscoveryFeed("user-id", organizationContext()),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.ideaDiscoveryCandidate.upsert).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a previously presented fingerprint without partial persistence", async () => {
    const candidates = Array.from({ length: 5 }, (_, index) =>
      discoveryCandidate(index),
    );
    const prisma = createPrismaMock();
    prisma.ideaDiscoveryCandidate.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ fingerprint: "existing" }]);
    const contentGenerationService = {
      generateContentIdeas: jest.fn().mockResolvedValue({
        ideas: candidates.map((candidate) => ({
          angle: candidate.angle,
          category: candidate.category,
          justification: candidate.justification,
          recommendedFormat: candidate.recommendedFormat,
          title: candidate.title,
        })),
      }),
    };
    const duplicates = {
      checkDuplicate: jest.fn().mockResolvedValue({
        matchedId: null,
        matchedTitle: null,
        matchedType: null,
        score: 0,
        warning: false,
      }),
    };
    const service = new IdeasService(
      prisma as never,
      contentGenerationService as never,
      duplicates as never,
    );

    await expect(
      service.generateDiscoveryFeed("user-id", organizationContext()),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.ideaDiscoveryCandidate.upsert).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("keeps a LIKE idempotent and creates a single saved idea", async () => {
    const candidate = discoveryCandidate(0);
    const savedIdea = contentIdea(candidate);
    const prisma = createPrismaMock();
    prisma.ideaDiscoveryCandidate.findFirst.mockResolvedValue(candidate);
    prisma.ideaDiscoveryCandidate.findMany.mockResolvedValue([candidate]);
    prisma.ideaDiscoveryFeedback.upsert.mockResolvedValue({
      candidateId: candidate.id,
      reason: null,
      signal: "LIKE",
      userId: "user-id",
    });
    prisma.ideaDiscoveryFeedback.findMany.mockResolvedValue([
      { candidateId: candidate.id, signal: "LIKE" },
    ]);
    prisma.contentIdea.upsert.mockResolvedValue(savedIdea);
    prisma.ideaPreferenceProfile.upsert.mockResolvedValue({
      dislikedCount: 0,
      formatScores: { LINKEDIN_POST: 1 },
      likedCount: 1,
      organizationId: "organization-id",
      resetAt: null,
      themeScores: { IA: 1 },
      updatedAt: new Date("2026-07-15T12:00:00.000Z"),
    });
    prisma.ideaPreferenceProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        dislikedCount: 0,
        formatScores: { LINKEDIN_POST: 1 },
        likedCount: 1,
        organizationId: "organization-id",
        resetAt: null,
        themeScores: { IA: 1 },
        updatedAt: new Date("2026-07-15T12:00:00.000Z"),
      });
    const service = new IdeasService(prisma as never, {} as never, {} as never);

    const result = await service.submitDiscoveryFeedback(
      "user-id",
      organizationContext(),
      candidate.id,
      { signal: "LIKE" },
    );

    expect(result.idea?.status).toBe("SAVED");
    expect(result.profile.preferredThemes).toEqual([{ name: "IA", score: 1 }]);
    expect(prisma.contentIdea.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { discoveryCandidateId: candidate.id },
      }),
    );
    expect(prisma.ideaDiscoveryFeedback.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {},
        where: {
          userId_candidateId: {
            candidateId: candidate.id,
            userId: "user-id",
          },
        },
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });

  it("retries a serialization conflict before returning the canonical idea", async () => {
    const candidate = discoveryCandidate(0);
    const prisma = createPrismaMock();
    prisma.ideaDiscoveryCandidate.findFirst.mockResolvedValue(candidate);
    prisma.ideaDiscoveryCandidate.findMany.mockResolvedValue([candidate]);
    prisma.ideaDiscoveryFeedback.upsert.mockResolvedValue({
      candidateId: candidate.id,
      reason: null,
      signal: "LIKE",
      userId: "user-id",
    });
    prisma.ideaDiscoveryFeedback.findMany.mockResolvedValue([
      { candidateId: candidate.id, reason: null, signal: "LIKE" },
    ]);
    prisma.contentIdea.upsert.mockResolvedValue(contentIdea(candidate));
    prisma.ideaPreferenceProfile.upsert.mockResolvedValue(emptyProfile());
    prisma.$transaction.mockRejectedValueOnce({ code: "P2034" });
    const service = new IdeasService(prisma as never, {} as never, {} as never);

    const result = await service.submitDiscoveryFeedback(
      "user-id",
      organizationContext(),
      candidate.id,
      { signal: "LIKE" },
    );

    expect(result.idea?.id).toBe("saved-idea-id");
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it("rejects a conflicting replay instead of announcing the wrong action", async () => {
    const candidate = discoveryCandidate(0);
    const prisma = createPrismaMock();
    prisma.ideaDiscoveryCandidate.findFirst.mockResolvedValue(candidate);
    prisma.ideaDiscoveryFeedback.upsert.mockResolvedValue({
      candidateId: candidate.id,
      reason: null,
      signal: "SKIP",
      userId: "user-id",
    });
    const service = new IdeasService(prisma as never, {} as never, {} as never);

    await expect(
      service.submitDiscoveryFeedback(
        "user-id",
        organizationContext(),
        candidate.id,
        { signal: "LIKE" },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.contentIdea.upsert).not.toHaveBeenCalled();
  });

  it("keeps SKIP neutral when rebuilding the preference profile", async () => {
    const candidate = discoveryCandidate(0);
    const prisma = createPrismaMock();
    prisma.ideaDiscoveryCandidate.findFirst.mockResolvedValue(candidate);
    prisma.ideaDiscoveryCandidate.findMany.mockResolvedValue([]);
    prisma.ideaDiscoveryFeedback.upsert.mockResolvedValue({
      candidateId: candidate.id,
      reason: null,
      signal: "SKIP",
      userId: "user-id",
    });
    prisma.ideaPreferenceProfile.upsert.mockResolvedValue(emptyProfile());
    const service = new IdeasService(prisma as never, {} as never, {} as never);

    const result = await service.submitDiscoveryFeedback(
      "user-id",
      organizationContext(),
      candidate.id,
      { signal: "SKIP" },
    );

    expect(result.idea).toBeNull();
    expect(prisma.ideaDiscoveryFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ signal: { in: ["LIKE", "DISLIKE"] } }),
      }),
    );
    expect(prisma.contentIdea.upsert).not.toHaveBeenCalled();
  });

  it("uses a qualified refusal only for the preference it describes", async () => {
    const candidate = discoveryCandidate(0);
    const prisma = createPrismaMock();
    prisma.ideaDiscoveryCandidate.findFirst.mockResolvedValue(candidate);
    prisma.ideaDiscoveryCandidate.findMany.mockResolvedValue([candidate]);
    prisma.ideaDiscoveryFeedback.upsert.mockResolvedValue({
      candidateId: candidate.id,
      reason: "WRONG_FORMAT",
      signal: "DISLIKE",
      userId: "user-id",
    });
    prisma.ideaDiscoveryFeedback.findMany.mockResolvedValue([
      {
        candidateId: candidate.id,
        reason: "WRONG_FORMAT",
        signal: "DISLIKE",
      },
    ]);
    prisma.ideaPreferenceProfile.upsert.mockResolvedValue(emptyProfile());
    const service = new IdeasService(prisma as never, {} as never, {} as never);

    await service.submitDiscoveryFeedback(
      "user-id",
      organizationContext(),
      candidate.id,
      { reason: "WRONG_FORMAT", signal: "DISLIKE" },
    );

    expect(prisma.ideaPreferenceProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          formatScores: { LINKEDIN_POST: -1 },
          themeScores: {},
        }),
      }),
    );
  });

  it("rejects cross-organization candidates and invalid qualified feedback", async () => {
    const prisma = createPrismaMock();
    prisma.ideaDiscoveryCandidate.findFirst.mockResolvedValue(null);
    const service = new IdeasService(prisma as never, {} as never, {} as never);

    await expect(
      service.submitDiscoveryFeedback(
        "user-id",
        organizationContext(),
        "another-organization-candidate",
        { signal: "LIKE" },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.submitDiscoveryFeedback(
        "user-id",
        organizationContext(),
        "candidate-id",
        { reason: "NOT_NOW", signal: "LIKE" },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("resets learned weights without deleting feedback history", async () => {
    const prisma = createPrismaMock();
    prisma.ideaPreferenceProfile.upsert.mockResolvedValue(emptyProfile());
    const service = new IdeasService(prisma as never, {} as never, {} as never);

    const profile = await service.resetDiscoveryPreferences(
      organizationContext(),
    );

    expect(profile.learnedSignals).toBe(0);
    expect(prisma.ideaPreferenceProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          dislikedCount: 0,
          formatScores: {},
          likedCount: 0,
          themeScores: {},
        }),
      }),
    );
    expect(prisma.ideaDiscoveryFeedback.deleteMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });
});

function createPrismaMock() {
  const prisma = {
    $transaction: jest.fn(),
    contentIdea: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    },
    contentItem: { findMany: jest.fn().mockResolvedValue([]) },
    ideaDiscoveryCandidate: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    },
    ideaDiscoveryFeedback: {
      deleteMany: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    },
    ideaPreferenceProfile: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    },
  };
  prisma.$transaction.mockImplementation(
    (operation: unknown[] | ((client: typeof prisma) => unknown)) =>
      Array.isArray(operation)
        ? Promise.all(operation)
        : Promise.resolve(operation(prisma)),
  );
  return prisma;
}

function discoveryCandidate(index: number) {
  return {
    angle: `Un angle éditorial suffisamment détaillé ${index}`,
    category: "IA",
    createdAt: new Date(`2026-07-15T12:0${index}:00.000Z`),
    duplicateMatchedId: null,
    duplicateMatchedTitle: null,
    duplicateScore: 0,
    duplicateSource: null,
    duplicateWarning: false,
    id: `candidate-${index}`,
    isExploratory: index === 4,
    justification: `Une justification éditoriale pertinente ${index}`,
    organizationId: "organization-id",
    recommendedFormat: "LINKEDIN_POST" as const,
    title: `Idée personnalisée ${index}`,
  };
}

function contentIdea(candidate: ReturnType<typeof discoveryCandidate>) {
  return {
    angle: candidate.angle,
    archivedAt: null,
    category: candidate.category,
    createdAt: new Date("2026-07-15T12:00:00.000Z"),
    createdBy: null,
    id: "saved-idea-id",
    justification: candidate.justification,
    organizationId: candidate.organizationId,
    recommendedFormat: candidate.recommendedFormat,
    status: "SAVED" as const,
    title: candidate.title,
    updatedAt: new Date("2026-07-15T12:00:00.000Z"),
  };
}

function emptyProfile() {
  return {
    dislikedCount: 0,
    formatScores: {},
    likedCount: 0,
    organizationId: "organization-id",
    resetAt: new Date("2026-07-15T12:00:00.000Z"),
    themeScores: {},
    updatedAt: new Date("2026-07-15T12:00:00.000Z"),
  };
}

function organizationContext() {
  return {
    membership: {
      id: "membership-id",
      role: "EDITOR" as const,
      status: "ACTIVE" as const,
    },
    organization: {
      createdAt: new Date("2026-07-15T12:00:00.000Z").toISOString(),
      id: "organization-id",
      name: "Organisation",
      ownerId: "owner-id",
      role: "EDITOR" as const,
      slug: "organisation",
    },
  };
}
