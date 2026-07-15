import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ContentDuplicatePayload,
  ContentGenerationFormat,
  ContentTagPayload,
  CurationFeedMutationPayload,
  CurationPayload,
  CuratedResourceDetailPayload,
  CurationResourceMutationPayload,
  CuratedResourcePayload,
  DuplicateCheckPayload,
  GeneratedContentPayload,
  ResourceStatus,
  ResourceType,
  SourceFeedPayload,
  SourceFeedStatus,
} from "@content-ai/shared";

import { ContentGenerationService } from "../ai/content-generation.service";
import { ScheduledJobsService } from "../common/jobs/scheduled-jobs.service";
import { PrismaService } from "../database/prisma.service";
import { HistoryDuplicatesService } from "../history/history-duplicates.service";
import type { ActiveOrganizationContext } from "../organizations/organizations.types";
import { ROLE_ORDER } from "../organizations/permissions";
import { slugify } from "../organizations/organizations.service";
import type { AddResourceUrlDto } from "./dto/add-resource-url.dto";
import type { AddRssFeedDto } from "./dto/add-rss-feed.dto";
import type { UseResourceForGenerationDto } from "./dto/use-resource-for-generation.dto";
import { assertPublicHttpUrl, safeFetchText } from "./safe-fetch";

@Injectable()
export class CurationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentGenerationService: ContentGenerationService,
    private readonly historyDuplicatesService: HistoryDuplicatesService,
    private readonly jobs: ScheduledJobsService,
  ) {}

  async listCuration(
    organizationContext: ActiveOrganizationContext,
  ): Promise<CurationPayload> {
    const organizationId = organizationContext.organization.id;
    const [resources, feeds, tags] = await Promise.all([
      this.prisma.curatedResource.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: curatedResourceSelect,
        where: {
          organizationId,
          status: {
            not: "ARCHIVED",
          },
        },
      }),
      this.prisma.sourceFeed.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: sourceFeedSelect,
        where: {
          organizationId,
        },
      }),
      this.prisma.tag.findMany({
        orderBy: {
          name: "asc",
        },
        select: tagSelect,
        where: {
          organizationId,
        },
      }),
    ]);

    return {
      canEdit:
        ROLE_ORDER[organizationContext.membership.role] >= ROLE_ORDER.EDITOR,
      feeds: feeds.map(toSourceFeedPayload),
      resources: resources.map(toCuratedResourcePayload),
      tags: tags.map(toTagPayload),
    };
  }

  async getResourceDetail(
    organizationContext: ActiveOrganizationContext,
    resourceId: string,
  ): Promise<CuratedResourceDetailPayload> {
    return {
      canEdit:
        ROLE_ORDER[organizationContext.membership.role] >= ROLE_ORDER.EDITOR,
      resource: await this.getResourcePayload(
        organizationContext.organization.id,
        resourceId,
      ),
    };
  }

  async importDueFeeds(): Promise<{
    failedFeeds: number;
    importedResources: number;
    processedFeeds: number;
  }> {
    const now = new Date();
    const feeds = await this.prisma.sourceFeed.findMany({
      orderBy: { nextFetchAt: "asc" },
      select: sourceFeedSelect,
      take: 50,
      where: {
        OR: [{ nextFetchAt: null }, { nextFetchAt: { lte: now } }],
        status: { in: ["ACTIVE", "ERROR"] },
      },
    });
    let failedFeeds = 0;
    let importedResources = 0;

    for (const feed of feeds) {
      try {
        importedResources +=
          (await this.importFeedResourcesWithLease(
            feed.organizationId,
            feed,
            false,
          )) ?? 0;
      } catch {
        failedFeeds += 1;
      }
    }

    return {
      failedFeeds,
      importedResources,
      processedFeeds: feeds.length,
    };
  }

  async addResourceUrl(
    organizationContext: ActiveOrganizationContext,
    input: AddResourceUrlDto,
  ): Promise<CurationResourceMutationPayload> {
    const organizationId = organizationContext.organization.id;
    const url = normalizeUrl(input.url);
    await assertPublicHttpUrl(url);
    const existing = await this.prisma.curatedResource.findUnique({
      select: curatedResourceSelect,
      where: {
        organizationId_url: {
          organizationId,
          url,
        },
      },
    });

    if (existing) {
      throw new ConflictException("Cette URL existe déjà dans la veille.");
    }

    const metadata = await extractUrlMetadata(url);
    const resource = await this.prisma.curatedResource.create({
      data: {
        description: metadata.description,
        organizationId,
        source: metadata.sourceName,
        sourceName: metadata.sourceName,
        title: metadata.title,
        topic: input.topic ?? metadata.topic,
        type: "URL",
        url,
      },
      select: curatedResourceSelect,
    });

    await this.syncResourceTags(
      organizationId,
      resource.id,
      input.tagNames ?? [],
    );

    return {
      resource: await this.getResourcePayload(organizationId, resource.id),
    };
  }

  async addRssFeed(
    organizationContext: ActiveOrganizationContext,
    input: AddRssFeedDto,
  ): Promise<CurationFeedMutationPayload> {
    const organizationId = organizationContext.organization.id;
    const url = normalizeUrl(input.url);
    await assertPublicHttpUrl(url);
    const feedTitle = input.title ?? (await extractFeedTitle(url)) ?? url;
    const feed = await this.prisma.sourceFeed.upsert({
      create: {
        organizationId,
        title: feedTitle,
        url,
      },
      select: sourceFeedSelect,
      update: {
        status: "ACTIVE",
        title: feedTitle,
      },
      where: {
        organizationId_url: {
          organizationId,
          url,
        },
      },
    });
    const importedCount =
      (await this.importFeedResourcesWithLease(organizationId, feed, true)) ??
      0;

    return {
      feed: await this.getFeedPayload(organizationId, feed.id),
      importedCount,
    };
  }

  async importFeed(
    organizationContext: ActiveOrganizationContext,
    feedId: string,
  ): Promise<CurationFeedMutationPayload> {
    const organizationId = organizationContext.organization.id;
    const feed = await this.findFeedOrThrow(organizationId, feedId);
    const importedCount =
      (await this.importFeedResourcesWithLease(organizationId, feed, true)) ??
      0;

    return {
      feed: await this.getFeedPayload(organizationId, feed.id),
      importedCount,
    };
  }

  async summarizeResource(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    resourceId: string,
  ): Promise<CurationResourceMutationPayload> {
    const organizationId = organizationContext.organization.id;
    const resource = await this.findResourceOrThrow(organizationId, resourceId);
    const summary = await this.contentGenerationService.summarizeResource({
      content: buildResourceContent(resource),
      history: await this.loadResourceHistory(organizationId),
      organizationId,
      resultResourceId: resource.id,
      source: resource.sourceName ?? resource.source ?? undefined,
      title: resource.title,
      topic: resource.topic ?? undefined,
      url: resource.url,
      userId,
    });
    const updated = await this.prisma.curatedResource.update({
      data: {
        keyPoints: summary.keyPoints,
        status: "SUMMARIZED",
        summary: summary.summary,
        topic: summary.suggestedTopic ?? resource.topic,
      },
      select: curatedResourceSelect,
      where: {
        id: resource.id,
      },
    });

    return {
      resource: toCuratedResourcePayload(updated),
    };
  }

  async useResourceForGeneration(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    resourceId: string,
    input: UseResourceForGenerationDto,
  ): Promise<GeneratedContentPayload> {
    const organizationId = organizationContext.organization.id;
    const resource = await this.findResourceOrThrow(organizationId, resourceId);
    const brief = [
      input.brief ?? "Creer un contenu a partir de cette ressource de veille.",
      `Ressource: ${resource.title}`,
      `URL source: ${resource.url}`,
      resource.summary ? `Resume: ${resource.summary}` : null,
      resource.keyPoints.length > 0
        ? `Points cles: ${resource.keyPoints.join(" | ")}`
        : null,
      resource.description ? `Description: ${resource.description}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const generated =
      await this.contentGenerationService.generateMarketingContent({
        brief,
        format: input.format,
        history: await this.loadContentHistory(organizationId),
        organizationId,
        resultResourceId: resource.id,
        settings: {
          ...(input.creativity ? { creativity: input.creativity } : {}),
          ...(input.language ? { language: input.language } : {}),
          ...(input.targetLength ? { targetLength: input.targetLength } : {}),
          ...(input.toneIntensity
            ? { toneIntensity: input.toneIntensity }
            : {}),
        },
        userId,
      });
    const duplicate = await this.detectDuplicate(
      organizationId,
      generated.title,
      generated.body,
    );

    await this.prisma.curatedResource.update({
      data: {
        status: "USED",
      },
      where: {
        id: resource.id,
      },
    });

    return {
      draft: {
        ...generated,
        duplicate,
        format: input.format,
      },
      sourceIdea: null,
    };
  }

  private async importFeedResources(
    organizationId: string,
    feed: SourceFeedRecord,
  ): Promise<number> {
    try {
      await assertPublicHttpUrl(feed.url);
      const xml = await fetchText(feed.url);
      const items = parseFeedItems(xml, feed.url).slice(0, 20);
      let importedCount = 0;

      for (const item of items) {
        if (!item.url || !item.title) {
          continue;
        }

        await assertPublicHttpUrl(item.url);

        const existing = await this.prisma.curatedResource.findUnique({
          select: {
            id: true,
          },
          where: {
            organizationId_url: {
              organizationId,
              url: item.url,
            },
          },
        });

        if (existing) {
          continue;
        }

        await this.prisma.curatedResource.create({
          data: {
            description: item.description,
            organizationId,
            publishedAt: item.publishedAt,
            source: feed.title,
            sourceFeedId: feed.id,
            sourceName: feed.title,
            title: item.title,
            type: "RSS",
            url: item.url,
          },
        });
        importedCount += 1;
      }

      await this.prisma.sourceFeed.update({
        data: {
          lastError: null,
          lastFetchedAt: new Date(),
          nextFetchAt: new Date(Date.now() + 60 * 60 * 1_000),
          failureCount: 0,
          status: "ACTIVE",
        },
        where: {
          id: feed.id,
        },
      });

      return importedCount;
    } catch (error) {
      await this.prisma.sourceFeed.update({
        data: {
          lastError:
            error instanceof Error ? error.message : "Import RSS impossible.",
          failureCount: { increment: 1 },
          nextFetchAt: new Date(
            Date.now() + rssRetryBackoffMs(feed.failureCount),
          ),
          status: "ERROR",
        },
        where: {
          id: feed.id,
        },
      });

      throw new BadRequestException("Import du flux RSS impossible.");
    }
  }

  private async importFeedResourcesWithLease(
    organizationId: string,
    feed: SourceFeedRecord,
    failWhenBusy: boolean,
  ): Promise<number | null> {
    const execution = await this.jobs.runWithLease(
      `curation:feed:${feed.id}`,
      2 * 60 * 1_000,
      () => this.importFeedResources(organizationId, feed),
    );

    if (!execution.acquired) {
      if (failWhenBusy) {
        throw new ConflictException(
          "Un import de ce flux est deja en cours. Reessayez dans un instant.",
        );
      }
      return null;
    }

    return execution.result;
  }

  private async syncResourceTags(
    organizationId: string,
    resourceId: string,
    tagNames: string[],
  ): Promise<void> {
    const normalizedNames = tagNames
      .map((name) => name.trim())
      .filter(Boolean)
      .slice(0, 8);

    if (normalizedNames.length === 0) {
      return;
    }

    for (const name of normalizedNames) {
      const slug = slugify(name);
      const tag = await this.prisma.tag.upsert({
        create: {
          name,
          organizationId,
          slug,
        },
        select: {
          id: true,
        },
        update: {
          name,
        },
        where: {
          organizationId_slug: {
            organizationId,
            slug,
          },
        },
      });

      await this.prisma.resourceTag.upsert({
        create: {
          organizationId,
          resourceId,
          tagId: tag.id,
        },
        update: {},
        where: {
          resourceId_tagId: {
            resourceId,
            tagId: tag.id,
          },
        },
      });
    }
  }

  private async getResourcePayload(
    organizationId: string,
    resourceId: string,
  ): Promise<CuratedResourcePayload> {
    const resource = await this.findResourceOrThrow(organizationId, resourceId);

    return toCuratedResourcePayload(resource);
  }

  private async getFeedPayload(
    organizationId: string,
    feedId: string,
  ): Promise<SourceFeedPayload> {
    const feed = await this.findFeedOrThrow(organizationId, feedId);

    return toSourceFeedPayload(feed);
  }

  private async findResourceOrThrow(
    organizationId: string,
    resourceId: string,
  ): Promise<CuratedResourceRecord> {
    const resource = await this.prisma.curatedResource.findFirst({
      select: curatedResourceSelect,
      where: {
        id: resourceId,
        organizationId,
      },
    });

    if (!resource) {
      throw new NotFoundException("Ressource de veille introuvable.");
    }

    return resource;
  }

  private async findFeedOrThrow(
    organizationId: string,
    feedId: string,
  ): Promise<SourceFeedRecord> {
    const feed = await this.prisma.sourceFeed.findFirst({
      select: sourceFeedSelect,
      where: {
        id: feedId,
        organizationId,
      },
    });

    if (!feed) {
      throw new NotFoundException("Flux RSS introuvable.");
    }

    return feed;
  }

  private async loadResourceHistory(organizationId: string): Promise<string[]> {
    const resources = await this.prisma.curatedResource.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        summary: true,
        title: true,
        topic: true,
      },
      take: 8,
      where: {
        organizationId,
        status: {
          not: "ARCHIVED",
        },
      },
    });

    return resources.map((resource) => {
      return `Ressource: ${resource.title}. Thematique: ${
        resource.topic ?? "non precisee"
      }. ${resource.summary ?? ""}`;
    });
  }

  private async loadContentHistory(organizationId: string): Promise<string[]> {
    const contents = await this.prisma.contentItem.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        body: true,
        title: true,
        topic: true,
      },
      take: 8,
      where: {
        deletedAt: null,
        organizationId,
        status: {
          not: "DELETED",
        },
      },
    });

    return contents.map((content) => {
      return `Contenu: ${content.title}. Thematique: ${
        content.topic ?? "non precisee"
      }. ${content.body.slice(0, 420)}`;
    });
  }

  private async detectDuplicate(
    organizationId: string,
    title: string,
    body: string,
  ): Promise<ContentDuplicatePayload> {
    const duplicate = await this.historyDuplicatesService.checkDuplicate(
      organizationId,
      {
        targetType: "CONTENT",
        text: body,
        title,
      },
    );

    return toContentDuplicatePayload(duplicate);
  }
}

const tagSelect = {
  color: true,
  id: true,
  name: true,
  slug: true,
} as const;

const sourceFeedSelect = {
  createdAt: true,
  failureCount: true,
  id: true,
  lastError: true,
  lastFetchedAt: true,
  nextFetchAt: true,
  organizationId: true,
  status: true,
  title: true,
  updatedAt: true,
  url: true,
} as const;

const curatedResourceSelect = {
  createdAt: true,
  description: true,
  id: true,
  keyPoints: true,
  organizationId: true,
  publishedAt: true,
  resourceTags: {
    select: {
      tag: {
        select: tagSelect,
      },
    },
  },
  source: true,
  sourceFeedId: true,
  sourceName: true,
  status: true,
  summary: true,
  title: true,
  topic: true,
  type: true,
  updatedAt: true,
  url: true,
} as const;

type TagRecord = {
  color: string | null;
  id: string;
  name: string;
  slug: string;
};

type SourceFeedRecord = {
  createdAt: Date | string;
  failureCount: number;
  id: string;
  lastError: string | null;
  lastFetchedAt: Date | string | null;
  nextFetchAt: Date | string | null;
  organizationId: string;
  status: SourceFeedStatus;
  title: string;
  updatedAt: Date | string;
  url: string;
};

type CuratedResourceRecord = {
  createdAt: Date | string;
  description: string | null;
  id: string;
  keyPoints: string[];
  organizationId: string;
  publishedAt: Date | string | null;
  resourceTags: { tag: TagRecord }[];
  source: string | null;
  sourceFeedId: string | null;
  sourceName: string | null;
  status: ResourceStatus;
  summary: string | null;
  title: string;
  topic: string | null;
  type: ResourceType;
  updatedAt: Date | string;
  url: string;
};

type FeedItem = {
  description: string | null;
  publishedAt: Date | null;
  title: string;
  url: string;
};

function toCuratedResourcePayload(
  resource: CuratedResourceRecord,
): CuratedResourcePayload {
  return {
    createdAt: toIsoString(resource.createdAt),
    description: resource.description,
    id: resource.id,
    keyPoints: resource.keyPoints,
    organizationId: resource.organizationId,
    publishedAt: resource.publishedAt
      ? toIsoString(resource.publishedAt)
      : null,
    sourceFeedId: resource.sourceFeedId,
    sourceName: resource.sourceName ?? resource.source,
    status: resource.status,
    summary: resource.summary,
    tags: resource.resourceTags.map((resourceTag) =>
      toTagPayload(resourceTag.tag),
    ),
    title: resource.title,
    topic: resource.topic,
    type: resource.type,
    updatedAt: toIsoString(resource.updatedAt),
    url: resource.url,
  };
}

function toSourceFeedPayload(feed: SourceFeedRecord): SourceFeedPayload {
  return {
    createdAt: toIsoString(feed.createdAt),
    id: feed.id,
    lastError: feed.lastError,
    lastFetchedAt: feed.lastFetchedAt ? toIsoString(feed.lastFetchedAt) : null,
    organizationId: feed.organizationId,
    status: feed.status,
    title: feed.title,
    updatedAt: toIsoString(feed.updatedAt),
    url: feed.url,
  };
}

function toTagPayload(tag: TagRecord): ContentTagPayload {
  return {
    color: tag.color,
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
  };
}

async function extractFeedTitle(url: string): Promise<string | null> {
  try {
    const xml = await fetchText(url);
    return extractXmlValue(xml, "title");
  } catch {
    return null;
  }
}

async function extractUrlMetadata(url: string): Promise<{
  description: string | null;
  sourceName: string | null;
  title: string;
  topic: string | null;
}> {
  try {
    const html = await fetchText(url);
    const title =
      extractHtmlTitle(html) ??
      extractMetaContent(html, "og:title") ??
      new URL(url).hostname;

    return {
      description:
        extractMetaContent(html, "description") ??
        extractMetaContent(html, "og:description"),
      sourceName:
        extractMetaContent(html, "og:site_name") ?? new URL(url).hostname,
      title,
      topic: extractMetaContent(html, "article:section"),
    };
  } catch {
    return {
      description: null,
      sourceName: new URL(url).hostname,
      title: new URL(url).hostname,
      topic: null,
    };
  }
}

async function fetchText(url: string): Promise<string> {
  return safeFetchText(url);
}

export function parseFeedItems(xml: string, baseUrl?: string): FeedItem[] {
  const itemBlocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(
    (match) => match[0],
  );
  const entryBlocks = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map(
    (match) => match[0],
  );

  return [...itemBlocks, ...entryBlocks].map((block) => {
    const url = normalizeFeedUrl(
      extractXmlValue(block, "link") ?? extractAtomLink(block) ?? "",
      baseUrl,
    );
    const pubDate =
      extractXmlValue(block, "pubDate") ?? extractXmlValue(block, "updated");
    const parsedDate = pubDate ? new Date(pubDate) : null;

    return {
      description:
        extractXmlValue(block, "description") ??
        extractXmlValue(block, "summary"),
      publishedAt:
        parsedDate && Number.isFinite(parsedDate.getTime()) ? parsedDate : null,
      title: extractXmlValue(block, "title") ?? url,
      url,
    };
  });
}

function extractHtmlTitle(html: string): string | null {
  return decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
}

function extractMetaContent(html: string, name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escapedName}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );

  return decodeEntities(html.match(pattern)?.[1]);
}

function extractXmlValue(xml: string, tagName: string): string | null {
  const escapedName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<${escapedName}\\b[^>]*>([\\s\\S]*?)<\\/${escapedName}>`,
    "i",
  );

  return decodeEntities(xml.match(pattern)?.[1]);
}

function extractAtomLink(xml: string): string | null {
  return decodeEntities(
    xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1],
  );
}

function decodeEntities(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const decoded = value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  return decoded || null;
}

function normalizeFeedUrl(value: string, baseUrl?: string): string {
  const trimmed = value.trim();

  if (!trimmed) return "";

  try {
    const resolved = baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed);
    if (!["http:", "https:"].includes(resolved.protocol)) return "";
    resolved.hash = "";
    return resolved.toString();
  } catch {
    return "";
  }
}

function normalizeUrl(value: string): string {
  const url = new URL(value);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new BadRequestException("URL http ou https requise.");
  }

  url.hash = "";
  return url.toString();
}

function buildResourceContent(resource: CuratedResourceRecord): string {
  return [
    resource.title,
    resource.description,
    resource.summary,
    resource.keyPoints.join("\n"),
    resource.topic ? `Thematique: ${resource.topic}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function toContentDuplicatePayload(
  duplicate: DuplicateCheckPayload,
): ContentDuplicatePayload {
  return {
    matchedContentId: duplicate.matchedId,
    matchedTitle: duplicate.matchedTitle,
    score: duplicate.score,
    warning: duplicate.warning,
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export function rssRetryBackoffMs(previousFailureCount: number): number {
  const exponent = Math.min(Math.max(previousFailureCount, 0), 6);
  return Math.min(24 * 60 * 60 * 1_000, 15 * 60 * 1_000 * 2 ** exponent);
}
