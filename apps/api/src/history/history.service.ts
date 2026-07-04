import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  ContentFormat,
  ContentIdeaStatus,
  ContentItemStatus,
  ContentSource,
  DuplicateCheckPayload,
  HistoryContentDetailPayload,
  HistoryDetailPayload,
  HistoryIdeaDetailPayload,
  HistoryItemType,
  HistoryListItemPayload,
  HistoryListPayload,
} from "@content-ai/shared";

import { PrismaService } from "../database/prisma.service";
import type { ActiveOrganizationContext } from "../organizations/organizations.types";
import type { CheckHistoryDuplicateDto } from "./dto/check-history-duplicate.dto";
import type { ListHistoryDto } from "./dto/list-history.dto";
import { HistoryDuplicatesService } from "./history-duplicates.service";
import { buildHistoryText } from "./history-duplicates.service";
import { matchesSearchQuery } from "./history-similarity";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class HistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly duplicatesService: HistoryDuplicatesService,
  ) {}

  async listHistory(
    organizationContext: ActiveOrganizationContext,
    query: ListHistoryDto,
  ): Promise<HistoryListPayload> {
    const organizationId = organizationContext.organization.id;
    const [ideas, contents] = await Promise.all([
      query.type === "CONTENT"
        ? Promise.resolve([])
        : this.prisma.contentIdea.findMany({
            orderBy: {
              createdAt: "desc",
            },
            select: historyIdeaSelect,
            where: {
              archivedAt: null,
              organizationId,
              status: {
                in: ["DRAFT", "SAVED", "USED"],
              },
            },
          }),
      query.type === "IDEA"
        ? Promise.resolve([])
        : this.prisma.contentItem.findMany({
            orderBy: {
              createdAt: "desc",
            },
            select: historyContentSelect,
            where: {
              deletedAt: null,
              organizationId,
              status: {
                not: "DELETED",
              },
            },
          }),
    ]);
    const allItems = [
      ...ideas.map(toHistoryIdeaDetailPayload),
      ...contents.map(toHistoryContentDetailPayload),
    ];
    const filteredItems = allItems
      .filter((item) => matchesFilters(item, query))
      .sort((first, second) => {
        return (
          new Date(second.updatedAt).getTime() -
          new Date(first.updatedAt).getTime()
        );
      });
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const startIndex = (page - 1) * pageSize;
    const items = filteredItems
      .slice(startIndex, startIndex + pageSize)
      .map(toHistoryListItemPayload);
    const totalPages = Math.max(Math.ceil(filteredItems.length / pageSize), 1);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total: filteredItems.length,
        totalPages,
      },
    };
  }

  async getHistoryItem(
    organizationContext: ActiveOrganizationContext,
    itemType: string,
    itemId: string,
  ): Promise<HistoryDetailPayload> {
    const normalizedType = normalizeHistoryItemType(itemType);

    if (!normalizedType) {
      throw new NotFoundException("Element d'historique introuvable.");
    }

    if (normalizedType === "IDEA") {
      const idea = await this.prisma.contentIdea.findFirst({
        select: historyIdeaSelect,
        where: {
          archivedAt: null,
          id: itemId,
          organizationId: organizationContext.organization.id,
        },
      });

      if (!idea) {
        throw new NotFoundException("Idee introuvable dans l'historique.");
      }

      return {
        item: toHistoryIdeaDetailPayload(idea),
      };
    }

    const content = await this.prisma.contentItem.findFirst({
      select: historyContentSelect,
      where: {
        deletedAt: null,
        id: itemId,
        organizationId: organizationContext.organization.id,
        status: {
          not: "DELETED",
        },
      },
    });

    if (!content) {
      throw new NotFoundException("Contenu introuvable dans l'historique.");
    }

    return {
      item: toHistoryContentDetailPayload(content),
    };
  }

  async checkDuplicate(
    organizationContext: ActiveOrganizationContext,
    input: CheckHistoryDuplicateDto,
  ): Promise<DuplicateCheckPayload> {
    return this.duplicatesService.checkDuplicate(
      organizationContext.organization.id,
      input,
    );
  }
}

const historyIdeaSelect = {
  angle: true,
  archivedAt: true,
  category: true,
  createdAt: true,
  id: true,
  justification: true,
  organizationId: true,
  recommendedFormat: true,
  status: true,
  title: true,
  updatedAt: true,
} as const;

const historyContentSelect = {
  body: true,
  brief: true,
  createdAt: true,
  duplicateScore: true,
  format: true,
  id: true,
  ideaId: true,
  organizationId: true,
  source: true,
  status: true,
  title: true,
  topic: true,
  updatedAt: true,
} as const;

type HistoryIdeaRecord = {
  angle: string;
  archivedAt: Date | string | null;
  category: string | null;
  createdAt: Date | string;
  id: string;
  justification: string;
  organizationId: string;
  recommendedFormat: ContentFormat;
  status: ContentIdeaStatus;
  title: string;
  updatedAt: Date | string;
};

type HistoryContentRecord = {
  body: string;
  brief: string | null;
  createdAt: Date | string;
  duplicateScore: number | null;
  format: ContentFormat;
  id: string;
  ideaId: string | null;
  organizationId: string;
  source: ContentSource;
  status: ContentItemStatus;
  title: string;
  topic: string | null;
  updatedAt: Date | string;
};

function toHistoryIdeaDetailPayload(
  idea: HistoryIdeaRecord,
): HistoryIdeaDetailPayload {
  return {
    angle: idea.angle,
    archivedAt: idea.archivedAt ? toIsoString(idea.archivedAt) : null,
    createdAt: toIsoString(idea.createdAt),
    duplicateScore: null,
    excerpt: idea.angle,
    format: idea.recommendedFormat,
    id: idea.id,
    justification: idea.justification,
    organizationId: idea.organizationId,
    status: idea.status,
    title: idea.title,
    topic: idea.category,
    type: "IDEA",
    updatedAt: toIsoString(idea.updatedAt),
  };
}

function toHistoryContentDetailPayload(
  content: HistoryContentRecord,
): HistoryContentDetailPayload {
  return {
    body: content.body,
    brief: content.brief,
    createdAt: toIsoString(content.createdAt),
    duplicateScore: content.duplicateScore,
    excerpt: createExcerpt(content.body),
    format: content.format,
    id: content.id,
    ideaId: content.ideaId,
    organizationId: content.organizationId,
    source: content.source,
    status: content.status,
    title: content.title,
    topic: content.topic,
    type: "CONTENT",
    updatedAt: toIsoString(content.updatedAt),
  };
}

function toHistoryListItemPayload(
  item: HistoryIdeaDetailPayload | HistoryContentDetailPayload,
): HistoryListItemPayload {
  return {
    createdAt: item.createdAt,
    duplicateScore: item.duplicateScore,
    excerpt: item.excerpt,
    format: item.format,
    id: item.id,
    status: item.status,
    title: item.title,
    topic: item.topic,
    type: item.type,
    updatedAt: item.updatedAt,
  };
}

function matchesFilters(
  item: HistoryIdeaDetailPayload | HistoryContentDetailPayload,
  query: ListHistoryDto,
): boolean {
  if (query.format && item.format !== query.format) {
    return false;
  }

  if (query.status && item.status !== query.status) {
    return false;
  }

  if (!query.query) {
    return true;
  }

  return matchesSearchQuery(
    buildHistoryText({
      format: item.format,
      text:
        item.type === "IDEA"
          ? `${item.angle} ${item.justification}`
          : item.body,
      title: item.title,
      topic: item.topic,
    }),
    query.query,
  );
}

function normalizeHistoryItemType(value: string): HistoryItemType | null {
  const normalizedValue = value.trim().toUpperCase();

  if (normalizedValue === "IDEA" || normalizedValue === "IDEAS") {
    return "IDEA";
  }

  if (normalizedValue === "CONTENT" || normalizedValue === "CONTENTS") {
    return "CONTENT";
  }

  return null;
}

function createExcerpt(value: string): string {
  const normalizedValue = value.trim().replace(/\s+/g, " ");

  if (normalizedValue.length <= 220) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, 220)}...`;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
