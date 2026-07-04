import { Injectable } from "@nestjs/common";
import type {
  ContentFormat,
  ContentIdeaStatus,
  ContentItemStatus,
  DashboardLatestItemPayload,
  DashboardSummaryPayload,
} from "@content-ai/shared";

import { PrismaService } from "../database/prisma.service";
import type { ActiveOrganizationContext } from "../organizations/organizations.types";
import { canEditContent } from "../organizations/permissions";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    organizationContext: ActiveOrganizationContext,
  ): Promise<DashboardSummaryPayload> {
    const organizationId = organizationContext.organization.id;
    const [ideas, contents, editorialContext, generationLogs] =
      await Promise.all([
        this.prisma.contentIdea.findMany({
          orderBy: {
            updatedAt: "desc",
          },
          select: dashboardIdeaSelect,
          where: {
            archivedAt: null,
            organizationId,
            status: {
              in: ["DRAFT", "SAVED", "USED"],
            },
          },
        }),
        this.prisma.contentItem.findMany({
          orderBy: {
            updatedAt: "desc",
          },
          select: dashboardContentSelect,
          where: {
            deletedAt: null,
            organizationId,
            status: {
              not: "DELETED",
            },
          },
        }),
        this.prisma.editorialContext.findUnique({
          select: {
            id: true,
          },
          where: {
            organizationId,
          },
        }),
        this.prisma.aiGenerationLog.findMany({
          select: {
            id: true,
            status: true,
          },
          where: {
            organizationId,
          },
        }),
      ]);

    return buildDashboardSummary({
      canEdit: canEditContent(organizationContext.membership.role),
      contents,
      editorialContextConfigured: Boolean(editorialContext),
      generationLogs,
      ideas,
    });
  }
}

const dashboardIdeaSelect = {
  category: true,
  createdAt: true,
  id: true,
  recommendedFormat: true,
  status: true,
  title: true,
  updatedAt: true,
} as const;

const dashboardContentSelect = {
  createdAt: true,
  duplicateScore: true,
  format: true,
  id: true,
  status: true,
  title: true,
  topic: true,
  updatedAt: true,
} as const;

type DashboardIdeaRecord = {
  category: string | null;
  createdAt: Date | string;
  id: string;
  recommendedFormat: ContentFormat;
  status: ContentIdeaStatus;
  title: string;
  updatedAt: Date | string;
};

type DashboardContentRecord = {
  createdAt: Date | string;
  duplicateScore: number | null;
  format: ContentFormat;
  id: string;
  status: ContentItemStatus;
  title: string;
  topic: string | null;
  updatedAt: Date | string;
};

type DashboardGenerationLogRecord = {
  id: string;
  status: "FAILED" | "SUCCEEDED";
};

export function buildDashboardSummary(input: {
  canEdit: boolean;
  contents: DashboardContentRecord[];
  editorialContextConfigured: boolean;
  generationLogs: DashboardGenerationLogRecord[];
  ideas: DashboardIdeaRecord[];
}): DashboardSummaryPayload {
  const latestItems = [
    ...input.ideas.map(toLatestIdea),
    ...input.contents.map(toLatestContent),
  ]
    .sort(sortLatestItems)
    .slice(0, 6);
  const reviewItems = input.contents
    .filter(
      (content) => content.status === "DRAFT" || content.status === "REVIEW",
    )
    .map(toLatestContent)
    .sort(sortLatestItems)
    .slice(0, 5);

  return {
    canEdit: input.canEdit,
    counters: {
      aiGenerationsCount: input.generationLogs.filter((log) => {
        return log.status === "SUCCEEDED";
      }).length,
      contentsCount: input.contents.length,
      draftsCount: input.contents.filter((content) => {
        return content.status === "DRAFT";
      }).length,
      ideasCount: input.ideas.length,
      toReviewCount: input.contents.filter((content) => {
        return content.status === "REVIEW";
      }).length,
    },
    editorialContextConfigured: input.editorialContextConfigured,
    latestItems,
    reviewItems,
    topTopics: buildTopTopics(input.ideas, input.contents),
  };
}

function toLatestIdea(idea: DashboardIdeaRecord): DashboardLatestItemPayload {
  return {
    format: idea.recommendedFormat,
    id: idea.id,
    status: idea.status,
    title: idea.title,
    topic: idea.category,
    type: "IDEA",
    updatedAt: toIsoString(idea.updatedAt),
  };
}

function toLatestContent(
  content: DashboardContentRecord,
): DashboardLatestItemPayload {
  return {
    format: content.format,
    id: content.id,
    status: content.status,
    title: content.title,
    topic: content.topic,
    type: "CONTENT",
    updatedAt: toIsoString(content.updatedAt),
  };
}

function buildTopTopics(
  ideas: DashboardIdeaRecord[],
  contents: DashboardContentRecord[],
) {
  const counts = new Map<string, number>();

  for (const topic of [
    ...ideas.map((idea) => idea.category),
    ...contents.map((content) => content.topic),
  ]) {
    const normalizedTopic = normalizeTopic(topic);

    if (!normalizedTopic) {
      continue;
    }

    counts.set(normalizedTopic, (counts.get(normalizedTopic) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([topic, count]) => ({ count, topic }))
    .sort((first, second) => {
      if (first.count !== second.count) {
        return second.count - first.count;
      }

      return first.topic.localeCompare(second.topic);
    })
    .slice(0, 5);
}

function normalizeTopic(value: string | null): string | null {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function sortLatestItems(
  first: DashboardLatestItemPayload,
  second: DashboardLatestItemPayload,
) {
  return (
    new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
  );
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
