import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  DuplicateCheckPayload,
  HistoryItemType,
} from "@content-ai/shared";

import { PrismaService } from "../database/prisma.service";
import {
  DEFAULT_DUPLICATE_WARNING_THRESHOLD,
  findBestSimilarityMatch,
} from "./history-similarity";

type DuplicateInput = {
  excludedId?: string | null | undefined;
  format?: string | null | undefined;
  targetType: HistoryItemType;
  text?: string | null | undefined;
  title: string;
  topic?: string | null | undefined;
};

@Injectable()
export class HistoryDuplicatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async checkDuplicate(
    organizationId: string,
    input: DuplicateInput,
  ): Promise<DuplicateCheckPayload> {
    const [ideas, contents] = await Promise.all([
      this.prisma.contentIdea.findMany({
        select: {
          angle: true,
          category: true,
          id: true,
          recommendedFormat: true,
          title: true,
        },
        where: {
          archivedAt: null,
          organizationId,
          status: {
            in: ["DRAFT", "SAVED", "USED"],
          },
        },
      }),
      this.prisma.contentItem.findMany({
        select: {
          body: true,
          format: true,
          id: true,
          title: true,
          topic: true,
        },
        where: {
          deletedAt: null,
          organizationId,
          status: {
            not: "DELETED",
          },
        },
      }),
    ]);
    const candidates = [
      ...ideas
        .filter((idea) => {
          return input.targetType !== "IDEA" || idea.id !== input.excludedId;
        })
        .map((idea) => {
          return {
            id: idea.id,
            text: buildHistoryText({
              format: idea.recommendedFormat,
              text: idea.angle,
              title: idea.title,
              topic: idea.category,
            }),
            title: idea.title,
            type: "IDEA" as const,
          };
        }),
      ...contents
        .filter((content) => {
          return (
            input.targetType !== "CONTENT" || content.id !== input.excludedId
          );
        })
        .map((content) => {
          return {
            id: content.id,
            text: buildHistoryText({
              format: content.format,
              text: content.body,
              title: content.title,
              topic: content.topic,
            }),
            title: content.title,
            type: "CONTENT" as const,
          };
        }),
    ];
    const match = findBestSimilarityMatch(buildHistoryText(input), candidates);
    const threshold = this.resolveThreshold();

    return {
      matchedId: match.candidate && match.score > 0 ? match.candidate.id : null,
      matchedTitle:
        match.candidate && match.score > 0 ? match.candidate.title : null,
      matchedType:
        match.candidate && match.score > 0 ? match.candidate.type : null,
      score: match.score,
      targetType: input.targetType,
      threshold,
      warning: match.score >= threshold,
    };
  }

  resolveThreshold(): number {
    const rawValue = this.configService
      .get<string>("DUPLICATE_WARNING_THRESHOLD")
      ?.trim();
    const parsedValue = rawValue ? Number.parseFloat(rawValue) : Number.NaN;

    if (!Number.isFinite(parsedValue) || parsedValue <= 0 || parsedValue > 1) {
      return DEFAULT_DUPLICATE_WARNING_THRESHOLD;
    }

    return parsedValue;
  }
}

export function buildHistoryText(input: {
  format?: string | null | undefined;
  text?: string | null | undefined;
  title: string;
  topic?: string | null | undefined;
}): string {
  return [input.title, input.topic, input.format, input.text]
    .filter(Boolean)
    .join(" ");
}
