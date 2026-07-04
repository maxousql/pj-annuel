import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  OnboardingStatePayload,
  OnboardingStep,
  OrganizationSummary,
} from "@content-ai/shared";

import { PrismaService } from "../database/prisma.service";
import { UpsertEditorialContextDto } from "../editorial-contexts/dto/upsert-editorial-context.dto";
import {
  editorialContextSelect,
  hasMinimumEditorialContext,
  normalizeEditorialContextInput,
  toEditorialContextPayload,
  type EditorialContextRecord,
} from "../editorial-contexts/editorial-contexts.service";
import { OrganizationsService } from "../organizations/organizations.service";
import type { ActiveOrganizationContext } from "../organizations/organizations.types";

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async getState(
    userId: string,
    preferredOrganizationSlug?: string,
  ): Promise<OnboardingStatePayload> {
    const [user, organizations] = await Promise.all([
      this.prisma.user.findUnique({
        select: {
          onboardingCompletedAt: true,
        },
        where: {
          id: userId,
        },
      }),
      this.organizationsService.listOrganizations(userId),
    ]);

    if (!user) {
      throw new BadRequestException("Utilisateur introuvable.");
    }

    const editorialContexts =
      organizations.length > 0
        ? await this.prisma.editorialContext.findMany({
            select: editorialContextSelect,
            where: {
              organizationId: {
                in: organizations.map((organization) => organization.id),
              },
            },
          })
        : [];
    const contextByOrganizationId = new Map(
      editorialContexts.map((context) => [context.organizationId, context]),
    );
    const activeOrganization = resolveActiveOrganization(
      organizations,
      contextByOrganizationId,
      preferredOrganizationSlug,
    );
    const editorialContext = activeOrganization
      ? contextByOrganizationId.get(activeOrganization.id)
      : null;
    const hasMinimumContext = hasMinimumEditorialContext(editorialContext);
    const completed = Boolean(
      user.onboardingCompletedAt && activeOrganization && hasMinimumContext,
    );

    return {
      activeOrganization,
      completed,
      editorialContext: editorialContext
        ? toEditorialContextPayload(editorialContext)
        : null,
      nextStep: resolveNextStep(
        organizations.length > 0,
        hasMinimumContext,
        completed,
      ),
      organizations,
      user: {
        onboardingCompletedAt: toIsoString(user.onboardingCompletedAt),
      },
    };
  }

  async saveEditorialContext(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    input: UpsertEditorialContextDto,
  ): Promise<OnboardingStatePayload> {
    const normalizedInput = normalizeEditorialContextInput(input);

    await this.prisma.editorialContext.upsert({
      create: {
        createdById: userId,
        organizationId: organizationContext.organization.id,
        ...normalizedInput,
      },
      update: normalizedInput,
      where: {
        organizationId: organizationContext.organization.id,
      },
    });

    return this.getState(userId, organizationContext.organization.slug);
  }

  async completeOnboarding(
    userId: string,
    organizationContext: ActiveOrganizationContext,
  ): Promise<OnboardingStatePayload> {
    const editorialContext = await this.prisma.editorialContext.findUnique({
      select: editorialContextSelect,
      where: {
        organizationId: organizationContext.organization.id,
      },
    });

    if (!hasMinimumEditorialContext(editorialContext)) {
      throw new BadRequestException("Contexte editorial incomplet.");
    }

    await this.prisma.user.update({
      data: {
        onboardingCompletedAt: new Date(),
      },
      select: {
        id: true,
      },
      where: {
        id: userId,
      },
    });

    return this.getState(userId, organizationContext.organization.slug);
  }
}

function resolveActiveOrganization(
  organizations: OrganizationSummary[],
  contextByOrganizationId: Map<string, EditorialContextRecord>,
  preferredOrganizationSlug?: string,
): OrganizationSummary | null {
  if (organizations.length === 0) {
    return null;
  }

  const preferredOrganization = preferredOrganizationSlug
    ? organizations.find((organization) => {
        return organization.slug === preferredOrganizationSlug;
      })
    : undefined;

  if (preferredOrganization) {
    return preferredOrganization;
  }

  return (
    organizations.find((organization) => {
      return contextByOrganizationId.has(organization.id);
    }) ??
    organizations[0] ??
    null
  );
}

function resolveNextStep(
  hasOrganization: boolean,
  hasMinimumContext: boolean,
  completed: boolean,
): OnboardingStep {
  if (!hasOrganization) {
    return "CREATE_ORGANIZATION";
  }

  if (!hasMinimumContext) {
    return "CONFIGURE_EDITORIAL_CONTEXT";
  }

  return completed ? "READY" : "COMPLETE";
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}
