import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  ContentFormat,
  ContentIdeaDuplicatePayload,
  ContentIdeaPayload,
  ContentIdeaStatus,
  DuplicateCheckPayload,
  GeneratedContentIdeasPayload,
  GeneratedContentIdeaSuggestion,
} from "@content-ai/shared";

import { ContentGenerationService } from "../ai/content-generation.service";
import { PrismaService } from "../database/prisma.service";
import { HistoryDuplicatesService } from "../history/history-duplicates.service";
import type { ActiveOrganizationContext } from "../organizations/organizations.types";
import type { GenerateIdeasDto } from "./dto/generate-ideas.dto";
import type { CheckIdeaDuplicateDto, SaveIdeaDto } from "./dto/save-idea.dto";
import type { UpdateIdeaStatusDto } from "./dto/update-idea-status.dto";

@Injectable()
export class IdeasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentGenerationService: ContentGenerationService,
    private readonly historyDuplicatesService: HistoryDuplicatesService,
  ) {}

  async listIdeas(
    organizationContext: ActiveOrganizationContext,
  ): Promise<ContentIdeaPayload[]> {
    const ideas = await this.prisma.contentIdea.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: contentIdeaSelect,
      where: {
        archivedAt: null,
        organizationId: organizationContext.organization.id,
        status: {
          in: ["DRAFT", "SAVED", "USED"],
        },
      },
    });

    return ideas.map(toContentIdeaPayload);
  }

  async generateIdeas(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    input: GenerateIdeasDto,
  ): Promise<GeneratedContentIdeasPayload> {
    const organizationId = organizationContext.organization.id;
    const history = await this.loadGenerationHistory(organizationId);
    const generated = await this.contentGenerationService.generateContentIdeas({
      ...(input.brief ? { brief: input.brief } : {}),
      count: input.count ?? 5,
      ...(input.format ? { format: input.format } : {}),
      history,
      organizationId,
      ...(input.topic ? { topic: input.topic } : {}),
      userId,
    });

    const ideas = await Promise.all(
      generated.ideas.map(
        async (idea): Promise<GeneratedContentIdeaSuggestion> => {
          const duplicate = await this.detectDuplicate(organizationId, {
            angle: idea.angle,
            category: idea.category,
            title: idea.title,
          });

          return {
            ...idea,
            duplicate,
          };
        },
      ),
    );

    return { ideas };
  }

  async checkDuplicate(
    organizationContext: ActiveOrganizationContext,
    input: CheckIdeaDuplicateDto,
  ): Promise<ContentIdeaDuplicatePayload> {
    return this.detectDuplicate(organizationContext.organization.id, input);
  }

  async saveIdea(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    input: SaveIdeaDto,
  ) {
    const organizationId = organizationContext.organization.id;
    const duplicate = await this.detectDuplicate(organizationId, input);
    const idea = await this.prisma.contentIdea.create({
      data: {
        angle: input.angle,
        category: normalizeOptionalString(input.category),
        createdById: userId,
        justification: input.justification,
        organizationId,
        recommendedFormat: input.recommendedFormat,
        status: "SAVED",
        title: input.title,
      },
      select: contentIdeaSelect,
    });

    return {
      duplicate,
      idea: toContentIdeaPayload(idea),
    };
  }

  async updateIdeaStatus(
    organizationContext: ActiveOrganizationContext,
    ideaId: string,
    input: UpdateIdeaStatusDto,
  ): Promise<ContentIdeaPayload> {
    const existingIdea = await this.prisma.contentIdea.findFirst({
      select: {
        id: true,
      },
      where: {
        archivedAt: null,
        id: ideaId,
        organizationId: organizationContext.organization.id,
      },
    });

    if (!existingIdea) {
      throw new NotFoundException("Idee introuvable.");
    }

    const idea = await this.prisma.contentIdea.update({
      data: {
        archivedAt: input.status === "ARCHIVED" ? new Date() : null,
        status: input.status,
      },
      select: contentIdeaSelect,
      where: {
        id: existingIdea.id,
      },
    });

    return toContentIdeaPayload(idea);
  }

  private async loadGenerationHistory(
    organizationId: string,
  ): Promise<string[]> {
    const [ideas, contents] = await Promise.all([
      this.prisma.contentIdea.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          angle: true,
          category: true,
          title: true,
        },
        take: 8,
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
      }),
    ]);

    return [
      ...ideas.map((idea) => {
        return `Idee: ${idea.title}. Angle: ${idea.angle}. Thematique: ${
          idea.category ?? "non precisee"
        }.`;
      }),
      ...contents.map((content) => {
        return `Contenu: ${content.title}. Thematique: ${
          content.topic ?? "non precisee"
        }. ${content.body.slice(0, 420)}`;
      }),
    ];
  }

  private async detectDuplicate(
    organizationId: string,
    input: {
      angle: string;
      category?: string | null;
      title: string;
    },
  ): Promise<ContentIdeaDuplicatePayload> {
    const duplicate = await this.historyDuplicatesService.checkDuplicate(
      organizationId,
      {
        targetType: "IDEA",
        text: input.angle,
        title: input.title,
        topic: input.category,
      },
    );

    return toContentIdeaDuplicatePayload(duplicate);
  }
}

const contentIdeaSelect = {
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

type ContentIdeaRecord = {
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

function toContentIdeaPayload(idea: ContentIdeaRecord): ContentIdeaPayload {
  return {
    angle: idea.angle,
    archivedAt: idea.archivedAt ? toIsoString(idea.archivedAt) : null,
    category: idea.category,
    createdAt: toIsoString(idea.createdAt),
    id: idea.id,
    justification: idea.justification,
    organizationId: idea.organizationId,
    recommendedFormat: idea.recommendedFormat,
    status: idea.status,
    title: idea.title,
    updatedAt: toIsoString(idea.updatedAt),
  };
}

function normalizeOptionalString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toContentIdeaDuplicatePayload(
  duplicate: DuplicateCheckPayload,
): ContentIdeaDuplicatePayload {
  return {
    matchedId: duplicate.matchedId,
    matchedTitle: duplicate.matchedTitle,
    score: duplicate.score,
    source: toIdeaDuplicateSource(duplicate.matchedType),
    warning: duplicate.warning,
  };
}

function toIdeaDuplicateSource(
  matchedType: DuplicateCheckPayload["matchedType"],
): ContentIdeaDuplicatePayload["source"] {
  if (matchedType === "IDEA") {
    return "CONTENT_IDEA";
  }

  if (matchedType === "CONTENT") {
    return "CONTENT_ITEM";
  }

  return null;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
