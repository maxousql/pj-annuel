import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ContentDuplicatePayload,
  ContentFormat,
  ContentGenerationFormat,
  ContentIdeaOption,
  ContentIdeaStatus,
  ContentItemPayload,
  ContentItemStatus,
  ContentMutationPayload,
  ContentSaveStatus,
  ContentSource,
  DuplicateCheckPayload,
  GeneratedContentPayload,
} from "@content-ai/shared";

import { ContentGenerationService } from "../ai/content-generation.service";
import { PrismaService } from "../database/prisma.service";
import { HistoryDuplicatesService } from "../history/history-duplicates.service";
import type { ActiveOrganizationContext } from "../organizations/organizations.types";
import type { GenerateContentDto } from "./dto/generate-content.dto";
import type { SaveContentDto } from "./dto/save-content.dto";
import type { UpdateContentDto } from "./dto/update-content.dto";

@Injectable()
export class ContentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentGenerationService: ContentGenerationService,
    private readonly historyDuplicatesService: HistoryDuplicatesService,
  ) {}

  async listContents(
    organizationContext: ActiveOrganizationContext,
  ): Promise<ContentItemPayload[]> {
    const contents = await this.prisma.contentItem.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: contentItemSelect,
      where: {
        deletedAt: null,
        organizationId: organizationContext.organization.id,
        status: {
          not: "DELETED",
        },
      },
    });

    return contents.map(toContentItemPayload);
  }

  async listSourceIdeas(
    organizationContext: ActiveOrganizationContext,
  ): Promise<ContentIdeaOption[]> {
    const ideas = await this.prisma.contentIdea.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: contentIdeaSelect,
      take: 50,
      where: {
        archivedAt: null,
        organizationId: organizationContext.organization.id,
        status: {
          in: ["SAVED", "DRAFT"],
        },
      },
    });

    return ideas.map(toContentIdeaOption);
  }

  async generateDraft(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    input: GenerateContentDto,
  ): Promise<GeneratedContentPayload> {
    const sourceIdea = input.ideaId
      ? await this.findIdeaOrThrow(
          organizationContext.organization.id,
          input.ideaId,
        )
      : null;
    const brief = normalizeOptionalString(input.brief);

    if (!brief && !sourceIdea) {
      throw new BadRequestException("Brief ou idee source requis.");
    }

    const generationBrief =
      brief ??
      `Developper cette idee: ${sourceIdea?.title ?? ""}. Angle: ${
        sourceIdea?.angle ?? ""
      }.`;
    const history = await this.loadGenerationHistory(
      organizationContext.organization.id,
    );
    const generationInput = {
      brief: generationBrief,
      format: input.format,
      history,
      organizationId: organizationContext.organization.id,
      userId,
    };

    const generated =
      await this.contentGenerationService.generateMarketingContent(
        sourceIdea
          ? {
              ...generationInput,
              idea: {
                angle: sourceIdea.angle,
                title: sourceIdea.title,
              },
            }
          : generationInput,
      );
    const duplicate = await this.detectDuplicate(
      organizationContext.organization.id,
      generated.title,
      generated.body,
    );

    return {
      draft: {
        ...generated,
        duplicate,
        format: input.format,
      },
      sourceIdea: sourceIdea ? toContentIdeaOption(sourceIdea) : null,
    };
  }

  async saveContent(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    input: SaveContentDto,
  ): Promise<ContentMutationPayload> {
    const sourceIdea = input.ideaId
      ? await this.findIdeaOrThrow(
          organizationContext.organization.id,
          input.ideaId,
        )
      : null;
    const duplicate = await this.detectDuplicate(
      organizationContext.organization.id,
      input.title,
      input.body,
    );
    const content = await this.prisma.contentItem.create({
      data: {
        body: input.body,
        brief: normalizeOptionalString(input.brief),
        createdById: userId,
        duplicateScore: duplicate.score,
        format: input.format,
        ideaId: sourceIdea?.id ?? null,
        organizationId: organizationContext.organization.id,
        source: "AI_GENERATED",
        status: input.status ?? "DRAFT",
        title: input.title,
        topic: resolveTopic(input.topic, sourceIdea),
      },
      select: contentItemSelect,
    });

    return {
      content: toContentItemPayload(content),
      duplicate,
    };
  }

  async getContent(
    organizationContext: ActiveOrganizationContext,
    contentId: string,
  ): Promise<ContentItemPayload> {
    const content = await this.prisma.contentItem.findFirst({
      select: contentItemSelect,
      where: {
        deletedAt: null,
        id: contentId,
        organizationId: organizationContext.organization.id,
        status: {
          not: "DELETED",
        },
      },
    });

    if (!content) {
      throw new NotFoundException("Contenu introuvable.");
    }

    return toContentItemPayload(content);
  }

  async updateContent(
    organizationContext: ActiveOrganizationContext,
    contentId: string,
    input: UpdateContentDto,
  ): Promise<ContentMutationPayload> {
    const existingContent = await this.prisma.contentItem.findFirst({
      select: contentItemSelect,
      where: {
        deletedAt: null,
        id: contentId,
        organizationId: organizationContext.organization.id,
        status: {
          not: "DELETED",
        },
      },
    });

    if (!existingContent) {
      throw new NotFoundException("Contenu introuvable.");
    }

    const sourceIdea = input.ideaId
      ? await this.findIdeaOrThrow(
          organizationContext.organization.id,
          input.ideaId,
        )
      : null;
    const nextTitle = input.title ?? existingContent.title;
    const nextBody = input.body ?? existingContent.body;
    const duplicate = await this.detectDuplicate(
      organizationContext.organization.id,
      nextTitle,
      nextBody,
      existingContent.id,
    );
    const data = buildContentUpdateData(input, sourceIdea, duplicate.score);
    const content = await this.prisma.contentItem.update({
      data,
      select: contentItemSelect,
      where: {
        id: existingContent.id,
      },
    });

    return {
      content: toContentItemPayload(content),
      duplicate,
    };
  }

  private async findIdeaOrThrow(
    organizationId: string,
    ideaId: string,
  ): Promise<ContentIdeaRecord> {
    const idea = await this.prisma.contentIdea.findFirst({
      select: contentIdeaSelect,
      where: {
        archivedAt: null,
        id: ideaId,
        organizationId,
      },
    });

    if (!idea) {
      throw new BadRequestException("Idee source introuvable.");
    }

    return idea;
  }

  private async loadGenerationHistory(
    organizationId: string,
  ): Promise<string[]> {
    const history = await this.prisma.contentItem.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        body: true,
        title: true,
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

    return history.map((content) => {
      return `${content.title}: ${content.body.slice(0, 420)}`;
    });
  }

  private async detectDuplicate(
    organizationId: string,
    title: string,
    body: string,
    excludedContentId?: string,
  ): Promise<ContentDuplicatePayload> {
    const duplicate = await this.historyDuplicatesService.checkDuplicate(
      organizationId,
      {
        excludedId: excludedContentId,
        targetType: "CONTENT",
        text: body,
        title,
      },
    );

    return toContentDuplicatePayload(duplicate);
  }
}

function toContentDuplicatePayload(
  duplicate: DuplicateCheckPayload,
): ContentDuplicatePayload {
  return {
    matchedContentId:
      duplicate.matchedType === "CONTENT" ? duplicate.matchedId : null,
    matchedTitle: duplicate.matchedTitle,
    score: duplicate.score,
    warning: duplicate.warning,
  };
}

const contentItemSelect = {
  archivedAt: true,
  body: true,
  brief: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  categoryId: true,
  contentTags: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      tag: {
        select: {
          color: true,
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
  createdAt: true,
  duplicateScore: true,
  format: true,
  id: true,
  ideaId: true,
  organizationId: true,
  publishedAt: true,
  source: true,
  status: true,
  title: true,
  topic: true,
  updatedAt: true,
} as const;

const contentIdeaSelect = {
  angle: true,
  category: true,
  createdAt: true,
  id: true,
  recommendedFormat: true,
  status: true,
  title: true,
} as const;

type ContentItemRecord = {
  archivedAt: Date | string | null;
  body: string;
  brief: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  categoryId: string | null;
  contentTags: {
    tag: {
      color: string | null;
      id: string;
      name: string;
      slug: string;
    };
  }[];
  createdAt: Date | string;
  duplicateScore: number | null;
  format: ContentFormat;
  id: string;
  ideaId: string | null;
  organizationId: string;
  publishedAt: Date | string | null;
  source: ContentSource;
  status: ContentItemStatus;
  title: string;
  topic: string | null;
  updatedAt: Date | string;
};

type ContentIdeaRecord = {
  angle: string;
  category: string | null;
  createdAt: Date | string;
  id: string;
  recommendedFormat: ContentFormat;
  status: ContentIdeaStatus;
  title: string;
};

type ContentUpdateData = {
  body?: string;
  brief?: string | null;
  duplicateScore: number;
  format?: ContentGenerationFormat;
  ideaId?: string;
  status?: ContentSaveStatus;
  title?: string;
  topic?: string | null;
};

function buildContentUpdateData(
  input: UpdateContentDto,
  sourceIdea: ContentIdeaRecord | null,
  duplicateScore: number,
): ContentUpdateData {
  const data: ContentUpdateData = {
    duplicateScore,
  };

  if (input.title) {
    data.title = input.title;
  }

  if (input.body) {
    data.body = input.body;
  }

  if (input.format) {
    data.format = input.format;
  }

  if (input.status) {
    data.status = input.status;
  }

  if (input.ideaId && sourceIdea) {
    data.ideaId = sourceIdea.id;
  }

  if (input.brief !== undefined) {
    data.brief = normalizeOptionalString(input.brief);
  }

  if (input.topic !== undefined || sourceIdea) {
    data.topic = resolveTopic(input.topic, sourceIdea);
  }

  return data;
}

function resolveTopic(
  topic: string | undefined,
  idea: ContentIdeaRecord | null,
): string | null {
  return normalizeOptionalString(topic) ?? idea?.category ?? null;
}

function normalizeOptionalString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toContentItemPayload(content: ContentItemRecord): ContentItemPayload {
  return {
    archivedAt: toNullableIsoString(content.archivedAt),
    body: content.body,
    brief: content.brief,
    category: content.category
      ? {
          id: content.category.id,
          name: content.category.name,
          slug: content.category.slug,
        }
      : null,
    categoryId: content.categoryId,
    createdAt: toIsoString(content.createdAt),
    duplicateScore: content.duplicateScore,
    format: content.format,
    id: content.id,
    ideaId: content.ideaId,
    organizationId: content.organizationId,
    publishedAt: toNullableIsoString(content.publishedAt),
    source: content.source,
    status: content.status,
    tags: content.contentTags.map((contentTag) => ({
      color: contentTag.tag.color,
      id: contentTag.tag.id,
      name: contentTag.tag.name,
      slug: contentTag.tag.slug,
    })),
    title: content.title,
    topic: content.topic,
    updatedAt: toIsoString(content.updatedAt),
  };
}

function toNullableIsoString(value: Date | string | null): string | null {
  return value ? toIsoString(value) : null;
}

function toContentIdeaOption(idea: ContentIdeaRecord): ContentIdeaOption {
  return {
    angle: idea.angle,
    category: idea.category,
    createdAt: toIsoString(idea.createdAt),
    id: idea.id,
    recommendedFormat: idea.recommendedFormat,
    status: idea.status,
    title: idea.title,
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
