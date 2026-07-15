import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import type {
  AutomationRulePayload,
  AutomationRuleStatus,
  AutomationRuleType,
  AutomationsPayload,
  NotificationPayload,
  NotificationPreferencePayload,
  RecommendationPayload,
  RecommendationStatus,
} from "@content-ai/shared";
import { AUTOMATION_RULE_TYPES } from "@content-ai/shared";

import { PrismaService } from "../database/prisma.service";
import { ScheduledJobsService } from "../common/jobs/scheduled-jobs.service";
import type { ActiveOrganizationContext } from "../organizations/organizations.types";
import { ROLE_ORDER } from "../organizations/permissions";
import type { UpdateAutomationRuleDto } from "./dto/update-automation-rule.dto";
import type { UpdateNotificationPreferencesDto } from "./dto/update-notification-preferences.dto";

const DEFAULT_REMINDER_HOURS_BEFORE = 48;
const DEFAULT_TIMEZONE = "Europe/Paris";
const REMINDER_JOB_INTERVAL_MS = 15 * 60 * 1000;
const RECOMMENDATION_JOB_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class AutomationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationsService.name);
  private recommendationInterval: ReturnType<typeof setInterval> | null = null;
  private reminderInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: ScheduledJobsService,
  ) {}

  onModuleInit() {
    if (
      process.env.NODE_ENV === "test" ||
      process.env.DISABLE_SCHEDULED_JOBS === "true"
    ) {
      return;
    }

    this.reminderInterval = setInterval(() => {
      void this.runPublicationReminderJob();
    }, REMINDER_JOB_INTERVAL_MS);
    this.recommendationInterval = setInterval(() => {
      void this.runRecommendationJob();
    }, RECOMMENDATION_JOB_INTERVAL_MS);

    unrefTimer(this.reminderInterval);
    unrefTimer(this.recommendationInterval);

    void this.runPublicationReminderJob();
    void this.runRecommendationJob();
  }

  onModuleDestroy() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
    }

    if (this.recommendationInterval) {
      clearInterval(this.recommendationInterval);
    }
  }

  async getState(
    userId: string,
    organizationContext: ActiveOrganizationContext,
  ): Promise<AutomationsPayload> {
    const organizationId = organizationContext.organization.id;
    const [rules, recommendations, notifications, preferences] =
      await Promise.all([
        this.prisma.automationRule.findMany({
          orderBy: {
            type: "asc",
          },
          select: automationRuleSelect,
          where: {
            organizationId,
          },
        }),
        this.prisma.recommendation.findMany({
          orderBy: {
            createdAt: "desc",
          },
          select: recommendationSelect,
          take: 20,
          where: {
            organizationId,
            status: "OPEN",
          },
        }),
        this.prisma.notification.findMany({
          orderBy: {
            createdAt: "desc",
          },
          select: notificationSelect,
          take: 30,
          where: {
            organizationId,
            userId,
          },
        }),
        this.prisma.notificationPreference.findUnique({
          select: notificationPreferenceSelect,
          where: {
            userId_organizationId: {
              organizationId,
              userId,
            },
          },
        }),
      ]);

    return {
      canEdit:
        ROLE_ORDER[organizationContext.membership.role] >= ROLE_ORDER.ADMIN,
      notifications: notifications.map(toNotificationPayload),
      preferences: toNotificationPreferencePayload(preferences),
      recommendations: recommendations.map(toRecommendationPayload),
      rules: rules.map(toAutomationRulePayload),
    };
  }

  async updateRule(
    organizationContext: ActiveOrganizationContext,
    type: AutomationRuleType,
    input: UpdateAutomationRuleDto,
  ): Promise<AutomationRulePayload> {
    if (!AUTOMATION_RULE_TYPES.includes(type)) {
      throw new BadRequestException("Type d'automatisation invalide.");
    }

    if (input.timezone && !isValidTimezone(input.timezone)) {
      throw new BadRequestException("Fuseau horaire IANA invalide.");
    }

    const organizationId = organizationContext.organization.id;
    const rule = await this.prisma.automationRule.upsert({
      create: {
        organizationId,
        parameters: buildRuleParameters(type, input),
        status: input.status ?? "ACTIVE",
        type,
      },
      select: automationRuleSelect,
      update: {
        parameters: buildRuleParameters(type, input),
        ...(input.status ? { status: input.status } : {}),
      },
      where: {
        organizationId_type: {
          organizationId,
          type,
        },
      },
    });

    return toAutomationRulePayload(rule);
  }

  async updatePreferences(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    input: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencePayload> {
    const organizationId = organizationContext.organization.id;
    const preferences = await this.prisma.notificationPreference.upsert({
      create: {
        emailEnabled: input.emailEnabled ?? false,
        inAppEnabled: input.inAppEnabled ?? true,
        organizationId,
        userId,
      },
      select: notificationPreferenceSelect,
      update: {
        ...(input.emailEnabled !== undefined
          ? { emailEnabled: input.emailEnabled }
          : {}),
        ...(input.inAppEnabled !== undefined
          ? { inAppEnabled: input.inAppEnabled }
          : {}),
      },
      where: {
        userId_organizationId: {
          organizationId,
          userId,
        },
      },
    });

    return toNotificationPreferencePayload(preferences);
  }

  async processPublicationReminders(
    organizationContext: ActiveOrganizationContext,
  ): Promise<{ createdNotifications: number; createdReminders: number }> {
    return this.processPublicationRemindersForOrganization(
      organizationContext.organization.id,
    );
  }

  async generateRecommendations(
    organizationContext: ActiveOrganizationContext,
  ): Promise<{ createdRecommendations: number }> {
    return this.generateRecommendationsForOrganization(
      organizationContext.organization.id,
    );
  }

  async markNotificationAsRead(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    notificationId: string,
  ): Promise<NotificationPayload> {
    const notification = await this.prisma.notification.findFirst({
      select: {
        id: true,
      },
      where: {
        id: notificationId,
        organizationId: organizationContext.organization.id,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException("Notification introuvable.");
    }

    const updated = await this.prisma.notification.update({
      data: {
        readAt: new Date(),
        status: "READ",
      },
      select: notificationSelect,
      where: {
        id: notification.id,
      },
    });

    return toNotificationPayload(updated);
  }

  async markAllNotificationsAsRead(
    userId: string,
    organizationContext: ActiveOrganizationContext,
  ): Promise<{ updatedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      data: {
        readAt: new Date(),
        status: "READ",
      },
      where: {
        organizationId: organizationContext.organization.id,
        status: "UNREAD",
        userId,
      },
    });

    return { updatedCount: result.count };
  }

  async updateRecommendationStatus(
    organizationContext: ActiveOrganizationContext,
    recommendationId: string,
    status: RecommendationStatus,
  ): Promise<RecommendationPayload> {
    const recommendation = await this.prisma.recommendation.findFirst({
      select: {
        id: true,
      },
      where: {
        id: recommendationId,
        organizationId: organizationContext.organization.id,
      },
    });

    if (!recommendation) {
      throw new NotFoundException("Recommandation introuvable.");
    }

    const updated = await this.prisma.recommendation.update({
      data: {
        status,
      },
      select: recommendationSelect,
      where: {
        id: recommendation.id,
      },
    });

    return toRecommendationPayload(updated);
  }

  private async processPublicationRemindersForOrganization(
    organizationId: string,
  ): Promise<{ createdNotifications: number; createdReminders: number }> {
    const rule = await this.prisma.automationRule.findUnique({
      select: automationRuleSelect,
      where: {
        organizationId_type: {
          organizationId,
          type: "PUBLICATION_REMINDER",
        },
      },
    });

    if (!rule || rule.status !== "ACTIVE") {
      return { createdNotifications: 0, createdReminders: 0 };
    }

    const reminderHoursBefore = getReminderHoursBefore(rule.parameters);
    const timezone = getTimezone(rule.parameters);
    const now = new Date();
    const windowEnd = new Date(
      now.getTime() + reminderHoursBefore * 60 * 60 * 1000,
    );
    const plans = await this.prisma.publicationPlan.findMany({
      orderBy: {
        publicationDate: "asc",
      },
      select: {
        channel: true,
        contentItem: {
          select: {
            title: true,
          },
        },
        id: true,
        publicationDate: true,
      },
      where: {
        organizationId,
        publicationDate: {
          gte: now,
          lte: windowEnd,
        },
        status: {
          in: ["DRAFT", "SCHEDULED"],
        },
      },
    });
    const members = await this.prisma.membership.findMany({
      select: {
        userId: true,
      },
      where: {
        organizationId,
        status: "ACTIVE",
      },
    });
    const optedOut = await this.listOptedOutUsers(
      organizationId,
      members.map((member) => member.userId),
    );
    let createdReminders = 0;
    let createdNotifications = 0;

    for (const plan of plans) {
      const triggerAt = new Date(
        plan.publicationDate.getTime() - reminderHoursBefore * 60 * 60 * 1000,
      );
      let reminder = await this.prisma.reminder.findUnique({
        select: { id: true },
        where: {
          organizationId_publicationPlanId_triggerAt: {
            organizationId,
            publicationPlanId: plan.id,
            triggerAt,
          },
        },
      });

      if (!reminder) {
        try {
          reminder = await this.prisma.reminder.create({
            data: { organizationId, publicationPlanId: plan.id, triggerAt },
            select: { id: true },
          });
          createdReminders += 1;
        } catch (error) {
          if (!isUniqueConstraintError(error)) throw error;
          reminder = await this.prisma.reminder.findUniqueOrThrow({
            select: { id: true },
            where: {
              organizationId_publicationPlanId_triggerAt: {
                organizationId,
                publicationPlanId: plan.id,
                triggerAt,
              },
            },
          });
        }
      }

      for (const member of members) {
        if (optedOut.has(member.userId)) {
          continue;
        }

        const existingNotification = await this.prisma.notification.findUnique({
          select: { id: true },
          where: {
            userId_reminderId: {
              reminderId: reminder.id,
              userId: member.userId,
            },
          },
        });

        if (existingNotification) {
          continue;
        }

        try {
          await this.prisma.notification.create({
            data: {
              body: `${plan.contentItem.title} est prevu sur ${plan.channel} le ${formatInTimezone(
                plan.publicationDate,
                timezone,
              )}. Verifiez le contenu avant publication.`,
              organizationId,
              reminderId: reminder.id,
              title: "Publication proche",
              userId: member.userId,
            },
          });
          createdNotifications += 1;
        } catch (error) {
          if (!isUniqueConstraintError(error)) throw error;
        }
      }
    }

    return { createdNotifications, createdReminders };
  }

  private async generateRecommendationsForOrganization(
    organizationId: string,
  ): Promise<{ createdRecommendations: number }> {
    const [contents, ideas] = await Promise.all([
      this.prisma.contentItem.findMany({
        orderBy: {
          updatedAt: "asc",
        },
        select: {
          id: true,
          publicationPlans: {
            select: {
              id: true,
            },
          },
          title: true,
        },
        take: 10,
        where: {
          deletedAt: null,
          organizationId,
          status: {
            in: ["DRAFT", "REVIEW", "READY"],
          },
        },
      }),
      this.prisma.contentIdea.findMany({
        orderBy: {
          updatedAt: "asc",
        },
        select: {
          id: true,
          title: true,
        },
        take: 5,
        where: {
          archivedAt: null,
          organizationId,
          status: "SAVED",
        },
      }),
    ]);
    let createdRecommendations = 0;

    for (const content of contents.filter(
      (item) => item.publicationPlans.length === 0,
    )) {
      const created = await this.createRecommendationIfMissing({
        message: `Planifier "${content.title}" pour garder le calendrier actif.`,
        organizationId,
        targetId: content.id,
        targetType: "CONTENT",
        type: "CONTENT_TO_PLAN",
      });
      createdRecommendations += created ? 1 : 0;
    }

    for (const idea of ideas) {
      const created = await this.createRecommendationIfMissing({
        message: `Transformer l'idee "${idea.title}" en brouillon exploitable.`,
        organizationId,
        targetId: idea.id,
        targetType: "IDEA",
        type: "IDEA_TO_CONTENT",
      });
      createdRecommendations += created ? 1 : 0;
    }

    return { createdRecommendations };
  }

  private async createRecommendationIfMissing(input: {
    message: string;
    organizationId: string;
    targetId: string;
    targetType: string;
    type: string;
  }): Promise<boolean> {
    const existing = await this.prisma.recommendation.findUnique({
      select: { id: true },
      where: {
        organizationId_type_targetType_targetId: {
          organizationId: input.organizationId,
          targetId: input.targetId,
          targetType: input.targetType,
          type: input.type,
        },
      },
    });
    if (existing) return false;

    try {
      await this.prisma.recommendation.create({ data: input });
      return true;
    } catch (error) {
      if (isUniqueConstraintError(error)) return false;
      throw error;
    }
  }

  private async listOptedOutUsers(
    organizationId: string,
    userIds: string[],
  ): Promise<Set<string>> {
    if (userIds.length === 0) {
      return new Set();
    }

    const preferences = await this.prisma.notificationPreference.findMany({
      select: {
        userId: true,
      },
      where: {
        inAppEnabled: false,
        organizationId,
        userId: {
          in: userIds,
        },
      },
    });

    return new Set(preferences.map((preference) => preference.userId));
  }

  private async findOrganizationsWithActiveRule(
    type: AutomationRuleType,
  ): Promise<string[]> {
    const automationRuleDelegate = this.prisma.automationRule;

    if (!automationRuleDelegate) {
      return [];
    }

    const rules = await automationRuleDelegate.findMany({
      select: {
        organizationId: true,
      },
      where: {
        status: "ACTIVE",
        type,
      },
    });

    return Array.from(new Set(rules.map((rule) => rule.organizationId)));
  }

  private async runPublicationReminderJob() {
    try {
      const execution = await this.jobs.runOncePerBucket(
        "automations:publication-reminders",
        REMINDER_JOB_INTERVAL_MS,
        async () => {
          const organizationIds = await this.findOrganizationsWithActiveRule(
            "PUBLICATION_REMINDER",
          );
          let createdNotifications = 0;
          let createdReminders = 0;

          for (const organizationId of organizationIds) {
            try {
              const result =
                await this.processPublicationRemindersForOrganization(
                  organizationId,
                );
              createdNotifications += result.createdNotifications;
              createdReminders += result.createdReminders;
            } catch {
              this.logger.warn(
                `Publication reminders skipped for organization ${organizationId}.`,
              );
            }
          }

          return { createdNotifications, createdReminders };
        },
      );

      if (
        execution.acquired &&
        (execution.result.createdNotifications > 0 ||
          execution.result.createdReminders > 0)
      ) {
        this.logger.log(
          `Publication reminder job created ${execution.result.createdReminders} reminder(s) and ${execution.result.createdNotifications} notification(s).`,
        );
      }
    } catch (error) {
      this.logger.error(
        "Publication reminder job failed.",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async runRecommendationJob() {
    try {
      const execution = await this.jobs.runOncePerBucket(
        "automations:recommendations",
        RECOMMENDATION_JOB_INTERVAL_MS,
        async () => {
          const organizationIds = await this.findOrganizationsWithActiveRule(
            "EDITORIAL_RECOMMENDATION",
          );
          let createdRecommendations = 0;

          for (const organizationId of organizationIds) {
            try {
              const result =
                await this.generateRecommendationsForOrganization(
                  organizationId,
                );
              createdRecommendations += result.createdRecommendations;
            } catch {
              this.logger.warn(
                `Recommendations skipped for organization ${organizationId}.`,
              );
            }
          }

          return { createdRecommendations };
        },
      );

      if (execution.acquired && execution.result.createdRecommendations > 0) {
        this.logger.log(
          `Recommendation job created ${execution.result.createdRecommendations} recommendation(s).`,
        );
      }
    } catch (error) {
      this.logger.error(
        "Recommendation job failed.",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

const automationRuleSelect = {
  id: true,
  parameters: true,
  status: true,
  type: true,
  updatedAt: true,
} as const;

const recommendationSelect = {
  createdAt: true,
  id: true,
  message: true,
  status: true,
  targetId: true,
  targetType: true,
  type: true,
} as const;

const notificationSelect = {
  body: true,
  createdAt: true,
  id: true,
  readAt: true,
  status: true,
  title: true,
} as const;

const notificationPreferenceSelect = {
  emailEnabled: true,
  inAppEnabled: true,
} as const;

type AutomationRuleRecord = {
  id: string;
  parameters: unknown;
  status: AutomationRuleStatus;
  type: AutomationRuleType;
  updatedAt: Date | string;
};

type RecommendationRecord = {
  createdAt: Date | string;
  id: string;
  message: string;
  status: RecommendationStatus;
  targetId: string | null;
  targetType: string | null;
  type: string;
};

type NotificationRecord = {
  body: string;
  createdAt: Date | string;
  id: string;
  readAt: Date | string | null;
  status: "READ" | "UNREAD";
  title: string;
};

type NotificationPreferenceRecord = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
} | null;

function toAutomationRulePayload(
  rule: AutomationRuleRecord,
): AutomationRulePayload {
  return {
    id: rule.id,
    parameters: isRecord(rule.parameters) ? rule.parameters : {},
    status: rule.status,
    type: rule.type,
    updatedAt: toIsoString(rule.updatedAt),
  };
}

function toRecommendationPayload(
  recommendation: RecommendationRecord,
): RecommendationPayload {
  return {
    createdAt: toIsoString(recommendation.createdAt),
    id: recommendation.id,
    message: recommendation.message,
    status: recommendation.status,
    targetId: recommendation.targetId,
    targetType: recommendation.targetType,
    type: recommendation.type,
  };
}

function toNotificationPayload(
  notification: NotificationRecord,
): NotificationPayload {
  return {
    body: notification.body,
    createdAt: toIsoString(notification.createdAt),
    id: notification.id,
    readAt: notification.readAt ? toIsoString(notification.readAt) : null,
    status: notification.status,
    title: notification.title,
  };
}

function toNotificationPreferencePayload(
  preference: NotificationPreferenceRecord,
): NotificationPreferencePayload {
  return {
    emailEnabled: preference?.emailEnabled ?? false,
    inAppEnabled: preference?.inAppEnabled ?? true,
  };
}

function buildRuleParameters(
  type: AutomationRuleType,
  input: UpdateAutomationRuleDto,
): Record<string, number | string> {
  if (type !== "PUBLICATION_REMINDER") {
    return {};
  }

  return {
    reminderHoursBefore:
      input.reminderHoursBefore ?? DEFAULT_REMINDER_HOURS_BEFORE,
    timezone: input.timezone ?? DEFAULT_TIMEZONE,
  };
}

function getTimezone(parameters: unknown): string {
  if (
    isRecord(parameters) &&
    typeof parameters.timezone === "string" &&
    isValidTimezone(parameters.timezone)
  ) {
    return parameters.timezone;
  }

  return DEFAULT_TIMEZONE;
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function formatInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function getReminderHoursBefore(parameters: unknown): number {
  if (
    isRecord(parameters) &&
    typeof parameters.reminderHoursBefore === "number" &&
    Number.isFinite(parameters.reminderHoursBefore)
  ) {
    return parameters.reminderHoursBefore;
  }

  return DEFAULT_REMINDER_HOURS_BEFORE;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unrefTimer(timer: ReturnType<typeof setInterval>) {
  if (
    typeof timer === "object" &&
    "unref" in timer &&
    typeof timer.unref === "function"
  ) {
    timer.unref();
  }
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
