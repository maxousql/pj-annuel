import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import bcrypt from "bcryptjs";

import { PrismaService } from "../database/prisma.service";
import { AuthService } from "./auth.service";

describe("AuthService account profile", () => {
  it("aggregates only activity attributed to the authenticated user", async () => {
    const prisma = createPrismaMock({
      aiGenerationCount: 7,
      contentItemCount: 2,
      feedbackGroups: [
        { _count: { _all: 3 }, signal: "LIKE" },
        { _count: { _all: 2 }, signal: "DISLIKE" },
        { _count: { _all: 4 }, signal: "SKIP" },
      ],
      generatedIdeaTotal: 8,
      savedIdeaCount: 4,
    });
    const service = createService(prisma);

    await expect(service.getProfile("user-id")).resolves.toEqual({
      credentialsEnabled: true,
      memberships: [
        {
          joinedAt: "2026-01-02T10:00:00.000Z",
          organization: {
            id: "organization-id",
            name: "Content AI",
            slug: "content-ai",
          },
          role: "ADMIN",
        },
      ],
      providers: ["CREDENTIALS", "GOOGLE"],
      stats: {
        aiGenerations: 7,
        contentIdeasGenerated: 8,
        contentIdeasSaved: 4,
        contentItemsCreated: 2,
        discoveryFeedbacks: {
          disliked: 2,
          liked: 3,
          skipped: 4,
        },
      },
      user: {
        avatarUrl: null,
        createdAt: "2026-01-01T10:00:00.000Z",
        email: "user@example.com",
        id: "user-id",
        name: "User Example",
      },
    });

    const activeOrganizationFilter = {
      organizationId: { in: ["organization-id"] },
    };
    expect(prisma.aiGenerationLog.count).toHaveBeenCalledWith({
      where: {
        ...activeOrganizationFilter,
        status: "SUCCEEDED",
        userId: "user-id",
      },
    });
    expect(prisma.contentIdea.count).toHaveBeenCalledWith({
      where: {
        createdById: "user-id",
        ...activeOrganizationFilter,
      },
    });
    expect(prisma.contentItem.count).toHaveBeenCalledWith({
      where: {
        createdById: "user-id",
        deletedAt: null,
        ...activeOrganizationFilter,
      },
    });
    expect(prisma.ideaDiscoveryFeedback.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ...activeOrganizationFilter,
          userId: "user-id",
        },
      }),
    );
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("returns a safe empty profile for an OAuth-only user without an active organization", async () => {
    const prisma = createPrismaMock({
      authAccounts: [{ passwordHash: null, provider: "GOOGLE" }],
      memberships: [],
    });
    const service = createService(prisma);

    const profile = await service.getProfile("user-id");

    expect(profile.credentialsEnabled).toBe(false);
    expect(profile.providers).toEqual(["GOOGLE"]);
    expect(profile.memberships).toEqual([]);
    expect(profile.stats).toEqual({
      aiGenerations: 0,
      contentIdeasGenerated: 0,
      contentIdeasSaved: 0,
      contentItemsCreated: 0,
      discoveryFeedbacks: { disliked: 0, liked: 0, skipped: 0 },
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("refuses a local password change for an OAuth-only account", async () => {
    const prisma = createPrismaMock();
    prisma.authAccount.findFirst.mockResolvedValue(null);
    const service = createService(prisma);

    await expect(
      service.changePassword("user-id", {
        currentPassword: "Password123",
        newPassword: "NewPassword456",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.authAccount.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a concurrent password update instead of silently overwriting it", async () => {
    const prisma = createPrismaMock();
    prisma.authAccount.findFirst.mockResolvedValue({
      id: "account-id",
      passwordHash: bcrypt.hashSync("Password123", 4),
    });
    prisma.authAccount.updateMany.mockResolvedValue({ count: 0 });
    const service = createService(prisma);

    await expect(
      service.changePassword("user-id", {
        currentPassword: "Password123",
        newPassword: "NewPassword456",
      }),
    ).rejects.toThrow("modifié depuis un autre onglet");
  });
});

function createService(prisma: ReturnType<typeof createPrismaMock>) {
  return new AuthService(
    prisma as unknown as PrismaService,
    new ConfigService(),
  );
}

function createPrismaMock(
  overrides: {
    aiGenerationCount?: number;
    authAccounts?: Array<{
      passwordHash: string | null;
      provider: "CREDENTIALS" | "GOOGLE";
    }>;
    contentItemCount?: number;
    feedbackGroups?: Array<{
      _count: { _all: number };
      signal: "LIKE" | "DISLIKE" | "SKIP";
    }>;
    generatedIdeaTotal?: number;
    memberships?: Array<{
      createdAt: Date;
      organization: { id: string; name: string; slug: string };
      role: "ADMIN" | "EDITOR" | "READER";
    }>;
    savedIdeaCount?: number;
  } = {},
) {
  return {
    $queryRaw: jest
      .fn()
      .mockResolvedValue([
        { total: BigInt(overrides.generatedIdeaTotal ?? 0) },
      ]),
    aiGenerationLog: {
      count: jest.fn().mockResolvedValue(overrides.aiGenerationCount ?? 0),
    },
    authAccount: {
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    contentIdea: {
      count: jest.fn().mockResolvedValue(overrides.savedIdeaCount ?? 0),
    },
    contentItem: {
      count: jest.fn().mockResolvedValue(overrides.contentItemCount ?? 0),
    },
    ideaDiscoveryFeedback: {
      groupBy: jest.fn().mockResolvedValue(overrides.feedbackGroups ?? []),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        authAccounts: overrides.authAccounts ?? [
          { passwordHash: "hash", provider: "CREDENTIALS" },
          { passwordHash: null, provider: "GOOGLE" },
        ],
        avatarUrl: null,
        createdAt: new Date("2026-01-01T10:00:00.000Z"),
        deletedAt: null,
        email: "user@example.com",
        id: "user-id",
        memberships: overrides.memberships ?? [
          {
            createdAt: new Date("2026-01-02T10:00:00.000Z"),
            organization: {
              id: "organization-id",
              name: "Content AI",
              slug: "content-ai",
            },
            role: "ADMIN",
          },
        ],
        name: "User Example",
      }),
    },
  };
}
