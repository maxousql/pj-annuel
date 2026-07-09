import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  ContentItemStatus,
  NotionConflictStrategy,
  NotionIntegrationPayload,
  NotionMappingPayload,
  NotionPropertyMappingPayload,
  NotionPropertyTypeMappingPayload,
  NotionSyncResultPayload,
  ResourceStatus,
} from "@content-ai/shared";
import { createHash } from "node:crypto";
import { sign, verify } from "jsonwebtoken";

import { PrismaService } from "../database/prisma.service";
import type { Prisma } from "../generated/prisma/client";
import type { ActiveOrganizationContext } from "../organizations/organizations.types";
import type { SaveNotionMappingDto } from "./dto/save-notion-mapping.dto";
import { IntegrationEncryptionService } from "./integration-encryption.service";
import { NotionAdapter } from "./notion/notion.adapter";
import {
  buildNotionBodyChildren,
  buildNotionProperties,
  DEFAULT_NOTION_PROPERTY_MAPPING,
  DEFAULT_NOTION_PROPERTY_TYPES,
  readNotionPageFields,
} from "./notion/notion-mapping";
import type {
  NotionCredentialMetadata,
  NotionPage,
} from "./notion/notion.types";
import { NotionApiError } from "./notion/notion.types";

type OAuthState = {
  frontendOrigin: string;
  organizationId: string;
  organizationSlug: string;
  userId: string;
};

type LocalContentRecord = {
  body: string;
  id: string;
  publicationPlans: Array<{
    channel: string;
    publicationDate: Date;
  }>;
  status: string;
  title: string;
  updatedAt: Date;
};

type LocalResourceRecord = {
  id: string;
  status: string;
  title: string;
  updatedAt: Date;
  url: string;
};

@Injectable()
export class IntegrationsService {
  private readonly oauthStateSecret: string;
  private readonly frontendOrigins: string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: IntegrationEncryptionService,
    private readonly notion: NotionAdapter,
    configService: ConfigService,
  ) {
    this.oauthStateSecret =
      configService.get<string>("NOTION_OAUTH_STATE_SECRET") ??
      configService.get<string>("AUTH_SECRET") ??
      "content-ai-local-notion-state";
    this.frontendOrigins = parseFrontendOrigins(
      configService.get<string>("FRONTEND_URL"),
    );
  }

  async getNotionIntegration(
    organizationContext: ActiveOrganizationContext,
  ): Promise<NotionIntegrationPayload> {
    const organizationId = organizationContext.organization.id;
    const [credential, mapping, logs] = await Promise.all([
      this.prisma.integrationCredential.findUnique({
        where: {
          organizationId_provider: { organizationId, provider: "NOTION" },
        },
      }),
      this.prisma.notionDatabaseMapping.findUnique({
        where: { organizationId },
      }),
      this.prisma.notionSyncLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
        where: { organizationId },
      }),
    ]);
    let workspaceName: string | null = null;

    if (credential) {
      try {
        workspaceName =
          this.decryptCredential(credential.encryptedMetadata).workspaceName ??
          null;
      } catch {
        workspaceName = null;
      }
    }

    return {
      canConfigure: organizationContext.membership.role === "ADMIN",
      canSync: organizationContext.membership.role !== "READER",
      connected: credential?.status === "ACTIVE",
      connection: credential
        ? { status: credential.status, workspaceName }
        : null,
      logs: logs.map((log) => ({
        createdAt: log.createdAt.toISOString(),
        durationMs: log.durationMs,
        errorCode: log.errorCode,
        errorMessage: log.errorMessage,
        failedCount: log.failedCount,
        id: log.id,
        operation: log.operation,
        processedCount: log.processedCount,
        status: log.status,
      })),
      mapping: mapping ? toMappingPayload(mapping) : null,
    };
  }

  createNotionAuthorizationUrl(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    requestOrigin?: string,
  ): string {
    const frontendOrigin = resolveAllowedFrontendOrigin(
      requestOrigin,
      this.frontendOrigins,
    );
    const state = sign(
      {
        frontendOrigin,
        organizationId: organizationContext.organization.id,
        organizationSlug: organizationContext.organization.slug,
        userId,
      } satisfies OAuthState,
      this.oauthStateSecret,
      {
        audience: "notion-oauth",
        expiresIn: "10m",
        issuer: "content-ai-api",
      },
    );

    return this.notion.buildAuthorizationUrl(state);
  }

  async completeNotionOAuth(
    currentUserId: string,
    code: string,
    rawState: string,
  ): Promise<{ frontendOrigin: string; organizationSlug: string }> {
    const state = this.verifyOAuthState(rawState);

    if (state.userId !== currentUserId) {
      throw new BadRequestException("Etat OAuth Notion invalide.");
    }

    const context = await this.prisma.membership.findFirst({
      select: { role: true },
      where: {
        organizationId: state.organizationId,
        role: "ADMIN",
        status: "ACTIVE",
        userId: currentUserId,
      },
    });

    if (!context) {
      throw new BadRequestException(
        "Administration de l'organisation requise.",
      );
    }

    try {
      const metadata = await this.notion.exchangeCode(code);

      await this.prisma.$transaction([
        this.prisma.integrationCredential.upsert({
          create: {
            encryptedMetadata: this.encryption.encryptJson(metadata),
            encryptionKeyRef: "env:INTEGRATION_ENCRYPTION_KEY:v1",
            organizationId: state.organizationId,
            provider: "NOTION",
            status: "ACTIVE",
          },
          update: {
            encryptedMetadata: this.encryption.encryptJson(metadata),
            encryptionKeyRef: "env:INTEGRATION_ENCRYPTION_KEY:v1",
            status: "ACTIVE",
          },
          where: {
            organizationId_provider: {
              organizationId: state.organizationId,
              provider: "NOTION",
            },
          },
        }),
        this.prisma.organizationAuditLog.create({
          data: {
            action: "NOTION_CONNECTED",
            actorUserId: currentUserId,
            organizationId: state.organizationId,
            targetType: "INTEGRATION",
          },
        }),
      ]);

      return {
        frontendOrigin: state.frontendOrigin,
        organizationSlug: state.organizationSlug,
      };
    } catch (error) {
      throwNotionHttpError(error);
    }
  }

  async disconnectNotion(
    userId: string,
    organizationContext: ActiveOrganizationContext,
  ): Promise<void> {
    const organizationId = organizationContext.organization.id;

    await this.prisma.$transaction([
      this.prisma.notionSyncState.deleteMany({ where: { organizationId } }),
      this.prisma.notionDatabaseMapping.deleteMany({
        where: { organizationId },
      }),
      this.prisma.integrationCredential.deleteMany({
        where: { organizationId, provider: "NOTION" },
      }),
      this.prisma.organizationAuditLog.create({
        data: {
          action: "NOTION_DISCONNECTED",
          actorUserId: userId,
          organizationId,
          targetType: "INTEGRATION",
        },
      }),
    ]);
  }

  async listNotionDatabases(organizationContext: ActiveOrganizationContext) {
    const credential = await this.getCredential(
      organizationContext.organization.id,
    );

    try {
      return await this.notion.listDatabases(credential.accessToken);
    } catch (error) {
      await this.recordCredentialError(
        organizationContext.organization.id,
        error,
      );
      throwNotionHttpError(error);
    }
  }

  async saveNotionMapping(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    input: SaveNotionMappingDto,
  ): Promise<NotionMappingPayload> {
    const organizationId = organizationContext.organization.id;
    const credential = await this.getCredential(organizationId);
    let databases;

    try {
      databases = await this.notion.listDatabases(credential.accessToken);
    } catch (error) {
      await this.recordCredentialError(organizationId, error);
      throwNotionHttpError(error);
    }

    const database = databases.find(
      (candidate) => candidate.id === input.databaseId,
    );

    if (!database) {
      throw new BadRequestException(
        "Cette base Notion n'est pas accessible avec la connexion active.",
      );
    }

    const propertyTypes = validateNotionPropertyMapping(
      database.properties,
      input.propertyMapping,
    );
    const persistedMapping = {
      ...input.propertyMapping,
      __types: propertyTypes,
    };
    const mapping = await this.prisma.$transaction(
      async (transaction) => {
        const existing = await transaction.notionDatabaseMapping.findUnique({
          select: { databaseId: true },
          where: { organizationId },
        });

        if (existing && existing.databaseId !== database.id) {
          await transaction.notionSyncState.deleteMany({
            where: { organizationId },
          });
        }

        const saved = await transaction.notionDatabaseMapping.upsert({
          create: {
            conflictStrategy: input.conflictStrategy,
            databaseId: database.id,
            databaseName: database.name,
            organizationId,
            propertyMapping: persistedMapping,
          },
          update: {
            conflictStrategy: input.conflictStrategy,
            databaseId: database.id,
            databaseName: database.name,
            propertyMapping: persistedMapping,
          },
          where: { organizationId },
        });

        await transaction.organizationAuditLog.create({
          data: {
            action: "NOTION_MAPPING_UPDATED",
            actorUserId: userId,
            metadata: {
              databaseChanged: Boolean(
                existing && existing.databaseId !== database.id,
              ),
              databaseId: database.id,
            },
            organizationId,
            targetId: saved.id,
            targetType: "NOTION_MAPPING",
          },
        });
        return saved;
      },
      { isolationLevel: "Serializable" },
    );

    return toMappingPayload(mapping);
  }

  async exportContent(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    contentId: string,
  ): Promise<NotionSyncResultPayload> {
    return this.runLoggedSync(
      organizationContext.organization.id,
      userId,
      "EXPORT_CONTENT",
      async (connection) => {
        const content = await this.findContent(
          organizationContext.organization.id,
          contentId,
        );
        await this.pushContent(connection, content);
        return {
          failedCount: 0,
          message: null,
          processedCount: 1,
          status: "SUCCEEDED",
        };
      },
    );
  }

  async exportResource(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    resourceId: string,
  ): Promise<NotionSyncResultPayload> {
    return this.runLoggedSync(
      organizationContext.organization.id,
      userId,
      "EXPORT_RESOURCE",
      async (connection) => {
        const resource = await this.findResource(
          organizationContext.organization.id,
          resourceId,
        );
        await this.pushResource(connection, resource);
        return {
          failedCount: 0,
          message: null,
          processedCount: 1,
          status: "SUCCEEDED",
        };
      },
    );
  }

  async syncNotion(
    userId: string,
    organizationContext: ActiveOrganizationContext,
  ): Promise<NotionSyncResultPayload> {
    const organizationId = organizationContext.organization.id;

    return this.runLoggedSync(
      organizationId,
      userId,
      "BIDIRECTIONAL_SYNC",
      async (connection) => {
        const [contents, resources] = await Promise.all([
          this.listAllContents(organizationId),
          this.listAllResources(organizationId),
        ]);
        let processedCount = 0;
        let failedCount = 0;
        let failureMessage: string | null = null;

        for (const content of contents) {
          try {
            await this.reconcileContent(connection, content);
            processedCount += 1;
          } catch (error) {
            if (isProviderWideNotionError(error)) throw error;
            failedCount += 1;
            failureMessage ??= toSafeNotionError(error).message;
          }
        }

        for (const resource of resources) {
          try {
            await this.reconcileResource(connection, resource);
            processedCount += 1;
          } catch (error) {
            if (isProviderWideNotionError(error)) throw error;
            failedCount += 1;
            failureMessage ??= toSafeNotionError(error).message;
          }
        }

        return {
          failedCount,
          message:
            failedCount > 0
              ? (failureMessage ??
                "Certains elements n'ont pas pu etre synchronises.")
              : null,
          processedCount,
          status:
            failedCount === 0
              ? "SUCCEEDED"
              : processedCount === 0
                ? "FAILED"
                : "PARTIAL",
        };
      },
    );
  }

  private async reconcileContent(
    connection: NotionConnection,
    content: LocalContentRecord,
  ): Promise<void> {
    await this.withEntityLock(
      connection.organizationId,
      "CONTENT",
      content.id,
      async (transaction) => {
        const state = await transaction.notionSyncState.findUnique({
          where: {
            organizationId_entityType_entityId: {
              entityId: content.id,
              entityType: "CONTENT",
              organizationId: connection.organizationId,
            },
          },
        });

        if (!state) {
          await this.pushContentLocked(transaction, connection, content);
          return;
        }

        const page = await this.notion.retrievePage(
          connection.credential.accessToken,
          state.notionPageId,
        );
        const localHash = hashLocalEntity(content);
        const localChanged = localHash !== state.lastLocalHash;
        const remoteEditedAt = new Date(page.last_edited_time);
        const remoteChanged =
          remoteEditedAt.getTime() >
          (state.lastRemoteEditedAt?.getTime() ?? 0) + 500;

        if (
          !remoteChanged ||
          (localChanged &&
            shouldLocalWin(
              connection.mapping,
              content.updatedAt,
              remoteEditedAt,
            ))
        ) {
          if (localChanged) {
            await this.pushContentLocked(
              transaction,
              connection,
              content,
              state.notionPageId,
            );
          }
          return;
        }

        await this.applyRemoteContent(transaction, connection, content, page);
      },
    );
  }

  private async reconcileResource(
    connection: NotionConnection,
    resource: LocalResourceRecord,
  ): Promise<void> {
    await this.withEntityLock(
      connection.organizationId,
      "RESOURCE",
      resource.id,
      async (transaction) => {
        const state = await transaction.notionSyncState.findUnique({
          where: {
            organizationId_entityType_entityId: {
              entityId: resource.id,
              entityType: "RESOURCE",
              organizationId: connection.organizationId,
            },
          },
        });

        if (!state) {
          await this.pushResourceLocked(transaction, connection, resource);
          return;
        }

        const page = await this.notion.retrievePage(
          connection.credential.accessToken,
          state.notionPageId,
        );
        const localHash = hashLocalEntity(resource);
        const localChanged = localHash !== state.lastLocalHash;
        const remoteEditedAt = new Date(page.last_edited_time);
        const remoteChanged =
          remoteEditedAt.getTime() >
          (state.lastRemoteEditedAt?.getTime() ?? 0) + 500;

        if (
          !remoteChanged ||
          (localChanged &&
            shouldLocalWin(
              connection.mapping,
              resource.updatedAt,
              remoteEditedAt,
            ))
        ) {
          if (localChanged) {
            await this.pushResourceLocked(
              transaction,
              connection,
              resource,
              state.notionPageId,
            );
          }
          return;
        }

        await this.applyRemoteResource(transaction, connection, resource, page);
      },
    );
  }

  private async pushContent(
    connection: NotionConnection,
    content: LocalContentRecord,
    knownPageId?: string,
  ): Promise<void> {
    await this.withEntityLock(
      connection.organizationId,
      "CONTENT",
      content.id,
      (transaction) =>
        this.pushContentLocked(transaction, connection, content, knownPageId),
    );
  }

  private async pushContentLocked(
    transaction: Prisma.TransactionClient,
    connection: NotionConnection,
    content: LocalContentRecord,
    knownPageId?: string,
  ): Promise<void> {
    const publication = content.publicationPlans[0];
    const properties = buildNotionProperties({
      ...(publication
        ? {
            channel: publication.channel,
            date: publication.publicationDate,
          }
        : {}),
      entityType: "Contenu",
      mapping: connection.mapping.propertyMapping,
      propertyTypes: connection.mapping.propertyTypes,
      status: content.status,
      title: content.title,
    });
    const existingState = knownPageId
      ? null
      : await transaction.notionSyncState.findUnique({
          where: {
            organizationId_entityType_entityId: {
              entityId: content.id,
              entityType: "CONTENT",
              organizationId: connection.organizationId,
            },
          },
        });
    let page: NotionPage;
    const pageId = knownPageId ?? existingState?.notionPageId;

    if (pageId) {
      page = await this.notion.updatePage(
        connection.credential.accessToken,
        pageId,
        properties,
      );
    } else {
      page = await this.notion.createPage(connection.credential.accessToken, {
        parent: { database_id: connection.mapping.databaseId },
        properties,
      });
      await this.saveSyncState(
        transaction,
        connection.organizationId,
        "CONTENT",
        content.id,
        page,
        "",
      );
    }

    await this.notion.replacePageBody(
      connection.credential.accessToken,
      page.id,
      buildNotionBodyChildren(content.body),
    );
    page = await this.notion.retrievePage(
      connection.credential.accessToken,
      page.id,
    );

    await this.saveSyncState(
      transaction,
      connection.organizationId,
      "CONTENT",
      content.id,
      page,
      hashLocalEntity(content),
    );
  }

  private async pushResource(
    connection: NotionConnection,
    resource: LocalResourceRecord,
    knownPageId?: string,
  ): Promise<void> {
    await this.withEntityLock(
      connection.organizationId,
      "RESOURCE",
      resource.id,
      (transaction) =>
        this.pushResourceLocked(transaction, connection, resource, knownPageId),
    );
  }

  private async pushResourceLocked(
    transaction: Prisma.TransactionClient,
    connection: NotionConnection,
    resource: LocalResourceRecord,
    knownPageId?: string,
  ): Promise<void> {
    const properties = buildNotionProperties({
      entityType: "Ressource",
      mapping: connection.mapping.propertyMapping,
      propertyTypes: connection.mapping.propertyTypes,
      sourceUrl: resource.url,
      status: resource.status,
      title: resource.title,
    });
    const existingState = knownPageId
      ? null
      : await transaction.notionSyncState.findUnique({
          where: {
            organizationId_entityType_entityId: {
              entityId: resource.id,
              entityType: "RESOURCE",
              organizationId: connection.organizationId,
            },
          },
        });
    const pageId = knownPageId ?? existingState?.notionPageId;
    const page = pageId
      ? await this.notion.updatePage(
          connection.credential.accessToken,
          pageId,
          properties,
        )
      : await this.notion.createPage(connection.credential.accessToken, {
          parent: { database_id: connection.mapping.databaseId },
          properties,
        });

    await this.saveSyncState(
      transaction,
      connection.organizationId,
      "RESOURCE",
      resource.id,
      page,
      hashLocalEntity(resource),
    );
  }

  private async applyRemoteContent(
    transaction: Prisma.TransactionClient,
    connection: NotionConnection,
    content: LocalContentRecord,
    page: NotionPage,
  ): Promise<void> {
    const fields = readNotionPageFields(
      page,
      connection.mapping.propertyMapping,
    );
    const status = normalizeContentStatus(fields.status);
    const updated = await transaction.contentItem.update({
      data: {
        ...(status ? { status } : {}),
        ...(fields.title ? { title: fields.title } : {}),
      },
      include: {
        publicationPlans: {
          orderBy: { publicationDate: "asc" },
          take: 1,
        },
      },
      where: { id: content.id },
    });

    if (fields.date) {
      const existingPlan = updated.publicationPlans[0];

      if (existingPlan) {
        await transaction.publicationPlan.update({
          data: {
            ...(fields.channel ? { channel: fields.channel } : {}),
            publicationDate: fields.date,
            status: "SCHEDULED",
          },
          where: { id: existingPlan.id },
        });
      } else {
        await transaction.publicationPlan.create({
          data: {
            channel: fields.channel ?? "OTHER",
            contentItemId: content.id,
            organizationId: connection.organizationId,
            publicationDate: fields.date,
            status: "SCHEDULED",
          },
        });
      }
    } else if (updated.publicationPlans[0]) {
      await transaction.publicationPlan.delete({
        where: { id: updated.publicationPlans[0].id },
      });
    }

    const refreshed = await this.findContentWithClient(
      transaction,
      connection.organizationId,
      content.id,
    );
    await this.saveSyncState(
      transaction,
      connection.organizationId,
      "CONTENT",
      content.id,
      page,
      hashLocalEntity(refreshed),
    );
  }

  private async applyRemoteResource(
    transaction: Prisma.TransactionClient,
    connection: NotionConnection,
    resource: LocalResourceRecord,
    page: NotionPage,
  ): Promise<void> {
    const fields = readNotionPageFields(
      page,
      connection.mapping.propertyMapping,
    );
    const status = normalizeResourceStatus(fields.status);
    const updated = await transaction.curatedResource.update({
      data: {
        ...(status ? { status } : {}),
        ...(fields.title ? { title: fields.title } : {}),
      },
      where: { id: resource.id },
    });

    await this.saveSyncState(
      transaction,
      connection.organizationId,
      "RESOURCE",
      resource.id,
      page,
      hashLocalEntity(updated),
    );
  }

  private async saveSyncState(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    entityType: "CONTENT" | "RESOURCE",
    entityId: string,
    page: NotionPage,
    lastLocalHash: string,
  ): Promise<void> {
    const lastRemoteEditedAt = new Date(page.last_edited_time);

    await transaction.notionSyncState.upsert({
      create: {
        entityId,
        entityType,
        lastLocalHash,
        lastRemoteEditedAt,
        lastSyncedAt: new Date(),
        notionPageId: page.id,
        organizationId,
      },
      update: {
        lastLocalHash,
        lastRemoteEditedAt,
        lastSyncedAt: new Date(),
        notionPageId: page.id,
      },
      where: {
        organizationId_entityType_entityId: {
          entityId,
          entityType,
          organizationId,
        },
      },
    });
  }

  private async withEntityLock(
    organizationId: string,
    entityType: "CONTENT" | "RESOURCE",
    entityId: string,
    handler: (transaction: Prisma.TransactionClient) => Promise<void>,
  ): Promise<void> {
    const lockKey = `notion:${organizationId}:${entityType}:${entityId}`;

    await this.prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRawUnsafe(
          "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
          lockKey,
        );
        await handler(transaction);
      },
      { isolationLevel: "ReadCommitted", maxWait: 10_000, timeout: 60_000 },
    );
  }

  private async runLoggedSync(
    organizationId: string,
    userId: string,
    operation: string,
    handler: (connection: NotionConnection) => Promise<NotionSyncResultPayload>,
  ): Promise<NotionSyncResultPayload> {
    const startedAt = Date.now();

    try {
      const connection = await this.getConnection(organizationId);
      const result = await handler(connection);
      await this.prisma.notionSyncLog.create({
        data: {
          durationMs: Date.now() - startedAt,
          errorCode: result.failedCount > 0 ? "NOTION_PARTIAL_SYNC" : null,
          errorMessage: result.message,
          failedCount: result.failedCount,
          operation,
          organizationId,
          processedCount: result.processedCount,
          status: result.status,
          triggeredById: userId,
        },
      });

      return result;
    } catch (error) {
      const safeError = toSafeNotionError(error);
      await this.prisma.notionSyncLog.create({
        data: {
          durationMs: Date.now() - startedAt,
          errorCode: safeError.code,
          errorMessage: safeError.message,
          failedCount: 1,
          operation,
          organizationId,
          status: "FAILED",
          triggeredById: userId,
        },
      });
      await this.recordCredentialError(organizationId, error);
      throwNotionHttpError(error);
    }
  }

  private async getConnection(
    organizationId: string,
  ): Promise<NotionConnection> {
    const [credential, mapping] = await Promise.all([
      this.getCredential(organizationId),
      this.prisma.notionDatabaseMapping.findUnique({
        where: { organizationId },
      }),
    ]);

    if (!mapping) {
      throw new ConflictException(
        "Configurez une base Notion avant de synchroniser.",
      );
    }

    return {
      credential,
      mapping: toMappingPayload(mapping),
      organizationId,
    };
  }

  private async listAllContents(
    organizationId: string,
  ): Promise<LocalContentRecord[]> {
    const contents: LocalContentRecord[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.prisma.contentItem.findMany({
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          publicationPlans: {
            orderBy: { publicationDate: "asc" },
            take: 1,
          },
        },
        orderBy: { id: "asc" },
        take: 100,
        where: {
          deletedAt: null,
          organizationId,
          status: { not: "DELETED" },
        },
      });
      contents.push(...page);
      cursor = page.length === 100 ? page.at(-1)?.id : undefined;
    } while (cursor);

    return contents;
  }

  private async listAllResources(
    organizationId: string,
  ): Promise<LocalResourceRecord[]> {
    const resources: LocalResourceRecord[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.prisma.curatedResource.findMany({
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { id: "asc" },
        take: 100,
        where: { organizationId, status: { not: "ARCHIVED" } },
      });
      resources.push(...page);
      cursor = page.length === 100 ? page.at(-1)?.id : undefined;
    } while (cursor);

    return resources;
  }

  private async getCredential(
    organizationId: string,
  ): Promise<NotionCredentialMetadata> {
    const credential = await this.prisma.integrationCredential.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: "NOTION" },
      },
    });

    if (!credential || credential.status !== "ACTIVE") {
      throw new ConflictException("Connectez Notion avant de continuer.");
    }

    return this.decryptCredential(credential.encryptedMetadata);
  }

  private decryptCredential(
    encryptedMetadata: string,
  ): NotionCredentialMetadata {
    const value =
      this.encryption.decryptJson<Record<string, unknown>>(encryptedMetadata);

    if (typeof value.accessToken !== "string" || !value.accessToken) {
      throw new Error("Invalid Notion credential metadata.");
    }

    return {
      accessToken: value.accessToken,
      ...(typeof value.botId === "string" ? { botId: value.botId } : {}),
      ...(typeof value.workspaceId === "string"
        ? { workspaceId: value.workspaceId }
        : {}),
      ...(typeof value.workspaceName === "string"
        ? { workspaceName: value.workspaceName }
        : {}),
    };
  }

  private async findContent(
    organizationId: string,
    contentId: string,
  ): Promise<LocalContentRecord> {
    return this.findContentWithClient(this.prisma, organizationId, contentId);
  }

  private async findContentWithClient(
    client: Pick<Prisma.TransactionClient, "contentItem">,
    organizationId: string,
    contentId: string,
  ): Promise<LocalContentRecord> {
    const content = await client.contentItem.findFirst({
      include: {
        publicationPlans: {
          orderBy: { publicationDate: "asc" },
          take: 1,
        },
      },
      where: {
        deletedAt: null,
        id: contentId,
        organizationId,
        status: { not: "DELETED" },
      },
    });

    if (!content) {
      throw new NotFoundException("Contenu introuvable.");
    }

    return content;
  }

  private async findResource(
    organizationId: string,
    resourceId: string,
  ): Promise<LocalResourceRecord> {
    const resource = await this.prisma.curatedResource.findFirst({
      where: { id: resourceId, organizationId },
    });

    if (!resource) {
      throw new NotFoundException("Ressource de veille introuvable.");
    }

    return resource;
  }

  private verifyOAuthState(rawState: string): OAuthState {
    try {
      const payload = verify(rawState, this.oauthStateSecret, {
        audience: "notion-oauth",
        issuer: "content-ai-api",
      });

      if (
        typeof payload === "string" ||
        typeof payload.frontendOrigin !== "string" ||
        typeof payload.organizationId !== "string" ||
        typeof payload.organizationSlug !== "string" ||
        typeof payload.userId !== "string"
      ) {
        throw new Error("Invalid state");
      }
      const frontendOrigin = new URL(payload.frontendOrigin).origin;
      if (!this.frontendOrigins.includes(frontendOrigin)) {
        throw new Error("Invalid frontend origin");
      }

      return {
        frontendOrigin,
        organizationId: payload.organizationId,
        organizationSlug: payload.organizationSlug,
        userId: payload.userId,
      };
    } catch {
      throw new BadRequestException("Etat OAuth Notion invalide ou expire.");
    }
  }

  private async recordCredentialError(
    organizationId: string,
    error: unknown,
  ): Promise<void> {
    if (
      error instanceof NotionApiError &&
      error.code === "NOTION_AUTH_EXPIRED"
    ) {
      await this.prisma.integrationCredential.updateMany({
        data: { status: "ERROR" },
        where: { organizationId, provider: "NOTION" },
      });
    }
  }
}

type NotionConnection = {
  credential: NotionCredentialMetadata;
  mapping: NotionMappingPayload;
  organizationId: string;
};

function toMappingPayload(mapping: {
  conflictStrategy: string;
  databaseId: string;
  databaseName: string;
  propertyMapping: unknown;
  updatedAt: Date;
}): NotionMappingPayload {
  return {
    conflictStrategy: normalizeConflictStrategy(mapping.conflictStrategy),
    databaseId: mapping.databaseId,
    databaseName: mapping.databaseName,
    propertyMapping: normalizePropertyMapping(mapping.propertyMapping),
    propertyTypes: normalizePropertyTypes(mapping.propertyMapping),
    updatedAt: mapping.updatedAt.toISOString(),
  };
}

function normalizePropertyTypes(
  value: unknown,
): NotionPropertyTypeMappingPayload {
  if (!isRecord(value) || !isRecord(value.__types)) {
    return DEFAULT_NOTION_PROPERTY_TYPES;
  }

  const types = value.__types;
  return {
    channel: types.channel === "select" ? "select" : "select",
    date: types.date === "date" ? "date" : "date",
    entityType: types.entityType === "select" ? "select" : "select",
    sourceUrl: types.sourceUrl === "url" ? "url" : "url",
    status: types.status === "status" ? "status" : "select",
    title: types.title === "title" ? "title" : "title",
  };
}

export function validateNotionPropertyMapping(
  properties: Array<{ name: string; type: string }>,
  mapping: NotionPropertyMappingPayload,
): NotionPropertyTypeMappingPayload {
  const configuredNames = Object.values(mapping);
  if (new Set(configuredNames).size !== configuredNames.length) {
    throw new BadRequestException(
      "Chaque champ doit utiliser une propriete Notion distincte.",
    );
  }

  const byName = new Map(
    properties.map((property) => [property.name, property]),
  );
  const expected: Record<keyof NotionPropertyMappingPayload, string[]> = {
    channel: ["select"],
    date: ["date"],
    entityType: ["select"],
    sourceUrl: ["url"],
    status: ["select", "status"],
    title: ["title"],
  };

  for (const [field, propertyName] of Object.entries(mapping) as Array<
    [keyof NotionPropertyMappingPayload, string]
  >) {
    const property = byName.get(propertyName);
    if (!property) {
      throw new BadRequestException(
        `Propriete Notion introuvable pour ${field}: ${propertyName}.`,
      );
    }
    if (!expected[field].includes(property.type)) {
      throw new BadRequestException(
        `La propriete ${propertyName} doit etre de type ${expected[field].join(" ou ")}.`,
      );
    }
  }

  return {
    channel: "select",
    date: "date",
    entityType: "select",
    sourceUrl: "url",
    status: byName.get(mapping.status)?.type === "status" ? "status" : "select",
    title: "title",
  };
}

function normalizePropertyMapping(
  value: unknown,
): NotionPropertyMappingPayload {
  if (!isRecord(value)) {
    return DEFAULT_NOTION_PROPERTY_MAPPING;
  }

  return Object.fromEntries(
    Object.entries(DEFAULT_NOTION_PROPERTY_MAPPING).map(([key, fallback]) => [
      key,
      typeof value[key] === "string" ? value[key] : fallback,
    ]),
  ) as NotionPropertyMappingPayload;
}

function normalizeConflictStrategy(value: string): NotionConflictStrategy {
  return value === "LOCAL_WINS" || value === "NOTION_WINS"
    ? value
    : "NEWEST_WINS";
}

function shouldLocalWin(
  mapping: NotionMappingPayload,
  localUpdatedAt: Date,
  remoteUpdatedAt: Date,
): boolean {
  if (mapping.conflictStrategy === "LOCAL_WINS") {
    return true;
  }

  if (mapping.conflictStrategy === "NOTION_WINS") {
    return false;
  }

  return localUpdatedAt.getTime() >= remoteUpdatedAt.getTime();
}

function hashLocalEntity(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value, jsonDateReplacer))
    .digest("hex");
}

function jsonDateReplacer(_key: string, value: unknown): unknown {
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeContentStatus(
  value: string | null,
): ContentItemStatus | null {
  const normalized = value?.toUpperCase();

  return normalized === "DRAFT" ||
    normalized === "REVIEW" ||
    normalized === "READY" ||
    normalized === "SCHEDULED" ||
    normalized === "PUBLISHED" ||
    normalized === "ARCHIVED"
    ? normalized
    : null;
}

function normalizeResourceStatus(value: string | null): ResourceStatus | null {
  const normalized = value?.toUpperCase();

  return normalized === "NEW" ||
    normalized === "SUMMARIZED" ||
    normalized === "USED" ||
    normalized === "ARCHIVED"
    ? normalized
    : null;
}

function toSafeNotionError(error: unknown): { code: string; message: string } {
  if (error instanceof NotionApiError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof HttpException) {
    return { code: "NOTION_SYNC_REJECTED", message: error.message };
  }

  return {
    code: "NOTION_SYNC_FAILED",
    message: "Synchronisation Notion impossible.",
  };
}

function throwNotionHttpError(error: unknown): never {
  if (error instanceof HttpException) {
    throw error;
  }

  const safeError = toSafeNotionError(error);
  throw new HttpException(
    { code: safeError.code, message: safeError.message },
    error instanceof NotionApiError && error.status === 429 ? 429 : 502,
  );
}

function isProviderWideNotionError(error: unknown): boolean {
  return (
    error instanceof NotionApiError &&
    (error.code === "NOTION_AUTH_EXPIRED" ||
      error.code === "NOTION_RATE_LIMITED")
  );
}

function parseFrontendOrigins(value?: string): string[] {
  const origins = (value ?? "")
    .split(",")
    .map((candidate) => candidate.trim())
    .filter(Boolean)
    .flatMap((candidate) => {
      try {
        return [new URL(candidate).origin];
      } catch {
        return [];
      }
    });

  return origins.length > 0
    ? Array.from(new Set(origins))
    : ["http://localhost:3000"];
}

export function resolveAllowedFrontendOrigin(
  requestOrigin: string | undefined,
  allowedOrigins: string[],
): string {
  let normalized: string | null = null;
  try {
    normalized = requestOrigin ? new URL(requestOrigin).origin : null;
  } catch {
    normalized = null;
  }

  return normalized && allowedOrigins.includes(normalized)
    ? normalized
    : (allowedOrigins[0] ?? "http://localhost:3000");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
