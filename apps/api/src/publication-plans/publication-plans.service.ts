import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ContentFormat,
  ContentItemStatus,
  PublicationChannel,
  PublicationPlanContentOption,
  PublicationPlanMutationPayload,
  PublicationPlanPayload,
  PublicationPlansPayload,
  PublicationStatus,
} from "@content-ai/shared";

import { PrismaService } from "../database/prisma.service";
import type { ActiveOrganizationContext } from "../organizations/organizations.types";
import { ROLE_ORDER } from "../organizations/permissions";
import type { CreatePublicationPlanDto } from "./dto/create-publication-plan.dto";
import type { ListPublicationPlansDto } from "./dto/list-publication-plans.dto";
import type { UpdatePublicationPlanDto } from "./dto/update-publication-plan.dto";

type DbPublicationStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "CANCELLED";

@Injectable()
export class PublicationPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans(
    organizationContext: ActiveOrganizationContext,
    input: ListPublicationPlansDto,
  ): Promise<PublicationPlansPayload> {
    const organizationId = organizationContext.organization.id;
    const period = resolvePeriod(input.from, input.to);
    const where = buildPublicationPlanWhere(organizationId, input, period);

    const [plans, contentOptions] = await Promise.all([
      this.prisma.publicationPlan.findMany({
        orderBy: {
          publicationDate: "asc",
        },
        select: publicationPlanSelect,
        where,
      }),
      this.listContentOptions(organizationId),
    ]);
    const conflictCounts = buildConflictCounts(plans);

    return {
      canEdit:
        ROLE_ORDER[organizationContext.membership.role] >= ROLE_ORDER.EDITOR,
      contentOptions,
      plans: plans.map((plan) =>
        toPublicationPlanPayload(plan, conflictCounts.get(plan.id) ?? 0),
      ),
    };
  }

  async createPlan(
    organizationContext: ActiveOrganizationContext,
    input: CreatePublicationPlanDto,
  ): Promise<PublicationPlanMutationPayload> {
    const organizationId = organizationContext.organization.id;
    const scheduledAt = parseDateOrThrow(input.scheduledAt);
    const status = toDbPublicationStatus(input.status ?? "PLANNED");
    const content = await this.findContentOptionOrThrow(
      organizationId,
      input.contentId,
    );

    const createdPlanId = await this.prisma.$transaction(
      async (transaction) => {
        const createdPlan = await transaction.publicationPlan.create({
          data: {
            channel: input.channel,
            contentItemId: content.id,
            notes: input.notes ?? null,
            organizationId,
            publicationDate: scheduledAt,
            status,
          },
          select: {
            id: true,
          },
        });

        await syncContentStatusForPlan(
          transaction,
          organizationId,
          content.id,
          status,
        );

        return createdPlan.id;
      },
    );

    const refreshedPlan = await this.findPlanOrThrow(
      organizationId,
      createdPlanId,
    );

    return {
      plan: await this.withConflictCount(organizationId, refreshedPlan),
    };
  }

  async updatePlan(
    organizationContext: ActiveOrganizationContext,
    planId: string,
    input: UpdatePublicationPlanDto,
  ): Promise<PublicationPlanMutationPayload> {
    const organizationId = organizationContext.organization.id;
    const existingPlan = await this.findPlanOrThrow(organizationId, planId);
    const contentId = input.contentId ?? existingPlan.contentItemId;

    if (input.contentId) {
      await this.findContentOptionOrThrow(organizationId, input.contentId);
    }

    const status = input.status
      ? toDbPublicationStatus(input.status)
      : existingPlan.status;
    const updateData: Record<string, unknown> = {};

    if (input.contentId !== undefined) {
      updateData.contentItemId = input.contentId;
    }

    if (input.channel !== undefined) {
      updateData.channel = input.channel;
    }

    if (input.scheduledAt !== undefined) {
      updateData.publicationDate = parseDateOrThrow(input.scheduledAt);
    }

    if (input.status !== undefined) {
      updateData.status = status;
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.publicationPlan.update({
        data: updateData,
        where: {
          id: existingPlan.id,
        },
      });

      await syncContentStatusForPlan(
        transaction,
        organizationId,
        contentId,
        status,
      );

      if (existingPlan.contentItemId !== contentId) {
        await relaxScheduledContentIfUnused(
          transaction,
          organizationId,
          existingPlan.contentItemId,
        );
      }
    });

    const updatedPlan = await this.findPlanOrThrow(organizationId, planId);

    return {
      plan: await this.withConflictCount(organizationId, updatedPlan),
    };
  }

  async deletePlan(
    organizationContext: ActiveOrganizationContext,
    planId: string,
  ): Promise<void> {
    const organizationId = organizationContext.organization.id;
    const existingPlan = await this.findPlanOrThrow(organizationId, planId);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.publicationPlan.delete({
        where: {
          id: existingPlan.id,
        },
      });

      await relaxScheduledContentIfUnused(
        transaction,
        organizationId,
        existingPlan.contentItemId,
      );
    });
  }

  private async listContentOptions(
    organizationId: string,
  ): Promise<PublicationPlanContentOption[]> {
    const contents = await this.prisma.contentItem.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      select: contentOptionSelect,
      take: 100,
      where: {
        deletedAt: null,
        organizationId,
        status: {
          notIn: ["ARCHIVED", "DELETED"],
        },
      },
    });

    return contents.map(toContentOptionPayload);
  }

  private async findContentOptionOrThrow(
    organizationId: string,
    contentId: string,
  ): Promise<ContentOptionRecord> {
    const content = await this.prisma.contentItem.findFirst({
      select: contentOptionSelect,
      where: {
        deletedAt: null,
        id: contentId,
        organizationId,
        status: {
          notIn: ["ARCHIVED", "DELETED"],
        },
      },
    });

    if (!content) {
      throw new BadRequestException("Contenu introuvable ou non planifiable.");
    }

    return content;
  }

  private async findPlanOrThrow(
    organizationId: string,
    planId: string,
  ): Promise<PublicationPlanRecord> {
    const plan = await this.prisma.publicationPlan.findFirst({
      select: publicationPlanSelect,
      where: {
        id: planId,
        organizationId,
      },
    });

    if (!plan) {
      throw new NotFoundException("Planification introuvable.");
    }

    return plan;
  }

  private async withConflictCount(
    organizationId: string,
    plan: PublicationPlanRecord,
  ): Promise<PublicationPlanPayload> {
    if (plan.status === "CANCELLED") {
      return toPublicationPlanPayload(plan, 0);
    }

    const dayStart = startOfUtcDay(plan.publicationDate);
    const dayEnd = endOfUtcDay(plan.publicationDate);
    const conflicts = await this.prisma.publicationPlan.findMany({
      select: {
        id: true,
      },
      where: {
        channel: plan.channel,
        organizationId,
        publicationDate: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: {
          not: "CANCELLED",
        },
      },
    });

    return toPublicationPlanPayload(plan, Math.max(0, conflicts.length - 1));
  }
}

const contentOptionSelect = {
  format: true,
  id: true,
  status: true,
  title: true,
} as const;

const publicationPlanSelect = {
  channel: true,
  contentItem: {
    select: contentOptionSelect,
  },
  contentItemId: true,
  createdAt: true,
  id: true,
  notes: true,
  organizationId: true,
  publicationDate: true,
  status: true,
  updatedAt: true,
} as const;

type ContentOptionRecord = {
  format: ContentFormat;
  id: string;
  status: ContentItemStatus;
  title: string;
};

type PublicationPlanRecord = {
  channel: PublicationChannel;
  contentItem: ContentOptionRecord;
  contentItemId: string;
  createdAt: Date | string;
  id: string;
  notes: string | null;
  organizationId: string;
  publicationDate: Date | string;
  status: DbPublicationStatus;
  updatedAt: Date | string;
};

type Period = {
  from: Date;
  to: Date;
};

type PublicationPlanWhere = Record<string, unknown>;
type PrismaTransaction = Pick<PrismaService, "contentItem" | "publicationPlan">;

function buildPublicationPlanWhere(
  organizationId: string,
  input: ListPublicationPlansDto,
  period: Period,
): PublicationPlanWhere {
  return {
    ...(input.channel ? { channel: input.channel } : {}),
    organizationId,
    publicationDate: {
      gte: period.from,
      lte: period.to,
    },
    ...(input.status ? { status: toDbPublicationStatus(input.status) } : {}),
  };
}

function resolvePeriod(from?: string, to?: string): Period {
  const now = new Date();
  const defaultFrom = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const defaultTo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
  const resolvedFrom = from ? parseBoundaryDate(from, "start") : defaultFrom;
  const resolvedTo = to ? parseBoundaryDate(to, "end") : defaultTo;

  if (resolvedFrom.getTime() > resolvedTo.getTime()) {
    throw new BadRequestException("La date de debut doit preceder la fin.");
  }

  return {
    from: resolvedFrom,
    to: resolvedTo,
  };
}

function parseBoundaryDate(value: string, boundary: "end" | "start"): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number) as [
      number,
      number,
      number,
    ];

    return boundary === "start"
      ? new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
      : new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  }

  return parseDateOrThrow(value);
}

function parseDateOrThrow(value: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("Date de planification invalide.");
  }

  return date;
}

function toDbPublicationStatus(status: PublicationStatus): DbPublicationStatus {
  if (status === "PLANNED") {
    return "SCHEDULED";
  }

  return status;
}

function toPublicPublicationStatus(
  status: DbPublicationStatus,
): PublicationStatus {
  if (status === "PUBLISHED" || status === "CANCELLED") {
    return status;
  }

  return "PLANNED";
}

function buildConflictCounts(
  plans: PublicationPlanRecord[],
): Map<string, number> {
  const groups = new Map<string, PublicationPlanRecord[]>();

  plans.forEach((plan) => {
    if (plan.status === "CANCELLED") {
      return;
    }

    const key = `${toIsoDate(plan.publicationDate)}:${plan.channel}`;
    const group = groups.get(key) ?? [];
    group.push(plan);
    groups.set(key, group);
  });

  const conflicts = new Map<string, number>();

  groups.forEach((group) => {
    group.forEach((plan) => {
      conflicts.set(plan.id, Math.max(0, group.length - 1));
    });
  });

  return conflicts;
}

function toPublicationPlanPayload(
  plan: PublicationPlanRecord,
  conflictCount: number,
): PublicationPlanPayload {
  return {
    channel: plan.channel,
    conflictCount,
    content: toContentOptionPayload(plan.contentItem),
    contentId: plan.contentItemId,
    createdAt: toIsoString(plan.createdAt),
    id: plan.id,
    notes: plan.notes,
    organizationId: plan.organizationId,
    scheduledAt: toIsoString(plan.publicationDate),
    status: toPublicPublicationStatus(plan.status),
    updatedAt: toIsoString(plan.updatedAt),
  };
}

function toContentOptionPayload(
  content: ContentOptionRecord,
): PublicationPlanContentOption {
  return {
    format: content.format,
    id: content.id,
    status: content.status,
    title: content.title,
  };
}

async function syncContentStatusForPlan(
  transaction: PrismaTransaction,
  organizationId: string,
  contentId: string,
  status: DbPublicationStatus,
): Promise<void> {
  if (status === "SCHEDULED" || status === "DRAFT") {
    await transaction.contentItem.update({
      data: {
        status: "SCHEDULED",
      },
      where: {
        id: contentId,
      },
    });
    return;
  }

  if (status === "PUBLISHED") {
    await transaction.contentItem.update({
      data: {
        publishedAt: new Date(),
        status: "PUBLISHED",
      },
      where: {
        id: contentId,
      },
    });
    return;
  }

  if (status === "CANCELLED") {
    await relaxScheduledContentIfUnused(transaction, organizationId, contentId);
  }
}

async function relaxScheduledContentIfUnused(
  transaction: PrismaTransaction,
  organizationId: string,
  contentId: string,
): Promise<void> {
  const activePlans = await transaction.publicationPlan.findMany({
    select: {
      id: true,
    },
    take: 1,
    where: {
      contentItemId: contentId,
      organizationId,
      status: {
        in: ["DRAFT", "SCHEDULED", "PUBLISHED"],
      },
    },
  });

  if (activePlans.length > 0) {
    return;
  }

  const content = await transaction.contentItem.findFirst({
    select: {
      status: true,
    },
    where: {
      id: contentId,
      organizationId,
    },
  });

  if (content?.status === "SCHEDULED") {
    await transaction.contentItem.update({
      data: {
        status: "READY",
      },
      where: {
        id: contentId,
      },
    });
  }
}

function startOfUtcDay(value: Date | string): Date {
  const date = new Date(value);

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function endOfUtcDay(value: Date | string): Date {
  const date = startOfUtcDay(value);
  date.setUTCHours(23, 59, 59, 999);

  return date;
}

function toIsoDate(value: Date | string): string {
  return toIsoString(value).slice(0, 10);
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
