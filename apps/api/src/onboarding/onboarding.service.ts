import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  AdvancedOnboardingPayload,
  AdvancedOnboardingStep,
  OnboardingStatePayload,
  OnboardingPresetPayload,
  OnboardingStep,
  OrganizationSummary,
} from "@content-ai/shared";
import { ADVANCED_ONBOARDING_STEPS } from "@content-ai/shared";

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
import type { ApplyOnboardingPresetDto } from "./dto/apply-onboarding-preset.dto";
import type { UpdateOnboardingProgressDto } from "./dto/update-onboarding-progress.dto";

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
    const advanced = activeOrganization
      ? await this.getAdvancedPayload(userId, activeOrganization.id)
      : null;

    return {
      advanced,
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

  async applyPreset(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    input: ApplyOnboardingPresetDto,
  ): Promise<OnboardingStatePayload> {
    const preset = ONBOARDING_PRESETS.find((candidate) => {
      return candidate.id === input.presetId;
    });

    if (!preset) {
      throw new BadRequestException("Preset d'onboarding introuvable.");
    }

    await this.prisma.editorialContext.upsert({
      create: {
        createdById: userId,
        organizationId: organizationContext.organization.id,
        positioning: preset.positioning,
        resourceNotes: preset.briefExample,
        sector: preset.sector,
        targetAudience: preset.targetAudience,
        themes: preset.themes,
        tone: preset.tone,
      },
      update: {
        positioning: preset.positioning,
        resourceNotes: preset.briefExample,
        sector: preset.sector,
        targetAudience: preset.targetAudience,
        themes: preset.themes,
        tone: preset.tone,
      },
      where: {
        organizationId: organizationContext.organization.id,
      },
    });

    await this.markAdvancedStep(
      userId,
      organizationContext.organization.id,
      "PRESET",
      true,
    );

    return this.getState(userId, organizationContext.organization.slug);
  }

  async updateAdvancedProgress(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    input: UpdateOnboardingProgressDto,
  ): Promise<OnboardingStatePayload> {
    await this.markAdvancedStep(
      userId,
      organizationContext.organization.id,
      input.step,
      input.completed ?? true,
    );

    return this.getState(userId, organizationContext.organization.slug);
  }

  async skipAdvancedOnboarding(
    userId: string,
    organizationContext: ActiveOrganizationContext,
  ): Promise<OnboardingStatePayload> {
    await this.prisma.onboardingProgress.upsert({
      create: {
        currentStep: "DONE",
        organizationId: organizationContext.organization.id,
        skippedAt: new Date(),
        userId,
      },
      update: {
        currentStep: "DONE",
        skippedAt: new Date(),
      },
      where: {
        userId_organizationId: {
          organizationId: organizationContext.organization.id,
          userId,
        },
      },
    });

    return this.getState(userId, organizationContext.organization.slug);
  }

  private async getAdvancedPayload(
    userId: string,
    organizationId: string,
  ): Promise<AdvancedOnboardingPayload> {
    const progress = await this.prisma.onboardingProgress.findUnique({
      select: {
        completedAt: true,
        completedSteps: true,
        currentStep: true,
        skippedAt: true,
      },
      where: {
        userId_organizationId: {
          organizationId,
          userId,
        },
      },
    });
    const completedSteps = normalizeAdvancedSteps(progress?.completedSteps);
    const currentStep = normalizeAdvancedStep(
      progress?.currentStep,
      resolveCurrentAdvancedStep(completedSteps),
    );

    return {
      completedAt: toIsoString(progress?.completedAt),
      completedSteps,
      currentStep,
      presets: ONBOARDING_PRESETS,
      skippedAt: toIsoString(progress?.skippedAt),
    };
  }

  private async markAdvancedStep(
    userId: string,
    organizationId: string,
    step: AdvancedOnboardingStep,
    completed: boolean,
  ): Promise<void> {
    const existing = await this.prisma.onboardingProgress.findUnique({
      select: {
        completedSteps: true,
      },
      where: {
        userId_organizationId: {
          organizationId,
          userId,
        },
      },
    });
    const completedSteps = new Set(
      normalizeAdvancedSteps(existing?.completedSteps),
    );

    if (completed) {
      completedSteps.add(step);
    } else {
      completedSteps.delete(step);
    }

    const nextSteps = [...completedSteps];
    const allDone = [
      "CHECKLIST",
      "PRESET",
      "FIRST_IDEA",
      "FIRST_CONTENT",
    ].every((requiredStep) =>
      completedSteps.has(requiredStep as AdvancedOnboardingStep),
    );

    if (allDone) {
      completedSteps.add("DONE");
    }

    await this.prisma.onboardingProgress.upsert({
      create: {
        completedAt: allDone ? new Date() : null,
        completedSteps: allDone ? [...completedSteps] : nextSteps,
        currentStep: allDone
          ? "DONE"
          : resolveCurrentAdvancedStep([...completedSteps]),
        organizationId,
        userId,
      },
      update: {
        completedAt: allDone ? new Date() : null,
        completedSteps: allDone ? [...completedSteps] : nextSteps,
        currentStep: allDone
          ? "DONE"
          : resolveCurrentAdvancedStep([...completedSteps]),
      },
      where: {
        userId_organizationId: {
          organizationId,
          userId,
        },
      },
    });
  }
}

const ONBOARDING_PRESETS: OnboardingPresetPayload[] = [
  {
    briefExample:
      "Transformer des apprentissages produit en posts LinkedIn concrets pour une audience de dirigeants B2B.",
    id: "saas-b2b",
    positioning:
      "Expertise pragmatique pour equipes B2B qui veulent produire sans multiplier les outils.",
    sector: "SaaS B2B",
    targetAudience: "Fondateurs, responsables marketing et product managers",
    themes: ["IA", "productivite", "go-to-market", "retention"],
    tone: "Expert, direct, pedagogique",
    version: "v2.0",
  },
  {
    briefExample:
      "Creer des contenus educatifs qui rassurent avant l'achat et valorisent les preuves client.",
    id: "ecommerce",
    positioning: "Marque utile qui aide les clients a choisir avec confiance.",
    sector: "E-commerce",
    targetAudience: "Acheteurs en ligne et responsables acquisition",
    themes: ["comparatifs", "guides", "preuve sociale", "fidelisation"],
    tone: "Clair, rassurant, oriente benefices",
    version: "v2.0",
  },
  {
    briefExample:
      "Decliner un sujet d'expertise en contenus simples pour nourrir une audience en apprentissage.",
    id: "formation",
    positioning:
      "Reference accessible qui rend les sujets complexes actionnables.",
    sector: "Formation et conseil",
    targetAudience: "Professionnels en montee en competence",
    themes: ["methodes", "cas pratiques", "outils", "retours terrain"],
    tone: "Pedagogique, structure, encourageant",
    version: "v2.0",
  },
];

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

function normalizeAdvancedSteps(
  values: string[] | undefined,
): AdvancedOnboardingStep[] {
  return (values ?? []).filter((value): value is AdvancedOnboardingStep => {
    return ADVANCED_ONBOARDING_STEPS.includes(value as AdvancedOnboardingStep);
  });
}

function normalizeAdvancedStep(
  value: string | undefined,
  fallback: AdvancedOnboardingStep,
): AdvancedOnboardingStep {
  return value &&
    ADVANCED_ONBOARDING_STEPS.includes(value as AdvancedOnboardingStep)
    ? (value as AdvancedOnboardingStep)
    : fallback;
}

function resolveCurrentAdvancedStep(
  completedSteps: AdvancedOnboardingStep[],
): AdvancedOnboardingStep {
  const completed = new Set(completedSteps);

  if (!completed.has("CHECKLIST")) {
    return "CHECKLIST";
  }

  if (!completed.has("PRESET")) {
    return "PRESET";
  }

  if (!completed.has("FIRST_IDEA")) {
    return "FIRST_IDEA";
  }

  if (!completed.has("FIRST_CONTENT")) {
    return "FIRST_CONTENT";
  }

  return "DONE";
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}
