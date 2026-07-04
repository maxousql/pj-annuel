import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ContentCategoryPayload,
  ContentFormat,
  ContentItemPayload,
  ContentItemStatus,
  ContentLibraryDetailPayload,
  ContentLibraryPayload,
  ContentSource,
  ContentTagPayload,
  OrganizationRole,
} from "@content-ai/shared";

import { PrismaService } from "../database/prisma.service";
import type { ActiveOrganizationContext } from "../organizations/organizations.types";
import { ROLE_ORDER } from "../organizations/permissions";
import type { CreateLibraryCategoryDto } from "./dto/create-library-category.dto";
import type { CreateLibraryTagDto } from "./dto/create-library-tag.dto";
import type { ListLibraryContentsDto } from "./dto/list-library-contents.dto";
import type { UpdateLibraryContentDto } from "./dto/update-library-content.dto";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async listContents(
    organizationContext: ActiveOrganizationContext,
    input: ListLibraryContentsDto,
  ): Promise<ContentLibraryPayload> {
    const organizationId = organizationContext.organization.id;
    const page = input.page ?? DEFAULT_PAGE;
    const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = buildLibraryWhere(organizationId, input);

    const [contents, total, tags, categories] = await Promise.all([
      this.prisma.contentItem.findMany({
        orderBy: {
          updatedAt: "desc",
        },
        select: libraryContentSelect,
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
      }),
      this.prisma.contentItem.count({ where }),
      this.listTagsByOrganization(organizationId),
      this.listCategoriesByOrganization(organizationId),
    ]);

    return {
      categories,
      contents: contents.map(toContentItemPayload),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      tags,
    };
  }

  async getContent(
    organizationContext: ActiveOrganizationContext,
    contentId: string,
  ): Promise<ContentLibraryDetailPayload> {
    const organizationId = organizationContext.organization.id;
    const [content, tags, categories] = await Promise.all([
      this.findContentOrThrow(organizationId, contentId),
      this.listTagsByOrganization(organizationId),
      this.listCategoriesByOrganization(organizationId),
    ]);

    return {
      categories,
      content: toContentItemPayload(content),
      tags,
    };
  }

  async updateContent(
    organizationContext: ActiveOrganizationContext,
    contentId: string,
    input: UpdateLibraryContentDto,
  ): Promise<ContentLibraryDetailPayload> {
    const organizationId = organizationContext.organization.id;
    const existingContent = await this.findContentOrThrow(
      organizationId,
      contentId,
    );

    const archivesContent = input.status === "ARCHIVED";
    const editsArchivedContent =
      existingContent.status === "ARCHIVED" && Object.keys(input).length > 0;

    if (archivesContent || editsArchivedContent) {
      assertMinimumRole(organizationContext.membership.role, "ADMIN");
    }

    const categoryId = await this.resolveCategoryId(organizationId, input);
    const tagIds =
      input.tagIds === undefined
        ? undefined
        : await this.resolveTagIds(organizationId, input.tagIds);
    const data = buildUpdateData(input, existingContent, categoryId);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.contentItem.update({
        data,
        where: {
          id: existingContent.id,
        },
      });

      if (tagIds) {
        await transaction.contentTag.deleteMany({
          where: {
            contentItemId: existingContent.id,
            organizationId,
          },
        });

        if (tagIds.length > 0) {
          await transaction.contentTag.createMany({
            data: tagIds.map((tagId) => ({
              contentItemId: existingContent.id,
              organizationId,
              tagId,
            })),
            skipDuplicates: true,
          });
        }
      }
    });

    return this.getContent(organizationContext, existingContent.id);
  }

  async archiveContent(
    organizationContext: ActiveOrganizationContext,
    contentId: string,
  ): Promise<ContentLibraryDetailPayload> {
    assertMinimumRole(organizationContext.membership.role, "ADMIN");

    const organizationId = organizationContext.organization.id;
    const existingContent = await this.findContentOrThrow(
      organizationId,
      contentId,
    );

    await this.prisma.contentItem.update({
      data: {
        archivedAt: new Date(),
        status: "ARCHIVED",
      },
      where: {
        id: existingContent.id,
      },
    });

    return this.getContent(organizationContext, existingContent.id);
  }

  async restoreContent(
    organizationContext: ActiveOrganizationContext,
    contentId: string,
  ): Promise<ContentLibraryDetailPayload> {
    assertMinimumRole(organizationContext.membership.role, "ADMIN");

    const organizationId = organizationContext.organization.id;
    const existingContent = await this.findContentOrThrow(
      organizationId,
      contentId,
      true,
    );

    await this.prisma.contentItem.update({
      data: {
        archivedAt: null,
        status: "DRAFT",
      },
      where: {
        id: existingContent.id,
      },
    });

    return this.getContent(organizationContext, existingContent.id);
  }

  async createTag(
    organizationContext: ActiveOrganizationContext,
    input: CreateLibraryTagDto,
  ): Promise<ContentTagPayload> {
    const organizationId = organizationContext.organization.id;
    const slug = slugify(input.name);

    if (!slug) {
      throw new BadRequestException("Nom de tag invalide.");
    }

    const existingTag = await this.prisma.tag.findFirst({
      select: tagSelect,
      where: {
        organizationId,
        slug,
      },
    });

    if (existingTag) {
      return toTagPayload(existingTag);
    }

    const tag = await this.prisma.tag.create({
      data: {
        color: input.color ?? null,
        name: input.name,
        organizationId,
        slug,
      },
      select: tagSelect,
    });

    return toTagPayload(tag);
  }

  async createCategory(
    organizationContext: ActiveOrganizationContext,
    input: CreateLibraryCategoryDto,
  ): Promise<ContentCategoryPayload> {
    return this.getOrCreateCategory(
      organizationContext.organization.id,
      input.name,
    );
  }

  private async listTagsByOrganization(
    organizationId: string,
  ): Promise<ContentTagPayload[]> {
    const tags = await this.prisma.tag.findMany({
      orderBy: {
        name: "asc",
      },
      select: tagSelect,
      where: {
        organizationId,
      },
    });

    return tags.map(toTagPayload);
  }

  private async listCategoriesByOrganization(
    organizationId: string,
  ): Promise<ContentCategoryPayload[]> {
    const categories = await this.prisma.contentCategory.findMany({
      orderBy: {
        name: "asc",
      },
      select: categorySelect,
      where: {
        organizationId,
      },
    });

    return categories.map(toCategoryPayload);
  }

  private async findContentOrThrow(
    organizationId: string,
    contentId: string,
    includeArchived = false,
  ): Promise<LibraryContentRecord> {
    const content = await this.prisma.contentItem.findFirst({
      select: libraryContentSelect,
      where: {
        deletedAt: null,
        id: contentId,
        organizationId,
        ...(includeArchived
          ? { status: { not: "DELETED" } }
          : { status: { not: "DELETED" } }),
      },
    });

    if (!content) {
      throw new NotFoundException("Contenu introuvable.");
    }

    return content;
  }

  private async resolveCategoryId(
    organizationId: string,
    input: UpdateLibraryContentDto,
  ): Promise<string | null | undefined> {
    if (input.categoryName) {
      const category = await this.getOrCreateCategory(
        organizationId,
        input.categoryName,
      );

      return category.id;
    }

    if (input.categoryId === undefined) {
      return undefined;
    }

    if (input.categoryId === null) {
      return null;
    }

    const category = await this.prisma.contentCategory.findFirst({
      select: {
        id: true,
      },
      where: {
        id: input.categoryId,
        organizationId,
      },
    });

    if (!category) {
      throw new BadRequestException("Categorie introuvable.");
    }

    return category.id;
  }

  private async getOrCreateCategory(
    organizationId: string,
    name: string,
  ): Promise<ContentCategoryPayload> {
    const slug = slugify(name);

    if (!slug) {
      throw new BadRequestException("Nom de categorie invalide.");
    }

    const existingCategory = await this.prisma.contentCategory.findFirst({
      select: categorySelect,
      where: {
        organizationId,
        slug,
      },
    });

    if (existingCategory) {
      return toCategoryPayload(existingCategory);
    }

    const category = await this.prisma.contentCategory.create({
      data: {
        name,
        organizationId,
        slug,
      },
      select: categorySelect,
    });

    return toCategoryPayload(category);
  }

  private async resolveTagIds(
    organizationId: string,
    inputTagIds: string[],
  ): Promise<string[]> {
    const tagIds = [...new Set(inputTagIds)];

    if (tagIds.length === 0) {
      return [];
    }

    const tags = await this.prisma.tag.findMany({
      select: {
        id: true,
      },
      where: {
        id: {
          in: tagIds,
        },
        organizationId,
      },
    });

    if (tags.length !== tagIds.length) {
      throw new BadRequestException("Un ou plusieurs tags sont introuvables.");
    }

    return tagIds;
  }
}

const tagSelect = {
  color: true,
  id: true,
  name: true,
  slug: true,
} as const;

const categorySelect = {
  id: true,
  name: true,
  slug: true,
} as const;

const libraryContentSelect = {
  archivedAt: true,
  body: true,
  brief: true,
  category: {
    select: categorySelect,
  },
  categoryId: true,
  contentTags: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      tag: {
        select: tagSelect,
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

type TagRecord = {
  color: string | null;
  id: string;
  name: string;
  slug: string;
};

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
};

type LibraryContentRecord = {
  archivedAt: Date | string | null;
  body: string;
  brief: string | null;
  category: CategoryRecord | null;
  categoryId: string | null;
  contentTags: { tag: TagRecord }[];
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

type LibraryWhere = Record<string, unknown>;

function buildLibraryWhere(
  organizationId: string,
  input: ListLibraryContentsDto,
): LibraryWhere {
  const andFilters: LibraryWhere[] = [];
  const where: LibraryWhere = {
    deletedAt: null,
    organizationId,
    status: input.status ?? {
      notIn: ["ARCHIVED", "DELETED"],
    },
  };

  if (input.format) {
    where.format = input.format;
  }

  if (input.tagId) {
    where.contentTags = {
      some: {
        organizationId,
        tagId: input.tagId,
      },
    };
  }

  if (input.categoryId) {
    where.categoryId = input.categoryId;
  }

  if (input.query) {
    andFilters.push({
      OR: [
        {
          title: {
            contains: input.query,
            mode: "insensitive",
          },
        },
        {
          body: {
            contains: input.query,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (input.category) {
    andFilters.push({
      OR: [
        {
          category: {
            name: {
              contains: input.category,
              mode: "insensitive",
            },
          },
        },
        {
          topic: {
            contains: input.category,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (input.dateFrom || input.dateTo) {
    where.updatedAt = {
      ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
      ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
    };
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  return where;
}

function buildUpdateData(
  input: UpdateLibraryContentDto,
  existingContent: LibraryContentRecord,
  categoryId: string | null | undefined,
) {
  const data: Record<string, unknown> = {};

  if (input.title !== undefined) {
    data.title = input.title;
  }

  if (input.body !== undefined) {
    data.body = input.body;
  }

  if (input.format !== undefined) {
    data.format = input.format;
  }

  if (input.topic !== undefined) {
    data.topic = input.topic;
  }

  if (categoryId !== undefined) {
    data.categoryId = categoryId;
  }

  if (input.status !== undefined) {
    data.status = input.status;

    if (input.status === "PUBLISHED" && !existingContent.publishedAt) {
      data.publishedAt = new Date();
    }

    if (input.status === "ARCHIVED" && !existingContent.archivedAt) {
      data.archivedAt = new Date();
    }

    if (input.status !== "ARCHIVED" && existingContent.archivedAt) {
      data.archivedAt = null;
    }
  }

  return data;
}

function toContentItemPayload(
  content: LibraryContentRecord,
): ContentItemPayload {
  return {
    archivedAt: toNullableIsoString(content.archivedAt),
    body: content.body,
    brief: content.brief,
    category: content.category ? toCategoryPayload(content.category) : null,
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
    tags: content.contentTags.map((contentTag) => toTagPayload(contentTag.tag)),
    title: content.title,
    topic: content.topic,
    updatedAt: toIsoString(content.updatedAt),
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

function toCategoryPayload(category: CategoryRecord): ContentCategoryPayload {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
  };
}

function assertMinimumRole(
  role: OrganizationRole,
  minimumRole: OrganizationRole,
): void {
  if (ROLE_ORDER[role] < ROLE_ORDER[minimumRole]) {
    throw new ForbiddenException("Role insuffisant pour cette organisation.");
  }
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toNullableIsoString(value: Date | string | null): string | null {
  return value ? toIsoString(value) : null;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
