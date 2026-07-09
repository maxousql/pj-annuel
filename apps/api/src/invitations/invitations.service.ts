import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  InvitationMutationPayload,
  InvitationPreviewPayload,
  InvitationsPayload,
  InvitationSummaryPayload,
  MemberMutationPayload,
  MembershipSummary,
  OrganizationRole,
} from "@content-ai/shared";
import { createHash, randomBytes } from "node:crypto";

import { PrismaService } from "../database/prisma.service";
import type { Prisma } from "../generated/prisma/client";
import type { ActiveOrganizationContext } from "../organizations/organizations.types";
import type { CreateInvitationDto } from "./dto/create-invitation.dto";
import { InvitationEmailService } from "./invitation-email.service";

@Injectable()
export class InvitationsService {
  private readonly invitationTtlDays: number;
  private readonly frontendOrigin: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: InvitationEmailService,
    configService: ConfigService,
  ) {
    this.invitationTtlDays = normalizeTtlDays(
      configService.get<string>("INVITATION_TTL_DAYS"),
    );
    this.frontendOrigin = resolveFrontendOrigin(
      configService.get<string>("FRONTEND_URL"),
    );
  }

  async list(
    organizationContext: ActiveOrganizationContext,
  ): Promise<InvitationsPayload> {
    const organizationId = organizationContext.organization.id;
    const now = new Date();

    await this.prisma.invitation.updateMany({
      data: { status: "EXPIRED" },
      where: {
        expiresAt: { lt: now },
        organizationId,
        status: "PENDING",
      },
    });

    const [invitations, memberships] = await Promise.all([
      this.prisma.invitation.findMany({
        orderBy: { createdAt: "desc" },
        where: { organizationId },
      }),
      this.prisma.membership.findMany({
        include: { user: true },
        orderBy: { createdAt: "asc" },
        where: { organizationId },
      }),
    ]);

    return {
      invitations: invitations.map(toInvitationPayload),
      members: memberships.map(toMemberPayload),
    };
  }

  async create(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    input: CreateInvitationDto,
  ): Promise<InvitationMutationPayload> {
    const organizationId = organizationContext.organization.id;
    await this.assertNotAlreadyMember(organizationId, input.email);

    const inviter = await this.prisma.user.findUnique({
      select: { name: true },
      where: { id: userId },
    });
    const token = createOpaqueToken();
    const expiresAt = this.createExpiry();
    const invitation = await this.prisma.invitation.upsert({
      create: {
        email: input.email,
        expiresAt,
        invitedById: userId,
        organizationId,
        role: input.role,
        tokenHash: hashToken(token),
      },
      update: {
        acceptedAt: null,
        expiresAt,
        invitedById: userId,
        role: input.role,
        status: "PENDING",
        tokenHash: hashToken(token),
      },
      where: { organizationId_email: { email: input.email, organizationId } },
    });
    const invitationUrl = this.buildInvitationUrl(token);

    await this.emailService.sendInvitation({
      email: input.email,
      expiresAt,
      invitationUrl,
      inviterName: inviter?.name ?? "Un administrateur",
      organizationName: organizationContext.organization.name,
      role: input.role,
    });
    await this.writeAudit(
      organizationId,
      userId,
      "MEMBER_INVITED",
      invitation.id,
      {
        email: input.email,
        role: input.role,
      },
    );

    return {
      invitation: toInvitationPayload(invitation),
      ...(process.env.NODE_ENV === "production"
        ? {}
        : { previewUrl: invitationUrl }),
    };
  }

  async resend(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    invitationId: string,
  ): Promise<InvitationMutationPayload> {
    const organizationId = organizationContext.organization.id;
    const existing = await this.findInvitation(organizationId, invitationId);

    if (existing.status === "ACCEPTED" || existing.status === "REVOKED") {
      throw new ConflictException(
        "Cette invitation ne peut plus etre relancee.",
      );
    }

    await this.assertNotAlreadyMember(organizationId, existing.email);
    const inviter = await this.prisma.user.findUnique({
      select: { name: true },
      where: { id: userId },
    });
    const token = createOpaqueToken();
    const expiresAt = this.createExpiry();
    const invitationUrl = this.buildInvitationUrl(token);

    await this.emailService.sendInvitation({
      email: existing.email,
      expiresAt,
      invitationUrl,
      inviterName: inviter?.name ?? "Un administrateur",
      organizationName: organizationContext.organization.name,
      role: existing.role,
    });
    const invitation = await this.prisma.$transaction(
      async (transaction) => {
        const updated = await transaction.invitation.updateMany({
          data: {
            expiresAt,
            invitedById: userId,
            status: "PENDING",
            tokenHash: hashToken(token),
          },
          where: {
            id: existing.id,
            organizationId,
            status: { in: ["PENDING", "EXPIRED"] },
            tokenHash: existing.tokenHash,
          },
        });

        if (updated.count !== 1) {
          throw new ConflictException(
            "Cette invitation a ete modifiee. Rechargez la liste.",
          );
        }

        const refreshed = await transaction.invitation.findUniqueOrThrow({
          where: { id: existing.id },
        });
        await transaction.organizationAuditLog.create({
          data: {
            action: "INVITATION_RESENT",
            actorUserId: userId,
            organizationId,
            targetId: existing.id,
            targetType: "INVITATION",
          },
        });
        return refreshed;
      },
      { isolationLevel: "Serializable" },
    );

    return {
      invitation: toInvitationPayload(invitation),
      ...(process.env.NODE_ENV === "production"
        ? {}
        : { previewUrl: invitationUrl }),
    };
  }

  async revoke(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    invitationId: string,
  ): Promise<InvitationSummaryPayload> {
    const organizationId = organizationContext.organization.id;
    const updated = await this.prisma.$transaction(
      async (transaction) => {
        const invitation = await transaction.invitation.findFirst({
          where: { id: invitationId, organizationId },
        });

        if (!invitation) throw new NotFoundException("Invitation introuvable.");
        const now = new Date();
        const revoked = await transaction.invitation.updateMany({
          data: { status: "REVOKED" },
          where: {
            expiresAt: { gt: now },
            id: invitation.id,
            organization: { deletedAt: null },
            organizationId,
            status: "PENDING",
            tokenHash: invitation.tokenHash,
          },
        });

        if (revoked.count !== 1) {
          throw new ConflictException(
            "Seule une invitation en attente et non expiree peut etre revoquee.",
          );
        }

        await transaction.organizationAuditLog.create({
          data: {
            action: "INVITATION_REVOKED",
            actorUserId: userId,
            organizationId,
            targetId: invitation.id,
            targetType: "INVITATION",
          },
        });
        return transaction.invitation.findUniqueOrThrow({
          where: { id: invitation.id },
        });
      },
      { isolationLevel: "Serializable" },
    );

    return toInvitationPayload(updated);
  }

  async preview(token: string): Promise<InvitationPreviewPayload> {
    const invitation = await this.findByToken(token);
    const status = resolveInvitationStatus(
      invitation.status,
      invitation.expiresAt,
    );

    if (status === "EXPIRED" && invitation.status === "PENDING") {
      await this.prisma.invitation.updateMany({
        data: { status: "EXPIRED" },
        where: {
          expiresAt: { lte: new Date() },
          id: invitation.id,
          status: "PENDING",
          tokenHash: invitation.tokenHash,
        },
      });
    }

    return {
      email: maskEmail(invitation.email),
      expiresAt: invitation.expiresAt.toISOString(),
      organizationName: invitation.organization.name,
      organizationSlug: invitation.organization.slug,
      role: invitation.role,
      status,
    };
  }

  async accept(
    userId: string,
    token: string,
  ): Promise<{ organizationSlug: string }> {
    const organizationSlug = await this.prisma.$transaction(
      async (transaction) => {
        const invitation = await transaction.invitation.findFirst({
          include: {
            organization: { select: { deletedAt: true, slug: true } },
          },
          where: {
            tokenHash: hashToken(token),
            organization: { deletedAt: null },
          },
        });

        if (!invitation || invitation.organization.deletedAt) {
          throw new NotFoundException("Invitation introuvable ou invalide.");
        }

        if (invitation.status !== "PENDING") {
          throw new ConflictException("Cette invitation n'est plus valide.");
        }

        const now = new Date();
        if (invitation.expiresAt.getTime() <= now.getTime()) {
          throw new ConflictException("Cette invitation a expire.");
        }

        const user = await transaction.user.findUnique({
          select: { email: true },
          where: { id: userId },
        });

        if (
          !user ||
          user.email.toLowerCase() !== invitation.email.toLowerCase()
        ) {
          throw new ForbiddenException(
            "Connectez-vous avec l'adresse email qui a recu l'invitation.",
          );
        }

        const consumed = await transaction.invitation.updateMany({
          data: { acceptedAt: now, status: "ACCEPTED" },
          where: {
            expiresAt: { gt: now },
            id: invitation.id,
            organization: { deletedAt: null },
            status: "PENDING",
            tokenHash: hashToken(token),
          },
        });

        if (consumed.count !== 1) {
          throw new ConflictException("Cette invitation a deja ete utilisee.");
        }

        const existing = await transaction.membership.findUnique({
          where: {
            userId_organizationId: {
              organizationId: invitation.organizationId,
              userId,
            },
          },
        });

        if (existing?.status === "ACTIVE") {
          throw new ConflictException(
            "Vous appartenez deja a cette organisation.",
          );
        }

        await transaction.membership.upsert({
          create: {
            organizationId: invitation.organizationId,
            role: invitation.role,
            status: "ACTIVE",
            userId,
          },
          update: { role: invitation.role, status: "ACTIVE" },
          where: {
            userId_organizationId: {
              organizationId: invitation.organizationId,
              userId,
            },
          },
        });
        await transaction.organizationAuditLog.create({
          data: {
            action: "MEMBER_JOINED",
            actorUserId: userId,
            organizationId: invitation.organizationId,
            targetId: userId,
            targetType: "MEMBER",
          },
        });
        return invitation.organization.slug;
      },
      { isolationLevel: "Serializable" },
    );

    return { organizationSlug };
  }

  async updateMemberRole(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    membershipId: string,
    role: OrganizationRole,
  ): Promise<MemberMutationPayload> {
    const organizationId = organizationContext.organization.id;
    const updated = await this.prisma.$transaction(
      async (transaction) => {
        await this.lockOrganization(transaction, organizationId);
        const membership = await this.findMembershipWithClient(
          transaction,
          organizationId,
          membershipId,
        );

        if (membership.role === "ADMIN" && role !== "ADMIN") {
          await this.assertAnotherAdminWithClient(
            transaction,
            organizationId,
            membership.id,
          );
        }

        const changed = await transaction.membership.update({
          data: { role },
          include: { user: true },
          where: { id: membership.id },
        });
        await transaction.organizationAuditLog.create({
          data: {
            action: "MEMBER_ROLE_UPDATED",
            actorUserId: userId,
            metadata: { previousRole: membership.role, role },
            organizationId,
            targetId: membership.id,
            targetType: "MEMBER",
          },
        });
        return changed;
      },
      { isolationLevel: "Serializable" },
    );

    return { member: toMemberPayload(updated) };
  }

  async removeMember(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    membershipId: string,
  ): Promise<void> {
    const organizationId = organizationContext.organization.id;

    await this.prisma.$transaction(
      async (transaction) => {
        await this.lockOrganization(transaction, organizationId);
        const membership = await this.findMembershipWithClient(
          transaction,
          organizationId,
          membershipId,
        );

        if (membership.role === "ADMIN") {
          await this.assertAnotherAdminWithClient(
            transaction,
            organizationId,
            membership.id,
          );
        }

        await transaction.membership.delete({ where: { id: membership.id } });
        await transaction.organizationAuditLog.create({
          data: {
            action: "MEMBER_REMOVED",
            actorUserId: userId,
            organizationId,
            targetId: membership.id,
            targetType: "MEMBER",
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  }

  private async assertNotAlreadyMember(
    organizationId: string,
    email: string,
  ): Promise<void> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        organizationId,
        status: "ACTIVE",
        user: { email: { equals: email, mode: "insensitive" } },
      },
    });

    if (membership) {
      throw new ConflictException("Cette personne est deja membre.");
    }
  }

  private async assertAnotherAdminWithClient(
    client: Prisma.TransactionClient,
    organizationId: string,
    excludedMembershipId: string,
  ): Promise<void> {
    const otherAdmins = await client.membership.count({
      where: {
        id: { not: excludedMembershipId },
        organizationId,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    if (otherAdmins === 0) {
      throw new ConflictException(
        "Le dernier administrateur ne peut pas etre retrograde ou retire.",
      );
    }
  }

  private async findInvitation(organizationId: string, invitationId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organizationId },
    });

    if (!invitation) {
      throw new NotFoundException("Invitation introuvable.");
    }

    return invitation;
  }

  private async findByToken(token: string) {
    const invitation = await this.prisma.invitation.findFirst({
      include: { organization: { select: { name: true, slug: true } } },
      where: {
        organization: { deletedAt: null },
        tokenHash: hashToken(token),
      },
    });

    if (!invitation) {
      throw new NotFoundException("Invitation introuvable ou invalide.");
    }

    return invitation;
  }

  private async findMembershipWithClient(
    client: Prisma.TransactionClient,
    organizationId: string,
    membershipId: string,
  ) {
    const membership = await client.membership.findFirst({
      include: { user: true },
      where: { id: membershipId, organizationId, status: "ACTIVE" },
    });

    if (!membership) {
      throw new NotFoundException("Membre introuvable.");
    }

    return membership;
  }

  private async lockOrganization(
    client: Prisma.TransactionClient,
    organizationId: string,
  ): Promise<void> {
    const rows = await client.$queryRawUnsafe<Array<{ id: string }>>(
      "SELECT id FROM public.organizations WHERE id = $1::uuid AND deleted_at IS NULL FOR UPDATE",
      organizationId,
    );

    if (rows.length !== 1) {
      throw new NotFoundException("Organisation introuvable.");
    }
  }

  private createExpiry(): Date {
    return new Date(Date.now() + this.invitationTtlDays * 24 * 60 * 60 * 1_000);
  }

  private buildInvitationUrl(token: string): string {
    return `${this.frontendOrigin}/invite/${encodeURIComponent(token)}`;
  }

  private async writeAudit(
    organizationId: string,
    actorUserId: string,
    action: string,
    targetId: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.prisma.organizationAuditLog.create({
      data: {
        action,
        actorUserId,
        metadata: { ...metadata } as never,
        organizationId,
        targetId,
        targetType:
          action.includes("INVITATION") || action === "MEMBER_INVITED"
            ? "INVITATION"
            : "MEMBER",
      },
    });
  }
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toInvitationPayload(invitation: {
  createdAt: Date;
  email: string;
  expiresAt: Date;
  id: string;
  role: OrganizationRole;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
}): InvitationSummaryPayload {
  return {
    createdAt: invitation.createdAt.toISOString(),
    email: invitation.email,
    expiresAt: invitation.expiresAt.toISOString(),
    id: invitation.id,
    role: invitation.role,
    status: resolveInvitationStatus(invitation.status, invitation.expiresAt),
  };
}

function toMemberPayload(membership: {
  id: string;
  role: OrganizationRole;
  status: "ACTIVE" | "PENDING" | "DISABLED";
  user: { email: string; id: string; name: string };
}): MembershipSummary {
  return {
    email: membership.user.email,
    id: membership.id,
    name: membership.user.name,
    role: membership.role,
    status: membership.status,
    userId: membership.user.id,
  };
}

export function resolveInvitationStatus(
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED",
  expiresAt: Date,
) {
  return status === "PENDING" && expiresAt.getTime() <= Date.now()
    ? ("EXPIRED" as const)
    : status;
}

function normalizeTtlDays(value?: string): number {
  const parsed = Number(value ?? "7");
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 30 ? parsed : 7;
}

function resolveFrontendOrigin(value?: string): string {
  const candidate = value?.split(",")[0]?.trim() || "http://localhost:3000";

  try {
    return new URL(candidate).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function maskEmail(email: string): string {
  const [localPart = "", domain = ""] = email.split("@");
  return `${localPart.slice(0, 1)}***@${domain}`;
}
