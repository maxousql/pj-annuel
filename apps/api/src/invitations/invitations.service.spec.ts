import { ConflictException } from "@nestjs/common";

import {
  createOpaqueToken,
  hashToken,
  InvitationsService,
  resolveInvitationStatus,
} from "./invitations.service";

describe("InvitationsService", () => {
  it("creates opaque tokens and only persists their deterministic hash", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();

    expect(first).not.toEqual(second);
    expect(first).toHaveLength(43);
    expect(hashToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(first)).toEqual(hashToken(first));
    expect(hashToken(first)).not.toContain(first);
  });

  it("treats an elapsed pending invitation as expired", () => {
    expect(
      resolveInvitationStatus("PENDING", new Date(Date.now() - 1_000)),
    ).toBe("EXPIRED");
    expect(
      resolveInvitationStatus("PENDING", new Date(Date.now() + 10_000)),
    ).toBe("PENDING");
    expect(
      resolveInvitationStatus("REVOKED", new Date(Date.now() - 1_000)),
    ).toBe("REVOKED");
  });

  it("refuses to demote the last active administrator", async () => {
    const transaction = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ id: "organization" }]),
      organizationAuditLog: { create: jest.fn() },
      membership: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue({
          id: "membership-admin",
          role: "ADMIN",
          status: "ACTIVE",
          user: { email: "admin@example.com", id: "user-admin", name: "Admin" },
        }),
        update: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (handler: (client: typeof transaction) => Promise<unknown>) =>
          handler(transaction),
      ),
    };
    const service = new InvitationsService(
      prisma as never,
      {} as never,
      { get: jest.fn().mockReturnValue(undefined) } as never,
    );

    await expect(
      service.updateMemberRole(
        "user-admin",
        {
          membership: {
            id: "membership-admin",
            role: "ADMIN",
            status: "ACTIVE",
          },
          organization: {
            createdAt: new Date().toISOString(),
            id: "organization",
            name: "Organisation",
            ownerId: "user-admin",
            role: "ADMIN",
            slug: "organisation",
          },
        },
        "membership-admin",
        "EDITOR",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.membership.update).not.toHaveBeenCalled();
  });

  it("keeps the previous resend token valid when email delivery fails", async () => {
    const existing = {
      email: "invitee@example.com",
      id: "invitation",
      role: "EDITOR",
      status: "PENDING",
      tokenHash: "previous-hash",
    };
    const prisma = {
      $transaction: jest.fn(),
      invitation: { findFirst: jest.fn().mockResolvedValue(existing) },
      membership: { findFirst: jest.fn().mockResolvedValue(null) },
      user: { findUnique: jest.fn().mockResolvedValue({ name: "Admin" }) },
    };
    const emailService = {
      sendInvitation: jest.fn().mockRejectedValue(new Error("email failed")),
    };
    const service = new InvitationsService(
      prisma as never,
      emailService as never,
      { get: jest.fn().mockReturnValue(undefined) } as never,
    );

    await expect(
      service.resend("admin", organizationContext("admin"), "invitation"),
    ).rejects.toThrow("email failed");

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(existing.tokenHash).toBe("previous-hash");
  });

  it("serializes concurrent admin demotions so one administrator remains", async () => {
    const roles = new Map([
      ["admin-a", "ADMIN"],
      ["admin-b", "ADMIN"],
    ]);
    const transaction = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ id: "organization" }]),
      organizationAuditLog: { create: jest.fn().mockResolvedValue({}) },
      membership: {
        count: jest.fn(
          async ({ where }: { where: { id: { not: string } } }) =>
            [...roles].filter(
              ([id, role]) => id !== where.id.not && role === "ADMIN",
            ).length,
        ),
        findFirst: jest.fn(async ({ where }: { where: { id: string } }) => ({
          id: where.id,
          role: roles.get(where.id),
          status: "ACTIVE",
          user: {
            email: `${where.id}@example.com`,
            id: where.id,
            name: where.id,
          },
        })),
        update: jest.fn(
          async ({
            data,
            where,
          }: {
            data: { role: string };
            where: { id: string };
          }) => {
            roles.set(where.id, data.role);
            return {
              id: where.id,
              role: data.role,
              status: "ACTIVE",
              user: {
                email: `${where.id}@example.com`,
                id: where.id,
                name: where.id,
              },
            };
          },
        ),
      },
    };
    let tail = Promise.resolve();
    const prisma = {
      $transaction: jest.fn(
        async (handler: (client: typeof transaction) => Promise<unknown>) => {
          const previous = tail;
          let release: () => void = () => undefined;
          tail = new Promise<void>((resolve) => {
            release = resolve;
          });
          await previous;
          try {
            return await handler(transaction);
          } finally {
            release();
          }
        },
      ),
    };
    const service = new InvitationsService(
      prisma as never,
      {} as never,
      { get: jest.fn().mockReturnValue(undefined) } as never,
    );

    const outcomes = await Promise.allSettled([
      service.updateMemberRole(
        "admin-a",
        organizationContext("admin-a"),
        "admin-a",
        "EDITOR",
      ),
      service.updateMemberRole(
        "admin-b",
        organizationContext("admin-b"),
        "admin-b",
        "EDITOR",
      ),
    ]);

    expect(
      outcomes.filter((outcome) => outcome.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      outcomes.filter((outcome) => outcome.status === "rejected"),
    ).toHaveLength(1);
    expect([...roles.values()].filter((role) => role === "ADMIN")).toHaveLength(
      1,
    );
  });
});

function organizationContext(userId: string) {
  return {
    membership: {
      id: `membership-${userId}`,
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
    },
    organization: {
      createdAt: new Date().toISOString(),
      id: "organization",
      name: "Organisation",
      ownerId: userId,
      role: "ADMIN" as const,
      slug: "organisation",
    },
  };
}
