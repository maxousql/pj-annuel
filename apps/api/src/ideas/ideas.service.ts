import { createHash } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { CONTENT_FORMATS } from "@content-ai/shared";
import type {
  ContentFormat,
  ContentIdeaDuplicatePayload,
  ContentIdeaPayload,
  ContentIdeaStatus,
  DuplicateCheckPayload,
  GeneratedContentIdeasPayload,
  GeneratedContentIdeaSuggestion,
  IdeaDiscoveryCandidatePayload,
  IdeaDiscoveryFeedPayload,
  IdeaDiscoveryFeedbackResultPayload,
  IdeaDiscoveryFormatPreferencePayload,
  IdeaDiscoveryProfilePayload,
  IdeaDiscoveryThemePreferencePayload,
} from "@content-ai/shared";

import { ContentGenerationService } from "../ai/content-generation.service";
import { CONTENT_IDEAS_PROMPT_VERSION } from "../ai/prompt-templates";
import { PrismaService } from "../database/prisma.service";
import { HistoryDuplicatesService } from "../history/history-duplicates.service";
import type { ActiveOrganizationContext } from "../organizations/organizations.types";
import type { GenerateIdeasDto } from "./dto/generate-ideas.dto";
import type { IdeaDiscoveryFeedbackDto } from "./dto/idea-discovery-feedback.dto";
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
      settings: {
        ...(input.creativity ? { creativity: input.creativity } : {}),
        ...(input.language ? { language: input.language } : {}),
        ...(input.targetLength ? { targetLength: input.targetLength } : {}),
        ...(input.toneIntensity ? { toneIntensity: input.toneIntensity } : {}),
      },
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

  async getDiscoveryFeed(
    userId: string,
    organizationContext: ActiveOrganizationContext,
  ): Promise<IdeaDiscoveryFeedPayload> {
    const organizationId = organizationContext.organization.id;
    const [candidates, profile] = await Promise.all([
      this.prisma.ideaDiscoveryCandidate.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: discoveryCandidateSelect,
        take: DISCOVERY_BATCH_SIZE,
        where: {
          feedbacks: {
            none: {
              userId,
            },
          },
          organizationId,
          savedIdea: null,
        },
      }),
      this.prisma.ideaPreferenceProfile.findUnique({
        where: {
          organizationId,
        },
      }),
    ]);

    return {
      candidates: candidates.map(toDiscoveryCandidatePayload),
      profile: toDiscoveryProfilePayload(organizationId, profile),
    };
  }

  async generateDiscoveryFeed(
    userId: string,
    organizationContext: ActiveOrganizationContext,
  ): Promise<IdeaDiscoveryFeedPayload> {
    const organizationId = organizationContext.organization.id;
    const [history, profileRecord] = await Promise.all([
      this.loadGenerationHistory(organizationId),
      this.prisma.ideaPreferenceProfile.findUnique({
        where: {
          organizationId,
        },
      }),
    ]);
    const profile = toDiscoveryProfilePayload(organizationId, profileRecord);
    const count = DISCOVERY_BATCH_SIZE;
    const explorationCount = Math.max(1, Math.round(count * 0.2));
    const generated = await this.contentGenerationService.generateContentIdeas({
      count,
      discovery: {
        explorationCount,
        preferences: {
          avoidedFormats: profile.avoidedFormats.map(({ format }) => format),
          avoidedThemes: profile.avoidedThemes.map(({ name }) => name),
          learnedSignals: profile.learnedSignals,
          preferredFormats: profile.preferredFormats.map(
            ({ format }) => format,
          ),
          preferredThemes: profile.preferredThemes.map(({ name }) => name),
        },
      },
      history,
      organizationId,
      userId,
    });

    if (generated.ideas.length !== count) {
      throw new ServiceUnavailableException(
        "La sélection générée est incomplète. Réessayez dans un instant.",
      );
    }

    const preparedCandidates = await Promise.all(
      generated.ideas.map(async (idea, index) => {
        const duplicate = await this.detectDuplicate(organizationId, {
          angle: idea.angle,
          category: idea.category,
          title: idea.title,
        });

        return {
          duplicate,
          fingerprint: createDiscoveryFingerprint(idea),
          idea,
          isExploratory: index >= generated.ideas.length - explorationCount,
        };
      }),
    );
    const fingerprints = preparedCandidates.map(
      ({ fingerprint }) => fingerprint,
    );

    if (new Set(fingerprints).size !== count) {
      throw new ServiceUnavailableException(
        "La sélection contient des propositions trop proches. Réessayez pour obtenir cinq idées distinctes.",
      );
    }

    const existingCandidates =
      await this.prisma.ideaDiscoveryCandidate.findMany({
        select: {
          fingerprint: true,
        },
        where: {
          fingerprint: {
            in: fingerprints,
          },
          organizationId,
        },
      });

    if (existingCandidates.length > 0) {
      throw new ServiceUnavailableException(
        "Certaines propositions ont déjà été présentées. Réessayez pour renouveler la sélection.",
      );
    }

    await this.prisma.$transaction(
      preparedCandidates.map(
        ({ duplicate, fingerprint, idea, isExploratory }) =>
          this.prisma.ideaDiscoveryCandidate.upsert({
            create: {
              angle: idea.angle,
              category: normalizeOptionalString(idea.category ?? undefined),
              duplicateMatchedId: duplicate.matchedId,
              duplicateMatchedTitle: duplicate.matchedTitle,
              duplicateScore: duplicate.score,
              duplicateSource: duplicate.source,
              duplicateWarning: duplicate.warning,
              fingerprint,
              generatedById: userId,
              isExploratory,
              justification: idea.justification,
              organizationId,
              promptVersion: CONTENT_IDEAS_PROMPT_VERSION,
              recommendedFormat: idea.recommendedFormat,
              title: idea.title,
            },
            update: {},
            where: {
              organizationId_fingerprint: {
                fingerprint,
                organizationId,
              },
            },
          }),
      ),
    );

    return this.getDiscoveryFeed(userId, organizationContext);
  }

  async submitDiscoveryFeedback(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    candidateId: string,
    input: IdeaDiscoveryFeedbackDto,
  ): Promise<IdeaDiscoveryFeedbackResultPayload> {
    if (input.signal !== "DISLIKE" && input.reason) {
      throw new BadRequestException(
        "Un motif ne peut être associé qu'à un refus.",
      );
    }

    const organizationId = organizationContext.organization.id;
    const candidate = await this.prisma.ideaDiscoveryCandidate.findFirst({
      select: discoveryCandidateSelect,
      where: {
        id: candidateId,
        organizationId,
      },
    });

    if (!candidate) {
      throw new NotFoundException("Proposition introuvable.");
    }

    const result = await retrySerializableTransaction(() =>
      this.prisma.$transaction(
        async (transaction) => {
          const expectedReason =
            input.signal === "DISLIKE" ? (input.reason ?? null) : null;
          const feedback = await transaction.ideaDiscoveryFeedback.upsert({
            create: {
              candidateId,
              organizationId,
              reason: expectedReason,
              signal: input.signal,
              userId,
            },
            update: {},
            where: {
              userId_candidateId: {
                candidateId,
                userId,
              },
            },
          });

          if (
            feedback.signal !== input.signal ||
            feedback.reason !== expectedReason
          ) {
            throw new ConflictException(
              "Une autre réaction a déjà été enregistrée pour cette proposition.",
            );
          }

          const idea =
            feedback.signal === "LIKE"
              ? await transaction.contentIdea.upsert({
                  create: {
                    angle: candidate.angle,
                    category: candidate.category,
                    createdById: userId,
                    discoveryCandidateId: candidate.id,
                    justification: candidate.justification,
                    organizationId,
                    recommendedFormat: candidate.recommendedFormat,
                    status: "SAVED",
                    title: candidate.title,
                  },
                  update: {},
                  select: contentIdeaSelect,
                  where: {
                    discoveryCandidateId: candidate.id,
                  },
                })
              : null;

          await this.recalculateDiscoveryProfile(organizationId, transaction);

          return { feedback, idea };
        },
        {
          isolationLevel: "Serializable",
        },
      ),
    );
    const profileRecord = await this.prisma.ideaPreferenceProfile.findUnique({
      where: {
        organizationId,
      },
    });

    return {
      candidate: toDiscoveryCandidatePayload(candidate),
      feedback: {
        candidateId,
        reason: result.feedback.reason,
        signal: result.feedback.signal,
      },
      idea: result.idea ? toContentIdeaPayload(result.idea) : null,
      profile: toDiscoveryProfilePayload(organizationId, profileRecord),
    };
  }

  async resetDiscoveryPreferences(
    organizationContext: ActiveOrganizationContext,
  ): Promise<IdeaDiscoveryProfilePayload> {
    const organizationId = organizationContext.organization.id;
    const profile = await retrySerializableTransaction(() =>
      this.prisma.$transaction(
        async (transaction) => {
          const resetAt = new Date();
          return transaction.ideaPreferenceProfile.upsert({
            create: {
              formatScores: {},
              organizationId,
              resetAt,
              themeScores: {},
            },
            update: {
              dislikedCount: 0,
              formatScores: {},
              likedCount: 0,
              resetAt,
              themeScores: {},
              updatedAt: resetAt,
            },
            where: {
              organizationId,
            },
          });
        },
        {
          isolationLevel: "Serializable",
        },
      ),
    );

    return toDiscoveryProfilePayload(organizationId, profile);
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
    const [ideas, contents, discoveryCandidates] = await Promise.all([
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
      this.prisma.ideaDiscoveryCandidate.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          angle: true,
          category: true,
          title: true,
        },
        take: 20,
        where: {
          organizationId,
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
      ...discoveryCandidates.map((candidate) => {
        return `Proposition déjà présentée: ${candidate.title}. Angle: ${
          candidate.angle
        }. Thématique: ${candidate.category ?? "non précisée"}.`;
      }),
    ];
  }

  private async recalculateDiscoveryProfile(
    organizationId: string,
    client: DiscoveryProfileClient,
  ): Promise<void> {
    const currentProfile = await client.ideaPreferenceProfile.findUnique({
      select: {
        resetAt: true,
      },
      where: {
        organizationId,
      },
    });
    const feedbacks = await client.ideaDiscoveryFeedback.findMany({
      select: {
        candidateId: true,
        reason: true,
        signal: true,
      },
      where: {
        ...(currentProfile?.resetAt
          ? {
              createdAt: {
                gt: currentProfile.resetAt,
              },
            }
          : {}),
        organizationId,
        signal: {
          in: ["LIKE", "DISLIKE"],
        },
      },
    });
    const candidates = await client.ideaDiscoveryCandidate.findMany({
      select: {
        category: true,
        id: true,
        recommendedFormat: true,
      },
      where: {
        id: {
          in: feedbacks.map(({ candidateId }) => candidateId),
        },
        organizationId,
      },
    });
    const candidatesById = new Map(
      candidates.map((candidate) => [candidate.id, candidate]),
    );
    const themeScores: Record<string, number> = {};
    const formatScores: Record<string, number> = {};
    let likedCount = 0;
    let dislikedCount = 0;

    for (const feedback of feedbacks) {
      const candidate = candidatesById.get(feedback.candidateId);
      if (!candidate) {
        continue;
      }
      const delta = feedback.signal === "LIKE" ? 1 : -1;
      if (delta > 0) {
        likedCount += 1;
      } else {
        dislikedCount += 1;
      }

      const theme = candidate.category?.trim();
      const scoreTheme =
        feedback.signal === "LIKE" ||
        !feedback.reason ||
        feedback.reason === "OFF_TOPIC";
      if (theme && scoreTheme) {
        const themeKey =
          Object.keys(themeScores).find(
            (existingTheme) =>
              existingTheme.localeCompare(theme, undefined, {
                sensitivity: "base",
              }) === 0,
          ) ?? theme;
        themeScores[themeKey] = (themeScores[themeKey] ?? 0) + delta;
      }
      const scoreFormat =
        feedback.signal === "LIKE" ||
        !feedback.reason ||
        feedback.reason === "WRONG_FORMAT";
      if (scoreFormat) {
        const format = candidate.recommendedFormat;
        formatScores[format] = (formatScores[format] ?? 0) + delta;
      }
    }

    await client.ideaPreferenceProfile.upsert({
      create: {
        dislikedCount,
        formatScores,
        likedCount,
        organizationId,
        resetAt: currentProfile?.resetAt ?? null,
        themeScores,
      },
      update: {
        dislikedCount,
        formatScores,
        likedCount,
        themeScores,
        updatedAt: new Date(),
      },
      where: {
        organizationId,
      },
    });
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

const discoveryCandidateSelect = {
  angle: true,
  category: true,
  createdAt: true,
  duplicateMatchedId: true,
  duplicateMatchedTitle: true,
  duplicateScore: true,
  duplicateSource: true,
  duplicateWarning: true,
  id: true,
  isExploratory: true,
  justification: true,
  organizationId: true,
  recommendedFormat: true,
  title: true,
} as const;

type DiscoveryProfileClient = Pick<
  PrismaService,
  "ideaDiscoveryCandidate" | "ideaDiscoveryFeedback" | "ideaPreferenceProfile"
>;

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

type DiscoveryCandidateRecord = {
  angle: string;
  category: string | null;
  createdAt: Date | string;
  duplicateMatchedId: string | null;
  duplicateMatchedTitle: string | null;
  duplicateScore: number;
  duplicateSource: string | null;
  duplicateWarning: boolean;
  id: string;
  isExploratory: boolean;
  justification: string;
  organizationId: string;
  recommendedFormat: ContentFormat;
  title: string;
};

type DiscoveryProfileRecord = {
  dislikedCount: number;
  formatScores: unknown;
  likedCount: number;
  organizationId: string;
  resetAt: Date | string | null;
  themeScores: unknown;
  updatedAt: Date | string;
} | null;

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

function toDiscoveryCandidatePayload(
  candidate: DiscoveryCandidateRecord,
): IdeaDiscoveryCandidatePayload {
  return {
    angle: candidate.angle,
    category: candidate.category,
    createdAt: toIsoString(candidate.createdAt),
    duplicate: {
      matchedId: candidate.duplicateMatchedId,
      matchedTitle: candidate.duplicateMatchedTitle,
      score: candidate.duplicateScore,
      source:
        candidate.duplicateSource === "CONTENT_IDEA" ||
        candidate.duplicateSource === "CONTENT_ITEM"
          ? candidate.duplicateSource
          : null,
      warning: candidate.duplicateWarning,
    },
    id: candidate.id,
    isExploratory: candidate.isExploratory,
    justification: candidate.justification,
    organizationId: candidate.organizationId,
    recommendedFormat: candidate.recommendedFormat,
    title: candidate.title,
  };
}

function toDiscoveryProfilePayload(
  organizationId: string,
  profile: DiscoveryProfileRecord,
): IdeaDiscoveryProfilePayload {
  const themeScores = toScoreMap(profile?.themeScores);
  const formatScores = toScoreMap(profile?.formatScores);
  const themePreferences = toThemePreferences(themeScores);
  const formatPreferences = toFormatPreferences(formatScores);
  const likedCount = profile?.likedCount ?? 0;
  const dislikedCount = profile?.dislikedCount ?? 0;

  return {
    avoidedFormats: formatPreferences.avoided,
    avoidedThemes: themePreferences.avoided,
    dislikedCount,
    learnedSignals: likedCount + dislikedCount,
    likedCount,
    organizationId,
    preferredFormats: formatPreferences.preferred,
    preferredThemes: themePreferences.preferred,
    resetAt: profile?.resetAt ? toIsoString(profile.resetAt) : null,
    updatedAt: profile ? toIsoString(profile.updatedAt) : null,
  };
}

function toThemePreferences(scores: Record<string, number>): {
  avoided: IdeaDiscoveryThemePreferencePayload[];
  preferred: IdeaDiscoveryThemePreferencePayload[];
} {
  return splitPreferences(scores).reduce<{
    avoided: IdeaDiscoveryThemePreferencePayload[];
    preferred: IdeaDiscoveryThemePreferencePayload[];
  }>(
    (preferences, entry) => {
      const target = entry.positive
        ? preferences.preferred
        : preferences.avoided;
      target.push({ name: entry.name, score: entry.score });
      return preferences;
    },
    { avoided: [], preferred: [] },
  );
}

function toFormatPreferences(scores: Record<string, number>): {
  avoided: IdeaDiscoveryFormatPreferencePayload[];
  preferred: IdeaDiscoveryFormatPreferencePayload[];
} {
  const knownFormats = new Set<string>(CONTENT_FORMATS);
  return splitPreferences(scores).reduce<{
    avoided: IdeaDiscoveryFormatPreferencePayload[];
    preferred: IdeaDiscoveryFormatPreferencePayload[];
  }>(
    (preferences, entry) => {
      if (!knownFormats.has(entry.name)) {
        return preferences;
      }
      const target = entry.positive
        ? preferences.preferred
        : preferences.avoided;
      target.push({
        format: entry.name as ContentFormat,
        score: entry.score,
      });
      return preferences;
    },
    { avoided: [], preferred: [] },
  );
}

function splitPreferences(scores: Record<string, number>): Array<{
  name: string;
  positive: boolean;
  score: number;
}> {
  return Object.entries(scores)
    .filter(([, score]) => Number.isFinite(score) && score !== 0)
    .map(([name, score]) => ({
      name,
      positive: score > 0,
      score: Math.abs(score),
    }))
    .sort(
      (left, right) =>
        right.score - left.score || left.name.localeCompare(right.name),
    )
    .slice(0, MAX_DISCOVERY_PREFERENCES_PER_KIND);
}

function toScoreMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1]),
    ),
  );
}

function createDiscoveryFingerprint(input: {
  angle: string;
  category: string | null;
  recommendedFormat: ContentFormat;
  title: string;
}): string {
  return createHash("sha256")
    .update(
      [input.title, input.angle, input.category ?? ""]
        .concat(input.recommendedFormat)
        .map(normalizeDiscoveryText)
        .join("|"),
    )
    .digest("hex");
}

function normalizeDiscoveryText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

const DISCOVERY_BATCH_SIZE = 5;
const MAX_DISCOVERY_PREFERENCES_PER_KIND = 5;
const SERIALIZABLE_TRANSACTION_ATTEMPTS = 3;

async function retrySerializableTransaction<TResult>(
  operation: () => Promise<TResult>,
): Promise<TResult> {
  for (
    let attempt = 1;
    attempt <= SERIALIZABLE_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await operation();
    } catch (error) {
      if (
        !isSerializableTransactionConflict(error) ||
        attempt === SERIALIZABLE_TRANSACTION_ATTEMPTS
      ) {
        throw error;
      }
    }
  }

  throw new Error("Tentatives de transaction épuisées.");
}

function isSerializableTransactionConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}
