import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { OrganizationRole } from "@content-ai/shared";

import { PrismaService } from "../database/prisma.service";
import type {
  ActiveOrganizationContext,
  MembershipSummary,
  OrganizationSummary,
} from "./organizations.types";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrganization(
    userId: string,
    input: { name: string; slug?: string | undefined },
  ): Promise<ActiveOrganizationContext> {
    const name = input.name.trim();
    const baseSlug = input.slug ?? slugify(name);
    const slug = await this.resolveAvailableSlug(baseSlug);

    const organization = await this.prisma.$transaction(async (transaction) => {
      const createdOrganization = await transaction.organization.create({
        data: {
          name,
          ownerId: userId,
          slug,
        },
        select: organizationSelect,
      });

      const membership = await transaction.membership.create({
        data: {
          organizationId: createdOrganization.id,
          role: "ADMIN",
          status: "ACTIVE",
          userId,
        },
        select: membershipSelect,
      });

      return {
        membership,
        organization: createdOrganization,
      };
    });

    return toActiveOrganizationContext(
      organization.organization,
      organization.membership,
    );
  }

  async listOrganizations(userId: string): Promise<OrganizationSummary[]> {
    const memberships = await this.prisma.membership.findMany({
      include: {
        organization: {
          select: organizationSelect,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      where: {
        status: "ACTIVE",
        userId,
        organization: {
          deletedAt: null,
        },
      },
    });

    return memberships.map((membership) => {
      return toOrganizationSummary(membership.organization, membership.role);
    });
  }

  async resolveActiveOrganization(
    userId: string,
    organizationSlug: string,
  ): Promise<ActiveOrganizationContext> {
    const membership = await this.prisma.membership.findFirst({
      include: {
        organization: {
          select: organizationSelect,
        },
      },
      where: {
        organization: {
          deletedAt: null,
          slug: organizationSlug,
        },
        status: "ACTIVE",
        userId,
      },
    });

    if (!membership) {
      throw new ForbiddenException("Organisation inaccessible.");
    }

    return toActiveOrganizationContext(membership.organization, membership);
  }

  async listMembers(
    organizationSlug: string,
    requesterUserId: string,
  ): Promise<MembershipSummary[]> {
    await this.resolveActiveOrganization(requesterUserId, organizationSlug);

    const memberships = await this.prisma.membership.findMany({
      include: {
        user: {
          select: {
            email: true,
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      where: {
        organization: {
          deletedAt: null,
          slug: organizationSlug,
        },
      },
    });

    return memberships.map((membership) => {
      return {
        email: membership.user.email,
        id: membership.id,
        name: membership.user.name,
        role: membership.role,
        status: membership.status,
        userId: membership.user.id,
      };
    });
  }

  private async resolveAvailableSlug(baseSlug: string): Promise<string> {
    const normalizedBaseSlug = slugify(baseSlug);

    if (!normalizedBaseSlug) {
      throw new ConflictException("Slug d'organisation invalide.");
    }

    for (let index = 0; index < 20; index += 1) {
      const candidate =
        index === 0 ? normalizedBaseSlug : `${normalizedBaseSlug}-${index + 1}`;
      const existingOrganization = await this.prisma.organization.findUnique({
        select: {
          id: true,
        },
        where: {
          slug: candidate,
        },
      });

      if (!existingOrganization) {
        return candidate;
      }
    }

    throw new ConflictException("Slug d'organisation deja utilise.");
  }
}

const organizationSelect = {
  createdAt: true,
  id: true,
  name: true,
  ownerId: true,
  slug: true,
} as const;

const membershipSelect = {
  id: true,
  role: true,
  status: true,
} as const;

type OrganizationRecord = {
  createdAt: Date | string;
  id: string;
  name: string;
  ownerId: string;
  slug: string;
};

type MembershipRecord = {
  id: string;
  role: OrganizationRole;
  status: "ACTIVE" | "PENDING" | "DISABLED";
};

function toActiveOrganizationContext(
  organization: OrganizationRecord,
  membership: MembershipRecord,
): ActiveOrganizationContext {
  return {
    membership: {
      id: membership.id,
      role: membership.role,
      status: membership.status,
    },
    organization: toOrganizationSummary(organization, membership.role),
  };
}

function toOrganizationSummary(
  organization: OrganizationRecord,
  role: OrganizationRole,
): OrganizationSummary {
  return {
    createdAt:
      organization.createdAt instanceof Date
        ? organization.createdAt.toISOString()
        : organization.createdAt,
    id: organization.id,
    name: organization.name,
    ownerId: organization.ownerId,
    role,
    slug: organization.slug,
  };
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}
