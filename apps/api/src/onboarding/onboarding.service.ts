import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type {
  AdvancedOnboardingPayload,
  AdvancedOnboardingStep,
  OnboardingStatePayload,
  OnboardingPresetPayload,
  OnboardingStep,
  OrganizationSummary,
  OrganizationRole,
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
      ? await this.getAdvancedPayload(
          userId,
          activeOrganization.id,
          activeOrganization.role,
        )
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
    if (organizationContext.membership.role !== "ADMIN") {
      throw new ForbiddenException(
        "Seul un administrateur peut remplacer le contexte par un preset.",
      );
    }

    const preset = ONBOARDING_PRESETS.find((candidate) => {
      return candidate.id === input.presetId;
    });

    if (!preset) {
      throw new BadRequestException("Preset d'onboarding introuvable.");
    }

    const organizationId = organizationContext.organization.id;

    await this.prisma.$transaction(
      async (transaction) => {
        const [existingContext, progress] = await Promise.all([
          transaction.editorialContext.findUnique({
            select: { id: true },
            where: { organizationId },
          }),
          transaction.onboardingProgress.findUnique({
            select: { completedSteps: true },
            where: {
              userId_organizationId: { organizationId, userId },
            },
          }),
        ]);

        if (existingContext && !input.confirmOverwrite) {
          throw new ConflictException({
            code: "PRESET_OVERWRITE_CONFIRMATION_REQUIRED",
            message:
              "Confirmez le remplacement du contexte editorial existant par ce preset.",
          });
        }

        await transaction.editorialContext.upsert({
          create: {
            createdById: userId,
            organizationId,
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
          where: { organizationId },
        });

        const completedSteps = new Set(
          normalizeAdvancedSteps(progress?.completedSteps),
        );
        completedSteps.delete("DONE");
        completedSteps.add("PRESET");
        await transaction.onboardingProgress.upsert({
          create: {
            completedSteps: [...completedSteps],
            currentStep: resolveCurrentAdvancedStep(
              [...completedSteps],
              getAvailableAdvancedSteps("ADMIN"),
            ),
            organizationId,
            userId,
          },
          update: {
            completedAt: null,
            completedSteps: [...completedSteps],
            currentStep: resolveCurrentAdvancedStep(
              [...completedSteps],
              getAvailableAdvancedSteps("ADMIN"),
            ),
          },
          where: {
            userId_organizationId: { organizationId, userId },
          },
        });
      },
      { isolationLevel: "Serializable" },
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
      organizationContext.membership.role,
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
    role: OrganizationRole,
  ): Promise<AdvancedOnboardingPayload> {
    const [progress, editorialContext, ideaCount, contentCount] =
      await Promise.all([
        this.prisma.onboardingProgress.findUnique({
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
        }),
        this.prisma.editorialContext.findUnique({
          select: editorialContextSelect,
          where: { organizationId },
        }),
        this.prisma.contentIdea.count({
          where: {
            archivedAt: null,
            createdById: userId,
            organizationId,
            status: { in: ["DRAFT", "SAVED", "USED"] },
          },
        }),
        this.prisma.contentItem.count({
          where: {
            createdById: userId,
            deletedAt: null,
            organizationId,
            status: { not: "DELETED" },
          },
        }),
      ]);
    const availableSteps = getAvailableAdvancedSteps(role);
    const { allDone, completedSteps, currentStep } =
      reconcileCompletedAdvancedSteps({
        availableSteps,
        checklistComplete: hasMinimumEditorialContext(editorialContext),
        firstContentComplete: contentCount > 0,
        firstIdeaComplete: ideaCount > 0,
        skipped: Boolean(progress?.skippedAt),
        storedSteps: normalizeAdvancedSteps(progress?.completedSteps),
      });
    const completedAt = allDone ? (progress?.completedAt ?? new Date()) : null;

    await this.prisma.onboardingProgress.upsert({
      create: {
        completedAt,
        completedSteps,
        currentStep,
        organizationId,
        skippedAt: progress?.skippedAt ?? null,
        userId,
      },
      update: { completedAt, completedSteps, currentStep },
      where: { userId_organizationId: { organizationId, userId } },
    });

    return {
      availableSteps,
      completedAt: toIsoString(completedAt),
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
    role: OrganizationRole = "ADMIN",
  ): Promise<void> {
    const availableSteps = getAvailableAdvancedSteps(role);

    if (!availableSteps.includes(step)) {
      throw new BadRequestException(
        "Cette etape ne correspond pas a votre role.",
      );
    }
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
    completedSteps.delete("DONE");

    if (completed) {
      completedSteps.add(step);
    } else {
      completedSteps.delete(step);
    }

    const allDone = availableSteps
      .filter((candidate) => candidate !== "DONE")
      .every((requiredStep) => completedSteps.has(requiredStep));

    if (allDone) {
      completedSteps.add("DONE");
    }

    await this.prisma.onboardingProgress.upsert({
      create: {
        completedAt: allDone ? new Date() : null,
        completedSteps: [...completedSteps],
        currentStep: allDone
          ? "DONE"
          : resolveCurrentAdvancedStep([...completedSteps], availableSteps),
        organizationId,
        userId,
      },
      update: {
        completedAt: allDone ? new Date() : null,
        completedSteps: [...completedSteps],
        currentStep: allDone
          ? "DONE"
          : resolveCurrentAdvancedStep([...completedSteps], availableSteps),
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

function resolveCurrentAdvancedStep(
  completedSteps: AdvancedOnboardingStep[],
  availableSteps: readonly AdvancedOnboardingStep[] = ADVANCED_ONBOARDING_STEPS,
): AdvancedOnboardingStep {
  const completed = new Set(completedSteps);

  for (const step of availableSteps) {
    if (step !== "DONE" && !completed.has(step)) return step;
  }

  return "DONE";
}

export function getAvailableAdvancedSteps(
  role: OrganizationRole,
): AdvancedOnboardingStep[] {
  if (role === "READER") return ["CHECKLIST", "DONE"];
  if (role === "EDITOR") {
    return ["CHECKLIST", "FIRST_IDEA", "FIRST_CONTENT", "DONE"];
  }
  return ["CHECKLIST", "PRESET", "FIRST_IDEA", "FIRST_CONTENT", "DONE"];
}

export function reconcileCompletedAdvancedSteps(input: {
  availableSteps: AdvancedOnboardingStep[];
  checklistComplete: boolean;
  firstContentComplete: boolean;
  firstIdeaComplete: boolean;
  skipped: boolean;
  storedSteps: AdvancedOnboardingStep[];
}): {
  allDone: boolean;
  completedSteps: AdvancedOnboardingStep[];
  currentStep: AdvancedOnboardingStep;
} {
  const completed = new Set(
    input.storedSteps.filter(
      (step) => step !== "DONE" && input.availableSteps.includes(step),
    ),
  );

  if (input.checklistComplete) completed.add("CHECKLIST");
  else completed.delete("CHECKLIST");
  if (input.firstIdeaComplete) completed.add("FIRST_IDEA");
  else completed.delete("FIRST_IDEA");
  if (input.firstContentComplete) completed.add("FIRST_CONTENT");
  else completed.delete("FIRST_CONTENT");

  const requiredSteps = input.availableSteps.filter((step) => step !== "DONE");
  const allDone =
    input.skipped ||
    requiredSteps.every((requiredStep) => completed.has(requiredStep));
  if (allDone) completed.add("DONE");
  const completedSteps = [...completed].filter((step) =>
    input.availableSteps.includes(step),
  );

  return {
    allDone,
    completedSteps,
    currentStep: allDone
      ? "DONE"
      : resolveCurrentAdvancedStep(completedSteps, input.availableSteps),
  };
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}
