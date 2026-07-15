import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  NotionConflictStrategy,
  NotionIntegrationPayload,
  NotionMappingPayload,
  NotionPropertyIdMappingPayload,
  NotionPropertyMappingPayload,
  NotionPropertyTypeMappingPayload,
  NotionProvisionPayload,
  NotionSchemaHealthPayload,
  NotionSchemaIssuePayload,
  NotionSyncResultPayload,
} from "@content-ai/shared";
import { createHash, randomUUID } from "node:crypto";
import { sign, verify } from "jsonwebtoken";

import { PrismaService } from "../database/prisma.service";
import type { Prisma } from "../generated/prisma/client";
import type { ActiveOrganizationContext } from "../organizations/organizations.types";
import type { SaveNotionMappingDto } from "./dto/save-notion-mapping.dto";
import type {
  ProvisionNotionDatabaseDto,
  RepairNotionDatabaseDto,
} from "./dto/notion-admin.dto";
import { IntegrationEncryptionService } from "./integration-encryption.service";
import { NotionAdapter } from "./notion/notion.adapter";
import {
  buildNotionBodyChildren,
  buildNotionProperties,
  DEFAULT_NOTION_PROPERTY_MAPPING,
  DEFAULT_NOTION_PROPERTY_TYPES,
  fromNotionContentStatus,
  fromNotionResourceStatus,
  MANAGED_NOTION_PROPERTY_SCHEMA,
  MANAGED_NOTION_PROPERTY_TYPES,
  MANAGED_NOTION_STATUS_OPTIONS,
  managedStatusOption,
  readNotionPageFields,
} from "./notion/notion-mapping";
import type {
  NotionCredentialMetadata,
  NotionDataSource,
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

const MANAGED_NOTION_SCHEMA_VERSION = 1;
const PROVISIONING_LEASE_MS = 5 * 60 * 1_000;

type NotionMappingRecord = {
  conflictStrategy: string;
  createdAt: Date;
  dataSourceId: string | null;
  databaseId: string;
  databaseName: string;
  databaseUrl: string | null;
  id: string;
  lastSchemaCheckAt: Date | null;
  managed: boolean;
  managedMarker: string | null;
  organizationId: string;
  parentPageId: string | null;
  propertyIdMapping: unknown;
  propertyMapping: unknown;
  schemaStatus: string;
  schemaIssues: unknown;
  schemaVersion: number;
  updatedAt: Date;
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
      this.prisma.notionProvisioningLease.deleteMany({
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
      const sources = await this.notion.listDatabases(credential.accessToken);
      return sources.map((source) => ({
        databaseId: source.databaseId,
        dataSourceId: source.id,
        id: source.id,
        name: source.name,
        properties: source.properties,
        url: source.databaseUrl,
      }));
    } catch (error) {
      await this.recordCredentialError(
        organizationContext.organization.id,
        error,
      );
      throwNotionHttpError(error);
    }
  }

  async listNotionParentPages(organizationContext: ActiveOrganizationContext) {
    const organizationId = organizationContext.organization.id;
    const credential = await this.getCredential(organizationId);
    try {
      return await this.notion.listParentPages(credential.accessToken);
    } catch (error) {
      await this.recordCredentialError(organizationId, error);
      throwNotionHttpError(error);
    }
  }

  async provisionNotionDatabase(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    input: ProvisionNotionDatabaseDto,
  ): Promise<NotionProvisionPayload> {
    if (!input.confirmed) {
      throw new BadRequestException(
        "Confirmez explicitement la création de la base Notion.",
      );
    }

    const organizationId = organizationContext.organization.id;
    const marker = `planif-managed:${organizationId}`;
    const leaseToken = await this.acquireProvisioningLease(
      organizationId,
      input.parentPageId,
      marker,
    );
    if (!leaseToken) {
      throw new ConflictException(
        "Une configuration Notion est déjà en cours. Réessayez dans quelques instants.",
      );
    }

    let holdLeaseUntilExpiry = false;
    try {
      const credential = await this.getCredential(organizationId);
      const existingMapping =
        await this.prisma.notionDatabaseMapping.findUnique({
          where: { organizationId },
        });
      let discovered = await this.notion.findManagedDatabase(
        credential.accessToken,
        marker,
        {
          ...(existingMapping?.managed &&
          existingMapping.managedMarker === marker &&
          existingMapping.dataSourceId
            ? {
                preferred: {
                  databaseId: existingMapping.databaseId,
                  dataSourceId: existingMapping.dataSourceId,
                },
              }
            : {}),
          requiredProperties: managedSourceRequirements(),
        },
      );
      let recovered = Boolean(discovered);
      if (!discovered) {
        try {
          await this.renewProvisioningLease(leaseToken);
          discovered = await this.notion.createDatabase(
            credential.accessToken,
            {
              description: `${marker} — Base gérée automatiquement par Planif.`,
              parentPageId: input.parentPageId,
              properties: MANAGED_NOTION_PROPERTY_SCHEMA,
              title: "Planif",
            },
          );
        } catch (error) {
          if (
            error instanceof NotionApiError &&
            (error.code === "NOTION_NETWORK_ERROR" ||
              error.code === "NOTION_CREATION_AMBIGUOUS")
          ) {
            holdLeaseUntilExpiry = true;
            // One read-only rediscovery is safe; the creation POST is never replayed.
            discovered = await this.notion.findManagedDatabase(
              credential.accessToken,
              marker,
              {
                requiredProperties: managedSourceRequirements(),
              },
            );
            if (!discovered) throw error;
            recovered = true;
          } else {
            throw error;
          }
        }
      }

      await this.renewProvisioningLease(leaseToken);
      const persisted = await this.persistNotionBinding({
        conflictStrategy: "NEWEST_WINS",
        dataSource: discovered.dataSource,
        database: discovered.database,
        leaseToken,
        managed: true,
        marker,
        organizationId,
        parentPageId: input.parentPageId,
        recovered,
        userId,
      });
      await this.releaseProvisioningLease(leaseToken, null, false);
      return {
        health: persisted.health,
        mapping: toMappingPayload(persisted.mapping, persisted.health),
        recovered,
      };
    } catch (error) {
      const safe = toSafeNotionError(error);
      await this.releaseProvisioningLease(
        leaseToken,
        safe.code,
        holdLeaseUntilExpiry,
      );
      await this.recordCredentialError(organizationId, error);
      throwNotionHttpError(error);
    }
  }

  async diagnoseNotionSchema(
    userId: string,
    organizationContext: ActiveOrganizationContext,
  ): Promise<NotionSchemaHealthPayload> {
    const organizationId = organizationContext.organization.id;
    const connection = await this.getConnection(organizationId, false);
    try {
      const health = await this.inspectAndPersistSchema(
        connection.credential.accessToken,
        connection.record,
      );
      await this.prisma.organizationAuditLog.create({
        data: {
          action: "NOTION_SCHEMA_CHECKED",
          actorUserId: userId,
          metadata: {
            dataSourceId: connection.mapping.dataSourceId,
            issueCount: health.issues.length,
            status: health.status,
          },
          organizationId,
          targetId: connection.record.id,
          targetType: "NOTION_MAPPING",
        },
      });
      return health;
    } catch (error) {
      const safe = toSafeNotionError(error);
      await Promise.all([
        this.recordCredentialError(organizationId, error),
        this.prisma.organizationAuditLog.create({
          data: {
            action: "NOTION_SCHEMA_CHECKED",
            actorUserId: userId,
            metadata: {
              dataSourceId: connection.mapping.dataSourceId,
              errorCode: safe.code,
              issueCount: 0,
              status: "UNAVAILABLE",
            },
            organizationId,
            targetId: connection.record.id,
            targetType: "NOTION_MAPPING",
          },
        }),
      ]);
      throwNotionHttpError(error);
    }
  }

  async repairNotionSchema(
    userId: string,
    organizationContext: ActiveOrganizationContext,
    input: RepairNotionDatabaseDto,
  ): Promise<NotionProvisionPayload> {
    if (!input.confirmed) {
      throw new BadRequestException(
        "Confirmez explicitement la réparation du schéma Notion.",
      );
    }
    const organizationId = organizationContext.organization.id;
    const connection = await this.getConnection(organizationId, false);
    const dataSourceId = connection.mapping.dataSourceId;
    if (!dataSourceId) {
      throw new ConflictException(
        "La source de données Notion doit être identifiée avant réparation.",
      );
    }

    try {
      const source = await this.notion.retrieveDataSource(
        connection.credential.accessToken,
        dataSourceId,
      );
      const currentHealth = assessNotionSchema(source, connection.mapping);
      if (currentHealth.issues.some((issue) => !issue.reparable)) {
        throw new ConflictException(
          "La source Notion ne correspond plus à la base configurée. Reconfigurez la base avant de synchroniser.",
        );
      }
      const repair = buildNotionSchemaRepair(source, connection.mapping);
      const repairedSource =
        Object.keys(repair.properties).length > 0
          ? await this.notion.updateDataSource(
              connection.credential.accessToken,
              dataSourceId,
              repair.properties,
            )
          : source;
      const propertyIdMapping = mapPropertyIds(
        repairedSource.properties,
        repair.propertyMapping,
      );
      const propertyTypes = validateNotionPropertyMapping(
        repairedSource.properties,
        repair.propertyMapping,
      );
      const health = assessNotionSchema(repairedSource, {
        databaseId: connection.mapping.databaseId,
        propertyIdMapping,
        propertyMapping: repair.propertyMapping,
      });
      const saved = await this.prisma.$transaction(async (transaction) => {
        const updated = await transaction.notionDatabaseMapping.update({
          data: {
            lastSchemaCheckAt: new Date(health.checkedAt!),
            propertyIdMapping,
            propertyMapping: {
              ...repair.propertyMapping,
              __types: propertyTypes,
            },
            schemaIssues: health.issues,
            schemaStatus: health.status,
          },
          where: { organizationId },
        });
        await transaction.organizationAuditLog.create({
          data: {
            action: "NOTION_SCHEMA_REPAIRED",
            actorUserId: userId,
            metadata: {
              createdOrExtendedProperties: Object.keys(repair.properties),
              dataSourceId,
            },
            organizationId,
            targetId: updated.id,
            targetType: "NOTION_MAPPING",
          },
        });
        return updated;
      });
      if (health.status !== "READY") {
        throw new ConflictException(
          "Le schéma Notion reste incomplet après la réparation. Relancez le diagnostic.",
        );
      }
      return {
        health,
        mapping: toMappingPayload(saved, health),
        recovered: false,
      };
    } catch (error) {
      await this.recordCredentialError(organizationId, error);
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
    let database;
    let dataSource;
    try {
      [database, dataSource] = await Promise.all([
        this.notion.retrieveDatabase(credential.accessToken, input.databaseId),
        this.notion.retrieveDataSource(
          credential.accessToken,
          input.dataSourceId,
        ),
      ]);
    } catch (error) {
      await this.recordCredentialError(organizationId, error);
      throwNotionHttpError(error);
    }

    if (dataSource.databaseId !== database.id) {
      throw new BadRequestException(
        "Cette source de données n'appartient pas à la base Notion sélectionnée.",
      );
    }

    const propertyTypes = validateNotionPropertyMapping(
      dataSource.properties,
      input.propertyMapping,
    );
    const propertyIdMapping = mapPropertyIds(
      dataSource.properties,
      input.propertyMapping,
    );
    const persistedMapping = {
      ...input.propertyMapping,
      __types: propertyTypes,
    };
    const health = assessNotionSchema(dataSource, {
      databaseId: database.id,
      propertyIdMapping,
      propertyMapping: input.propertyMapping,
    });
    const mapping = await this.prisma.$transaction(
      async (transaction) => {
        const existing = await transaction.notionDatabaseMapping.findUnique({
          select: { databaseId: true, dataSourceId: true },
          where: { organizationId },
        });

        if (
          existing &&
          (existing.databaseId !== database.id ||
            existing.dataSourceId !== dataSource.id)
        ) {
          await transaction.notionSyncState.deleteMany({
            where: { organizationId },
          });
        }

        const saved = await transaction.notionDatabaseMapping.upsert({
          create: {
            conflictStrategy: input.conflictStrategy,
            databaseId: database.id,
            databaseName: database.name,
            databaseUrl: database.url,
            dataSourceId: dataSource.id,
            lastSchemaCheckAt: new Date(health.checkedAt!),
            managed: false,
            organizationId,
            parentPageId: database.parentPageId,
            propertyIdMapping,
            propertyMapping: persistedMapping,
            schemaIssues: health.issues,
            schemaStatus: health.status,
            schemaVersion: MANAGED_NOTION_SCHEMA_VERSION,
          },
          update: {
            conflictStrategy: input.conflictStrategy,
            databaseId: database.id,
            databaseName: database.name,
            databaseUrl: database.url,
            dataSourceId: dataSource.id,
            lastSchemaCheckAt: new Date(health.checkedAt!),
            managed: false,
            managedMarker: null,
            parentPageId: database.parentPageId,
            propertyIdMapping,
            propertyMapping: persistedMapping,
            schemaIssues: health.issues,
            schemaStatus: health.status,
            schemaVersion: MANAGED_NOTION_SCHEMA_VERSION,
          },
          where: { organizationId },
        });

        await transaction.organizationAuditLog.create({
          data: {
            action: "NOTION_MAPPING_UPDATED",
            actorUserId: userId,
            metadata: {
              databaseChanged: Boolean(
                existing &&
                (existing.databaseId !== database.id ||
                  existing.dataSourceId !== dataSource.id),
              ),
              databaseId: database.id,
              dataSourceId: dataSource.id,
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

    return toMappingPayload(mapping, health);
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
      propertyIds: connection.mapping.propertyIdMapping,
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
        parent: {
          data_source_id: requireDataSourceId(connection.mapping),
          type: "data_source_id",
        },
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
      propertyIds: connection.mapping.propertyIdMapping,
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
          parent: {
            data_source_id: requireDataSourceId(connection.mapping),
            type: "data_source_id",
          },
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
      connection.mapping.propertyIdMapping,
    );
    const status = fromNotionContentStatus(fields.status);
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
      connection.mapping.propertyIdMapping,
    );
    const status = fromNotionResourceStatus(fields.status);
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
          "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))::text AS lock_result",
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
    requireHealthy = true,
  ): Promise<NotionConnection> {
    const credential = await this.getCredential(organizationId);
    const foundMapping = await this.prisma.notionDatabaseMapping.findUnique({
      where: { organizationId },
    });

    if (!foundMapping) {
      throw new ConflictException(
        "Configurez une base Notion avant de synchroniser.",
      );
    }

    const mapping =
      !foundMapping.dataSourceId ||
      (!foundMapping.managed &&
        !hasCompletePropertyIds(foundMapping.propertyIdMapping))
        ? await this.backfillLegacyNotionMapping(
            credential.accessToken,
            foundMapping,
          )
        : foundMapping;

    if (requireHealthy && mapping.schemaStatus !== "READY") {
      throw new ConflictException(
        "Contrôlez puis réparez le schéma Notion avant de synchroniser.",
      );
    }

    return {
      credential,
      mapping: toMappingPayload(mapping),
      organizationId,
      record: mapping,
    };
  }

  private async backfillLegacyNotionMapping(
    accessToken: string,
    mapping: NotionMappingRecord,
  ): Promise<NotionMappingRecord> {
    const database = await this.notion.retrieveDatabase(
      accessToken,
      mapping.databaseId,
    );
    const sources: NotionDataSource[] = [];
    for (const candidate of database.dataSources) {
      sources.push(
        await this.notion.retrieveDataSource(accessToken, candidate.id),
      );
    }
    const propertyMapping = normalizePropertyMapping(mapping.propertyMapping);
    const compatible = sources.filter((source) => {
      try {
        validateNotionPropertyMapping(source.properties, propertyMapping);
        return true;
      } catch {
        return false;
      }
    });
    const source =
      sources.find((candidate) => candidate.id === mapping.dataSourceId) ??
      (sources.length === 1
        ? sources[0]
        : compatible.length === 1
          ? compatible[0]
          : null);
    if (!source) {
      throw new ConflictException(
        "Cette base contient plusieurs sources. Sélectionnez la source à utiliser dans le mode avancé.",
      );
    }
    const propertyTypes = validateNotionPropertyMapping(
      source.properties,
      propertyMapping,
    );
    const propertyIdMapping = mapPropertyIds(
      source.properties,
      propertyMapping,
    );
    const health = assessNotionSchema(source, {
      databaseId: database.id,
      propertyIdMapping,
      propertyMapping,
    });
    const saved = await this.prisma.$transaction(
      async (transaction) => {
        const current = await transaction.notionDatabaseMapping.findUnique({
          select: { dataSourceId: true },
          where: { organizationId: mapping.organizationId },
        });
        if (current?.dataSourceId && current.dataSourceId !== source.id) {
          await transaction.notionSyncState.deleteMany({
            where: { organizationId: mapping.organizationId },
          });
        }
        return transaction.notionDatabaseMapping.update({
          data: {
            dataSourceId: source.id,
            databaseName: database.name,
            databaseUrl: database.url,
            lastSchemaCheckAt: new Date(health.checkedAt!),
            parentPageId: database.parentPageId,
            propertyIdMapping,
            propertyMapping: { ...propertyMapping, __types: propertyTypes },
            schemaIssues: health.issues,
            schemaStatus: health.status,
          },
          where: { organizationId: mapping.organizationId },
        });
      },
      { isolationLevel: "Serializable" },
    );
    return saved;
  }

  private async inspectAndPersistSchema(
    accessToken: string,
    mapping: NotionMappingRecord,
  ): Promise<NotionSchemaHealthPayload> {
    if (!mapping.dataSourceId) {
      const health: NotionSchemaHealthPayload = {
        checkedAt: new Date().toISOString(),
        issues: [sourceMismatchIssue()],
        status: "DRIFTED",
      };
      const persisted = await this.prisma.notionDatabaseMapping.updateMany({
        data: {
          lastSchemaCheckAt: new Date(health.checkedAt!),
          schemaIssues: health.issues,
          schemaStatus: health.status,
        },
        where: {
          organizationId: mapping.organizationId,
          updatedAt: mapping.updatedAt,
        },
      });
      if (persisted.count === 0) {
        return this.readCurrentNotionSchemaHealth(mapping.organizationId);
      }
      return health;
    }
    try {
      const source = await this.notion.retrieveDataSource(
        accessToken,
        mapping.dataSourceId,
      );
      const mappingPayload = toMappingPayload(mapping);
      const health = assessNotionSchema(source, mappingPayload);
      const propertyMapping = reconcilePropertyNames(source, mappingPayload);
      const persisted = await this.prisma.notionDatabaseMapping.updateMany({
        data: {
          lastSchemaCheckAt: new Date(health.checkedAt!),
          propertyMapping: {
            ...propertyMapping,
            __types: mappingPayload.propertyTypes,
          },
          schemaIssues: health.issues,
          schemaStatus: health.status,
        },
        where: {
          organizationId: mapping.organizationId,
          updatedAt: mapping.updatedAt,
        },
      });
      if (persisted.count === 0) {
        return this.readCurrentNotionSchemaHealth(mapping.organizationId);
      }
      return health;
    } catch (error) {
      const health: NotionSchemaHealthPayload = {
        checkedAt: new Date().toISOString(),
        issues: [],
        status: "UNAVAILABLE",
      };
      await this.prisma.notionDatabaseMapping.updateMany({
        data: {
          lastSchemaCheckAt: new Date(health.checkedAt!),
          schemaIssues: health.issues,
          schemaStatus: health.status,
        },
        where: {
          organizationId: mapping.organizationId,
          updatedAt: mapping.updatedAt,
        },
      });
      throw error;
    }
  }

  private async readCurrentNotionSchemaHealth(
    organizationId: string,
  ): Promise<NotionSchemaHealthPayload> {
    const current = await this.prisma.notionDatabaseMapping.findUnique({
      where: { organizationId },
    });
    if (!current) {
      throw new ConflictException("Le mapping Notion n'existe plus.");
    }
    return toMappingPayload(current).schemaHealth;
  }

  private async persistNotionBinding(input: {
    conflictStrategy: NotionConflictStrategy;
    dataSource: NotionDataSource;
    database: {
      id: string;
      name: string;
      parentPageId: string | null;
      url: string | null;
    };
    leaseToken: string;
    managed: boolean;
    marker: string | null;
    organizationId: string;
    parentPageId: string | null;
    recovered: boolean;
    userId: string;
  }): Promise<{
    health: NotionSchemaHealthPayload;
    mapping: NotionMappingRecord;
  }> {
    const previous = await this.prisma.notionDatabaseMapping.findUnique({
      where: { organizationId: input.organizationId },
    });
    const reusePrevious = Boolean(
      previous?.managed &&
      previous.databaseId === input.database.id &&
      previous.dataSourceId === input.dataSource.id,
    );
    const initialPropertyMapping = reusePrevious
      ? normalizePropertyMapping(previous!.propertyMapping)
      : DEFAULT_NOTION_PROPERTY_MAPPING;
    const initialPropertyIds = reusePrevious
      ? normalizePropertyIdMapping(previous!.propertyIdMapping)
      : mapAvailablePropertyIds(
          input.dataSource.properties,
          initialPropertyMapping,
        );
    const reference = {
      databaseId: input.database.id,
      propertyIdMapping: initialPropertyIds,
      propertyMapping: initialPropertyMapping,
    };
    const propertyMapping = reconcilePropertyNames(input.dataSource, reference);
    const propertyIdMapping = reusePrevious
      ? initialPropertyIds
      : mapAvailablePropertyIds(input.dataSource.properties, propertyMapping);
    const propertyTypes = derivePropertyTypes(
      input.dataSource,
      propertyIdMapping,
      reusePrevious
        ? normalizePropertyTypes(previous!.propertyMapping)
        : MANAGED_NOTION_PROPERTY_TYPES,
    );
    const health = assessNotionSchema(input.dataSource, {
      databaseId: input.database.id,
      propertyIdMapping,
      propertyMapping,
    });
    const actualParentPageId =
      input.database.parentPageId ?? input.parentPageId;
    return this.prisma.$transaction(
      async (transaction) => {
        const lease = await transaction.$queryRawUnsafe<
          Array<{ lease_token: string }>
        >(
          `select lease_token::text
           from public.notion_provisioning_leases
           where organization_id = $1::uuid
             and lease_token = $2::uuid
             and lease_expires_at > now()
           for update`,
          input.organizationId,
          input.leaseToken,
        );
        if (lease[0]?.lease_token !== input.leaseToken) {
          throw new ConflictException(
            "La configuration Notion a été remplacée ou annulée. Relancez-la.",
          );
        }
        const existing = await transaction.notionDatabaseMapping.findUnique({
          select: { databaseId: true, dataSourceId: true },
          where: { organizationId: input.organizationId },
        });
        const sourceChanged = Boolean(
          existing &&
          (existing.databaseId !== input.database.id ||
            existing.dataSourceId !== input.dataSource.id),
        );
        if (sourceChanged) {
          await transaction.notionSyncState.deleteMany({
            where: { organizationId: input.organizationId },
          });
        }
        const saved = await transaction.notionDatabaseMapping.upsert({
          create: {
            conflictStrategy: input.conflictStrategy,
            dataSourceId: input.dataSource.id,
            databaseId: input.database.id,
            databaseName: input.database.name,
            databaseUrl: input.database.url,
            lastSchemaCheckAt: new Date(health.checkedAt!),
            managed: input.managed,
            managedMarker: input.marker,
            organizationId: input.organizationId,
            parentPageId: actualParentPageId,
            propertyIdMapping,
            propertyMapping: { ...propertyMapping, __types: propertyTypes },
            schemaIssues: health.issues,
            schemaStatus: health.status,
            schemaVersion: MANAGED_NOTION_SCHEMA_VERSION,
          },
          update: {
            conflictStrategy: input.conflictStrategy,
            dataSourceId: input.dataSource.id,
            databaseId: input.database.id,
            databaseName: input.database.name,
            databaseUrl: input.database.url,
            lastSchemaCheckAt: new Date(health.checkedAt!),
            managed: input.managed,
            managedMarker: input.marker,
            parentPageId: actualParentPageId,
            propertyIdMapping,
            propertyMapping: { ...propertyMapping, __types: propertyTypes },
            schemaIssues: health.issues,
            schemaStatus: health.status,
            schemaVersion: MANAGED_NOTION_SCHEMA_VERSION,
          },
          where: { organizationId: input.organizationId },
        });
        await transaction.organizationAuditLog.create({
          data: {
            action: input.recovered
              ? "NOTION_MANAGED_DATABASE_RECOVERED"
              : "NOTION_MANAGED_DATABASE_PROVISIONED",
            actorUserId: input.userId,
            metadata: {
              databaseId: input.database.id,
              dataSourceId: input.dataSource.id,
              parentPageId: actualParentPageId,
            },
            organizationId: input.organizationId,
            targetId: saved.id,
            targetType: "NOTION_MAPPING",
          },
        });
        return { health, mapping: saved };
      },
      { isolationLevel: "Serializable" },
    );
  }

  private async acquireProvisioningLease(
    organizationId: string,
    parentPageId: string,
    marker: string,
  ): Promise<string | null> {
    const token = randomUUID();
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ lease_token: string }>
    >(
      `insert into public.notion_provisioning_leases
        (organization_id, lease_token, lease_expires_at, marker, parent_page_id, updated_at)
       values ($1::uuid, $2::uuid, now() + ($3::integer * interval '1 millisecond'), $4, $5, now())
       on conflict (organization_id) do update set
         lease_token = excluded.lease_token,
         lease_expires_at = excluded.lease_expires_at,
         marker = excluded.marker,
         parent_page_id = excluded.parent_page_id,
         last_error_code = null,
         updated_at = now()
       where notion_provisioning_leases.lease_expires_at <= now()
       returning lease_token::text`,
      organizationId,
      token,
      PROVISIONING_LEASE_MS,
      marker,
      parentPageId,
    );
    return rows[0]?.lease_token === token ? token : null;
  }

  private async renewProvisioningLease(token: string): Promise<void> {
    const renewed = await this.prisma.$executeRawUnsafe(
      `update public.notion_provisioning_leases
       set lease_expires_at = now() + ($2::integer * interval '1 millisecond'),
           updated_at = now()
       where lease_token = $1::uuid`,
      token,
      PROVISIONING_LEASE_MS,
    );
    if (renewed !== 1) {
      throw new ConflictException(
        "La configuration Notion a été remplacée ou annulée. Relancez-la.",
      );
    }
  }

  private async releaseProvisioningLease(
    token: string,
    errorCode: string | null,
    holdUntilExpiry: boolean,
  ): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `update public.notion_provisioning_leases
       set lease_expires_at = case
             when $2 then now() + ($4::integer * interval '1 millisecond')
             else now()
           end,
           last_error_code = $3,
           updated_at = now()
       where lease_token = $1::uuid`,
      token,
      holdUntilExpiry,
      errorCode,
      PROVISIONING_LEASE_MS,
    );
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
  record: NotionMappingRecord;
};

function toMappingPayload(
  mapping: NotionMappingRecord,
  health?: NotionSchemaHealthPayload,
): NotionMappingPayload {
  const checkedAt = mapping.lastSchemaCheckAt?.toISOString() ?? null;
  return {
    conflictStrategy: normalizeConflictStrategy(mapping.conflictStrategy),
    databaseId: mapping.databaseId,
    databaseName: mapping.databaseName,
    databaseUrl: mapping.databaseUrl ?? null,
    dataSourceId: mapping.dataSourceId ?? null,
    managed: mapping.managed ?? false,
    parentPageId: mapping.parentPageId ?? null,
    propertyIdMapping: normalizePropertyIdMapping(mapping.propertyIdMapping),
    propertyMapping: normalizePropertyMapping(mapping.propertyMapping),
    propertyTypes: normalizePropertyTypes(mapping.propertyMapping),
    schemaHealth: health ?? {
      checkedAt,
      issues: normalizeSchemaIssues(mapping.schemaIssues),
      status: normalizeSchemaStatus(mapping.schemaStatus),
    },
    schemaVersion: mapping.schemaVersion ?? MANAGED_NOTION_SCHEMA_VERSION,
    setupMode: mapping.managed ? "MANAGED" : "ADVANCED",
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
  properties: Array<{
    id?: string;
    name: string;
    options?: string[];
    type: string;
  }>,
  mapping: NotionPropertyMappingPayload,
): NotionPropertyTypeMappingPayload {
  const configuredNames = Object.values(mapping);
  if (new Set(configuredNames).size !== configuredNames.length) {
    throw new BadRequestException(
      "Chaque champ doit utiliser une propriété Notion distincte.",
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
        `Propriété Notion introuvable pour ${field}: ${propertyName}.`,
      );
    }
    if (!expected[field].includes(property.type)) {
      throw new BadRequestException(
        `La propriété ${propertyName} doit être de type ${expected[field].join(" ou ")}.`,
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

export function mapPropertyIds(
  properties: Array<{ id?: string; name: string }>,
  mapping: NotionPropertyMappingPayload,
): NotionPropertyIdMappingPayload {
  const byName = new Map(
    properties.map((property) => [property.name, property]),
  );
  return Object.fromEntries(
    (
      Object.entries(mapping) as Array<
        [keyof NotionPropertyMappingPayload, string]
      >
    ).map(([field, name]) => {
      const property = byName.get(name);
      if (!property?.id) {
        throw new BadRequestException(
          `L'identifiant stable de la propriété ${name} est introuvable.`,
        );
      }
      return [field, property.id];
    }),
  ) as NotionPropertyIdMappingPayload;
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

function normalizePropertyIdMapping(
  value: unknown,
): NotionPropertyIdMappingPayload {
  return Object.fromEntries(
    Object.keys(DEFAULT_NOTION_PROPERTY_MAPPING).map((key) => [
      key,
      isRecord(value) && typeof value[key] === "string" ? value[key] : "",
    ]),
  ) as NotionPropertyIdMappingPayload;
}

function hasCompletePropertyIds(value: unknown): boolean {
  return Object.values(normalizePropertyIdMapping(value)).every(Boolean);
}

function normalizeSchemaStatus(value: string | undefined) {
  return value === "PROVISIONING" ||
    value === "READY" ||
    value === "DRIFTED" ||
    value === "UNAVAILABLE"
    ? value
    : "UNCHECKED";
}

function normalizeSchemaIssues(value: unknown): NotionSchemaIssuePayload[] {
  const codes = new Set([
    "MISSING_PROPERTY",
    "INCOMPATIBLE_PROPERTY",
    "MISSING_STATUS_OPTIONS",
    "SOURCE_MISMATCH",
  ]);
  const fields = new Set(Object.keys(DEFAULT_NOTION_PROPERTY_MAPPING));
  if (!Array.isArray(value)) return [];
  return value.flatMap((issue) => {
    if (
      !isRecord(issue) ||
      typeof issue.code !== "string" ||
      !codes.has(issue.code) ||
      typeof issue.field !== "string" ||
      !fields.has(issue.field) ||
      typeof issue.expectedType !== "string" ||
      typeof issue.message !== "string" ||
      typeof issue.reparable !== "boolean"
    ) {
      return [];
    }
    return [
      {
        actualType:
          typeof issue.actualType === "string" ? issue.actualType : null,
        code: issue.code as NotionSchemaIssuePayload["code"],
        expectedType: issue.expectedType,
        field: issue.field as keyof NotionPropertyMappingPayload,
        message: issue.message,
        propertyId:
          typeof issue.propertyId === "string" ? issue.propertyId : null,
        reparable: issue.reparable,
      },
    ];
  });
}

function requireDataSourceId(mapping: NotionMappingPayload): string {
  if (!mapping.dataSourceId) {
    throw new ConflictException(
      "La source de données Notion n'est pas encore configurée.",
    );
  }
  return mapping.dataSourceId;
}

type NotionSchemaReference = Pick<
  NotionMappingPayload,
  "databaseId" | "propertyIdMapping" | "propertyMapping"
>;

export function assessNotionSchema(
  source: NotionDataSource,
  mapping: NotionSchemaReference,
): NotionSchemaHealthPayload {
  const issues: NotionSchemaIssuePayload[] = [];
  if (source.databaseId !== mapping.databaseId)
    issues.push(sourceMismatchIssue());
  const expected = expectedNotionTypes();
  for (const field of Object.keys(DEFAULT_NOTION_PROPERTY_MAPPING) as Array<
    keyof NotionPropertyMappingPayload
  >) {
    const id = mapping.propertyIdMapping[field];
    const property = source.properties.find((candidate) => candidate.id === id);
    if (!property) {
      issues.push({
        actualType: null,
        code: "MISSING_PROPERTY",
        expectedType: expected[field].join(" ou "),
        field,
        message: `La propriété ${mapping.propertyMapping[field]} a été supprimée ou remplacée.`,
        propertyId: id || null,
        reparable: true,
      });
      continue;
    }
    if (!expected[field].includes(property.type)) {
      issues.push({
        actualType: property.type,
        code: "INCOMPATIBLE_PROPERTY",
        expectedType: expected[field].join(" ou "),
        field,
        message: `La propriété ${property.name} a un type incompatible (${property.type}).`,
        propertyId: property.id,
        reparable: true,
      });
      continue;
    }
    if (
      field === "status" &&
      MANAGED_NOTION_STATUS_OPTIONS.some(
        (option) => !property.options.includes(option),
      )
    ) {
      issues.push({
        actualType: property.type,
        code: "MISSING_STATUS_OPTIONS",
        expectedType: property.type,
        field,
        message: "Certaines valeurs de statut françaises sont absentes.",
        propertyId: property.id,
        reparable: true,
      });
    }
  }
  return {
    checkedAt: new Date().toISOString(),
    issues,
    status: issues.length === 0 ? "READY" : "DRIFTED",
  };
}

function sourceMismatchIssue(): NotionSchemaIssuePayload {
  return {
    actualType: null,
    code: "SOURCE_MISMATCH",
    expectedType: "data_source",
    field: "title",
    message: "La source de données ne correspond plus à la base configurée.",
    propertyId: null,
    reparable: false,
  };
}

export function buildNotionSchemaRepair(
  source: NotionDataSource,
  mapping: NotionMappingPayload,
): {
  properties: Record<string, unknown>;
  propertyMapping: NotionPropertyMappingPayload;
} {
  const updates: Record<string, unknown> = {};
  const names = new Set(source.properties.map((property) => property.name));
  const propertyMapping = { ...mapping.propertyMapping };
  const expected = expectedNotionTypes();
  const claimed = new Set<string>();

  for (const field of Object.keys(DEFAULT_NOTION_PROPERTY_MAPPING) as Array<
    keyof NotionPropertyMappingPayload
  >) {
    const persistedId = mapping.propertyIdMapping[field];
    let property = source.properties.find(
      (candidate) => candidate.id === persistedId,
    );
    if (property && expected[field].includes(property.type)) {
      claimed.add(property.id);
      propertyMapping[field] = property.name;
      if (field === "status") addMissingStatusOptions(updates, property);
      continue;
    }

    property = source.properties.find(
      (candidate) =>
        !claimed.has(candidate.id) &&
        (candidate.name === propertyMapping[field] ||
          (field === "title" && candidate.type === "title")) &&
        expected[field].includes(candidate.type),
    );
    if (property) {
      claimed.add(property.id);
      propertyMapping[field] = property.name;
      if (field === "status") addMissingStatusOptions(updates, property);
      continue;
    }

    const canonicalName = DEFAULT_NOTION_PROPERTY_MAPPING[field];
    const newName = uniquePropertyName(canonicalName, names);
    names.add(newName);
    propertyMapping[field] = newName;
    updates[newName] = schemaForField(field, mapping.propertyTypes[field]);
  }
  return { properties: updates, propertyMapping };
}

function addMissingStatusOptions(
  updates: Record<string, unknown>,
  property: NotionDataSource["properties"][number],
): void {
  const missing = MANAGED_NOTION_STATUS_OPTIONS.filter(
    (option) => !property.options.includes(option),
  );
  if (missing.length === 0) return;
  updates[property.id] = {
    [property.type]: {
      options: [
        ...property.options.map((name) =>
          property.optionIds?.[name]
            ? { id: property.optionIds[name] }
            : { name },
        ),
        ...missing.map((name) =>
          property.type === "status" ? managedStatusOption(name) : { name },
        ),
      ],
    },
  };
}

function expectedNotionTypes(): Record<
  keyof NotionPropertyMappingPayload,
  string[]
> {
  return {
    channel: ["select"],
    date: ["date"],
    entityType: ["select"],
    sourceUrl: ["url"],
    status: ["select", "status"],
    title: ["title"],
  };
}

function schemaForField(
  field: keyof NotionPropertyMappingPayload,
  configuredType: string,
): Record<string, unknown> {
  if (field === "status") {
    const type = configuredType === "status" ? "status" : "select";
    return {
      [type]: {
        options: MANAGED_NOTION_STATUS_OPTIONS.map((name) =>
          type === "status" ? managedStatusOption(name) : { name },
        ),
      },
    };
  }
  const type = expectedNotionTypes()[field][0]!;
  return type === "select" ? { select: { options: [] } } : { [type]: {} };
}

function reconcilePropertyNames(
  source: NotionDataSource,
  mapping: NotionSchemaReference,
): NotionPropertyMappingPayload {
  const reconciled = { ...mapping.propertyMapping };
  const expected = expectedNotionTypes();
  for (const field of Object.keys(DEFAULT_NOTION_PROPERTY_MAPPING) as Array<
    keyof NotionPropertyMappingPayload
  >) {
    const property = source.properties.find(
      (candidate) => candidate.id === mapping.propertyIdMapping[field],
    );
    if (property && expected[field].includes(property.type)) {
      reconciled[field] = property.name;
    }
  }
  return reconciled;
}

function mapAvailablePropertyIds(
  properties: NotionDataSource["properties"],
  mapping: NotionPropertyMappingPayload,
): NotionPropertyIdMappingPayload {
  const expected = expectedNotionTypes();
  return Object.fromEntries(
    (
      Object.entries(mapping) as Array<
        [keyof NotionPropertyMappingPayload, string]
      >
    ).map(([field, name]) => {
      const property = properties.find(
        (candidate) =>
          candidate.name === name && expected[field].includes(candidate.type),
      );
      return [field, property?.id ?? ""];
    }),
  ) as NotionPropertyIdMappingPayload;
}

function derivePropertyTypes(
  source: NotionDataSource,
  propertyIds: NotionPropertyIdMappingPayload,
  fallback: NotionPropertyTypeMappingPayload,
): NotionPropertyTypeMappingPayload {
  const status = source.properties.find(
    (property) => property.id === propertyIds.status,
  );
  return {
    ...fallback,
    status: status?.type === "status" ? "status" : "select",
  };
}

function managedSourceRequirements() {
  const expected = expectedNotionTypes();
  return (
    Object.entries(DEFAULT_NOTION_PROPERTY_MAPPING) as Array<
      [keyof NotionPropertyMappingPayload, string]
    >
  ).map(([field, name]) => ({ name, types: expected[field] }));
}

function uniquePropertyName(base: string, names: Set<string>): string {
  if (!names.has(base)) return base;
  const first = `${base} (Planif)`;
  if (!names.has(first)) return first;
  let index = 2;
  while (names.has(`${base} (Planif ${index})`)) index += 1;
  return `${base} (Planif ${index})`;
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
  const status =
    error instanceof NotionApiError && error.status === 429
      ? 429
      : error instanceof NotionApiError &&
          (error.code === "NOTION_MANAGED_DATABASE_AMBIGUOUS" ||
            error.code === "NOTION_MANAGED_SOURCE_AMBIGUOUS" ||
            error.code === "NOTION_CREATION_AMBIGUOUS")
        ? 409
        : 502;
  throw new HttpException(
    { code: safeError.code, message: safeError.message },
    status,
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
