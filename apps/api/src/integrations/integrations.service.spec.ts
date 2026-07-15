import {
  assessNotionSchema,
  buildNotionSchemaRepair,
  IntegrationsService,
  resolveAllowedFrontendOrigin,
  validateNotionPropertyMapping,
} from "./integrations.service";
import { NotionApiError } from "./notion/notion.types";
import { MANAGED_NOTION_STATUS_OPTIONS } from "./notion/notion-mapping";

describe("IntegrationsService Notion synchronization", () => {
  it("requires distinct property names with compatible Notion types", () => {
    const properties = [
      { name: "Nom", type: "title" },
      { name: "Statut", type: "status" },
      { name: "Date", type: "date" },
      { name: "Canal", type: "select" },
      { name: "Type", type: "select" },
      { name: "URL", type: "url" },
    ];

    expect(
      validateNotionPropertyMapping(properties, {
        channel: "Canal",
        date: "Date",
        entityType: "Type",
        sourceUrl: "URL",
        status: "Statut",
        title: "Nom",
      }).status,
    ).toBe("status");
    expect(() =>
      validateNotionPropertyMapping(properties, {
        channel: "Canal",
        date: "Date",
        entityType: "Type",
        sourceUrl: "URL",
        status: "Nom",
        title: "Nom",
      }),
    ).toThrow("distincte");
  });

  it("falls back to a configured frontend origin instead of trusting input", () => {
    expect(
      resolveAllowedFrontendOrigin("https://evil.example", [
        "https://app.example.com",
      ]),
    ).toBe("https://app.example.com");
    expect(
      resolveAllowedFrontendOrigin("https://app.example.com/path", [
        "https://app.example.com",
      ]),
    ).toBe("https://app.example.com");
  });

  it("serializes duplicate exports and reuses the persisted page", async () => {
    let syncState: Record<string, unknown> | null = null;
    const transaction = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ lock_result: "" }]),
      notionSyncState: {
        findUnique: jest.fn(async () => syncState),
        upsert: jest.fn(
          async ({ create, update }: { create: object; update: object }) => {
            syncState = syncState ? { ...syncState, ...update } : { ...create };
            return syncState;
          },
        ),
      },
    };
    const prisma = basePrisma();
    prisma.$transaction = serializedTransaction(transaction);
    prisma.contentItem.findFirst = jest.fn().mockResolvedValue(content());
    const notion = baseNotion();
    notion.createPage.mockResolvedValue(page("page-1"));
    notion.updatePage.mockResolvedValue(page("page-1"));
    notion.retrievePage.mockResolvedValue(page("page-1"));
    const service = createService(prisma, notion);

    await Promise.all([
      service.exportContent("user", organizationContext(), "content"),
      service.exportContent("user", organizationContext(), "content"),
    ]);

    expect(notion.createPage).toHaveBeenCalledTimes(1);
    expect(notion.updatePage).toHaveBeenCalledTimes(1);
    expect(notion.replacePageBody).toHaveBeenCalledTimes(2);
    expect(transaction.$queryRawUnsafe).toHaveBeenCalledWith(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))::text AS lock_result",
      "notion:organization:CONTENT:content",
    );
    expect(transaction.$queryRawUnsafe).toHaveBeenCalledTimes(2);
  });

  it("paginates local entities beyond the first hundred", async () => {
    const prisma = basePrisma();
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      content(`content-${String(index).padStart(3, "0")}`),
    );
    prisma.contentItem.findMany = jest
      .fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([content("content-100")]);
    const service = createService(prisma, baseNotion());

    const results = await (
      service as unknown as {
        listAllContents(organizationId: string): Promise<unknown[]>;
      }
    ).listAllContents("organization");

    expect(results).toHaveLength(101);
    expect(prisma.contentItem.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        cursor: { id: "content-099" },
        skip: 1,
      }),
    );
  });

  it("removes a publication plan when the remote date is cleared", async () => {
    const { service, transaction } = remoteApplyHarness();

    await callApplyRemoteContent(
      service,
      transaction,
      page("page-1", {
        Canal: { select: { name: "BLOG" } },
        "Date de publication": { date: null },
        Nom: { title: [{ plain_text: "Remote" }] },
        Statut: { select: { name: "READY" } },
      }),
    );

    expect(transaction.publicationPlan.delete).toHaveBeenCalledWith({
      where: { id: "plan" },
    });
    expect(transaction.publicationPlan.update).not.toHaveBeenCalled();
  });

  it("updates the channel when Notion changes an existing schedule", async () => {
    const { service, transaction } = remoteApplyHarness();

    await callApplyRemoteContent(
      service,
      transaction,
      page("page-1", {
        Canal: { select: { name: "BLOG" } },
        "Date de publication": {
          date: { start: "2026-07-20T09:00:00.000Z" },
        },
        Nom: { title: [{ plain_text: "Remote" }] },
        Statut: { select: { name: "SCHEDULED" } },
      }),
    );

    expect(transaction.publicationPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ channel: "BLOG" }),
        where: { id: "plan" },
      }),
    );
  });

  it("treats expired provider auth as global and disables the credential", async () => {
    const prisma = basePrisma();
    prisma.contentItem.findMany = jest.fn().mockResolvedValue([content()]);
    prisma.curatedResource.findMany = jest.fn().mockResolvedValue([]);
    prisma.$transaction = jest.fn(
      async (handler: (client: unknown) => Promise<unknown>) =>
        handler({
          $queryRawUnsafe: jest.fn(),
          notionSyncState: {
            findUnique: jest.fn().mockResolvedValue({
              lastLocalHash: "previous",
              lastRemoteEditedAt: new Date("2026-07-01T00:00:00.000Z"),
              notionPageId: "page",
            }),
          },
        }),
    );
    const notion = baseNotion();
    notion.retrievePage.mockRejectedValue(
      new NotionApiError(
        "NOTION_AUTH_EXPIRED",
        "L'autorisation Notion a expire.",
        401,
      ),
    );
    const service = createService(prisma, notion);

    await expect(
      service.syncNotion("user", organizationContext()),
    ).rejects.toMatchObject({ status: 502 });
    expect(prisma.integrationCredential.updateMany).toHaveBeenCalledWith({
      data: { status: "ERROR" },
      where: { organizationId: "organization", provider: "NOTION" },
    });
  });

  it("treats visible property renames as healthy when stable IDs remain", () => {
    const source = managedSource().map((property) => ({
      ...property,
      name: `Renommé ${property.name}`,
    }));

    expect(
      assessNotionSchema(
        {
          databaseId: "database",
          databaseUrl: null,
          id: "source",
          name: "Planif",
          properties: source,
        },
        mappingPayload(),
      ),
    ).toMatchObject({ issues: [], status: "READY" });
  });

  it("absorbs visible renames into mapping metadata without remote writes", () => {
    const renamed = managedSource().map((property) => ({
      ...property,
      name: `Renommé ${property.name}`,
    }));
    const repair = buildNotionSchemaRepair(
      {
        databaseId: "database",
        databaseUrl: null,
        id: "source",
        name: "Planif",
        properties: renamed,
      },
      mappingPayload(),
    );

    expect(repair.properties).toEqual({});
    expect(repair.propertyMapping.title).toBe("Renommé Nom");
    expect(repair.propertyMapping.status).toBe("Renommé Statut");
  });

  it("reuses Notion's only title property instead of trying to create a second one", () => {
    const source = managedSource().map((property) =>
      property.id === "title-id"
        ? { ...property, id: "current-title-id", name: "Titre actuel" }
        : property,
    );
    const repair = buildNotionSchemaRepair(
      {
        databaseId: "database",
        databaseUrl: null,
        id: "source",
        name: "Planif",
        properties: source,
      },
      mappingPayload(),
    );

    expect(repair.properties.Nom).toBeUndefined();
    expect(repair.propertyMapping.title).toBe("Titre actuel");
  });

  it("repairs an incompatible property by adding a new column without deleting it", () => {
    const source = managedSource().map((property) =>
      property.id === "status-id"
        ? { ...property, name: "Statut", type: "rich_text" }
        : property,
    );
    const repair = buildNotionSchemaRepair(
      {
        databaseId: "database",
        databaseUrl: null,
        id: "source",
        name: "Planif",
        properties: source,
      },
      mappingPayload(),
    );

    expect(repair.properties["Statut (Planif)"]).toBeDefined();
    expect(repair.properties["status-id"]).toBeUndefined();
    expect(Object.values(repair.properties)).not.toContain(null);
    expect(repair.propertyMapping.status).toBe("Statut (Planif)");
  });

  it("extends status options while preserving existing choices", () => {
    const source = managedSource().map((property) =>
      property.id === "status-id"
        ? {
            ...property,
            optionIds: {
              Brouillon: "draft-option-id",
              Personnalisé: "custom-option-id",
            },
            options: ["Personnalisé", "Brouillon"],
            type: "status",
          }
        : property,
    );
    const repair = buildNotionSchemaRepair(
      {
        databaseId: "database",
        databaseUrl: null,
        id: "source",
        name: "Planif",
        properties: source,
      },
      mappingPayload(),
    );
    const update = repair.properties["status-id"] as {
      status: {
        options: Array<{ group?: string; id?: string; name?: string }>;
      };
    };

    expect(update.status.options).toEqual(
      expect.arrayContaining([
        { id: "custom-option-id" },
        { id: "draft-option-id" },
        { group: "Complete", name: "Publié" },
        { group: "In progress", name: "En révision" },
      ]),
    );
  });

  it("extends status options after a compatible status property was recreated", () => {
    const source = managedSource().map((property) =>
      property.id === "status-id"
        ? {
            ...property,
            id: "replacement-status-id",
            optionIds: { Brouillon: "draft-option-id" },
            options: ["Brouillon"],
            type: "status",
          }
        : property,
    );
    const repair = buildNotionSchemaRepair(
      {
        databaseId: "database",
        databaseUrl: null,
        id: "source",
        name: "Planif",
        properties: source,
      },
      mappingPayload(),
    );
    const update = repair.properties["replacement-status-id"] as {
      status: {
        options: Array<{ group?: string; id?: string; name?: string }>;
      };
    };

    expect(repair.propertyMapping.status).toBe("Statut");
    expect(update.status.options).toEqual(
      expect.arrayContaining([
        { id: "draft-option-id" },
        { group: "Complete", name: "Publié" },
      ]),
    );
  });

  it("rediscovers a managed database under a persistent lease instead of creating a duplicate", async () => {
    const prisma = basePrisma();
    prisma.$queryRawUnsafe = jest.fn(async (...args: unknown[]) => [
      { lease_token: args[2] },
    ]);
    prisma.$executeRawUnsafe = jest.fn().mockResolvedValue(1);
    prisma.organizationAuditLog = { create: jest.fn().mockResolvedValue({}) };
    prisma.notionDatabaseMapping.update = jest
      .fn()
      .mockResolvedValue(managedMappingRecord());
    const transaction = {
      $queryRawUnsafe: jest.fn(async (...args: unknown[]) => [
        { lease_token: args[2] },
      ]),
      notionDatabaseMapping: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue(managedMappingRecord()),
      },
      notionSyncState: { deleteMany: jest.fn() },
      organizationAuditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction = jest.fn(
      async (handler: (client: object) => Promise<unknown>) =>
        handler(transaction),
    );
    const notion = baseNotion();
    const discovered = {
      database: {
        dataSources: [{ id: "source", name: "Planif" }],
        description: "planif-managed:organization",
        id: "database",
        name: "Planif",
        parentPageId: "parent",
        url: "https://notion.so/database",
      },
      dataSource: {
        databaseId: "database",
        databaseUrl: "https://notion.so/database",
        id: "source",
        name: "Planif",
        properties: managedSource(),
      },
    };
    notion.findManagedDatabase.mockResolvedValue(discovered);
    notion.retrieveDataSource.mockResolvedValue(discovered.dataSource);
    const service = createService(prisma, notion);

    await expect(
      service.provisionNotionDatabase("user", organizationContext(), {
        confirmed: true,
        parentPageId: "parent",
      }),
    ).resolves.toMatchObject({ recovered: true });
    expect(notion.createDatabase).not.toHaveBeenCalled();
    expect(prisma.$executeRawUnsafe).toHaveBeenCalled();
  });

  it("refuses to persist provisioning after its lease was lost", async () => {
    const prisma = basePrisma();
    prisma.$queryRawUnsafe = jest.fn(async (...args: unknown[]) => [
      { lease_token: args[2] },
    ]);
    prisma.$executeRawUnsafe = jest.fn().mockResolvedValue(1);
    const transaction = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
      notionDatabaseMapping: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
      notionSyncState: { deleteMany: jest.fn() },
      organizationAuditLog: { create: jest.fn() },
    };
    prisma.$transaction = jest.fn(
      async (handler: (client: object) => Promise<unknown>) =>
        handler(transaction),
    );
    const notion = baseNotion();
    notion.findManagedDatabase.mockResolvedValue({
      database: {
        dataSources: [{ id: "source", name: "Planif" }],
        description: "planif-managed:organization",
        id: "database",
        name: "Planif",
        parentPageId: "parent",
        url: "https://notion.so/database",
      },
      dataSource: {
        databaseId: "database",
        databaseUrl: "https://notion.so/database",
        id: "source",
        name: "Planif",
        properties: managedSource(),
      },
    });
    const service = createService(prisma, notion);

    await expect(
      service.provisionNotionDatabase("user", organizationContext(), {
        confirmed: true,
        parentPageId: "parent",
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(transaction.notionDatabaseMapping.upsert).not.toHaveBeenCalled();
  });

  it("backfills a legacy database mapping with its data source and property IDs", async () => {
    const prisma = basePrisma();
    const legacy = {
      ...mappingRecord(),
      dataSourceId: null,
      propertyIdMapping: {},
      schemaStatus: "UNCHECKED",
    };
    const saved = {
      ...legacy,
      dataSourceId: "source",
      propertyIdMapping: mappingPayload().propertyIdMapping,
      schemaStatus: "READY",
    };
    prisma.notionDatabaseMapping.findUnique.mockResolvedValue(legacy);
    const transaction = {
      notionDatabaseMapping: {
        findUnique: jest.fn().mockResolvedValue({ dataSourceId: null }),
        update: jest.fn().mockResolvedValue(saved),
      },
      notionSyncState: { deleteMany: jest.fn() },
    };
    prisma.$transaction = jest.fn(
      async (handler: (client: object) => Promise<unknown>) =>
        handler(transaction),
    );
    const notion = baseNotion();
    notion.retrieveDatabase.mockResolvedValue({
      dataSources: [{ id: "source", name: "Planif" }],
      description: "",
      id: "database",
      name: "Planif",
      parentPageId: "parent",
      url: "https://notion.so/database",
    });
    notion.retrieveDataSource.mockResolvedValue({
      databaseId: "database",
      databaseUrl: "https://notion.so/database",
      id: "source",
      name: "Planif",
      properties: managedSource(),
    });
    const service = createService(prisma, notion);

    const connection = await (
      service as unknown as {
        getConnection(organizationId: string): Promise<{
          mapping: ReturnType<typeof mappingPayload>;
        }>;
      }
    ).getConnection("organization");

    expect(connection.mapping.dataSourceId).toBe("source");
    expect(connection.mapping.propertyIdMapping).toEqual(
      mappingPayload().propertyIdMapping,
    );
    expect(transaction.notionDatabaseMapping.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dataSourceId: "source",
          schemaStatus: "READY",
        }),
      }),
    );
  });
});

function basePrisma() {
  return {
    $transaction: jest.fn(),
    contentItem: { findFirst: jest.fn(), findMany: jest.fn() },
    curatedResource: { findMany: jest.fn() },
    integrationCredential: {
      findUnique: jest.fn().mockResolvedValue({
        encryptedMetadata: "encrypted",
        status: "ACTIVE",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    notionDatabaseMapping: {
      findUnique: jest.fn().mockResolvedValue(mappingRecord()),
    },
    notionSyncLog: { create: jest.fn().mockResolvedValue({}) },
  } as Record<string, any>;
}

function baseNotion() {
  return {
    createPage: jest.fn(),
    createDatabase: jest.fn(),
    findManagedDatabase: jest.fn(),
    listParentPages: jest.fn(),
    replacePageBody: jest.fn().mockResolvedValue(undefined),
    retrieveDatabase: jest.fn(),
    retrieveDataSource: jest.fn(),
    retrievePage: jest.fn(),
    updateDataSource: jest.fn(),
    updatePage: jest.fn(),
  };
}

function createService(
  prisma: Record<string, any>,
  notion: ReturnType<typeof baseNotion>,
) {
  return new IntegrationsService(
    prisma as never,
    {
      decryptJson: jest.fn().mockReturnValue({ accessToken: "token" }),
    } as never,
    notion as never,
    {
      get: jest.fn((key: string) =>
        key === "FRONTEND_URL"
          ? "https://app.example.com"
          : "notion-oauth-state-secret-at-least-32-characters",
      ),
    } as never,
  );
}

function serializedTransaction(transaction: object) {
  let tail = Promise.resolve();
  return jest.fn(async (handler: (client: object) => Promise<unknown>) => {
    const previous = tail;
    let release: () => void = () => undefined;
    tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await handler(transaction);
    } finally {
      release();
    }
  });
}

function remoteApplyHarness() {
  let planDeleted = false;
  const transaction = {
    contentItem: {
      findFirst: jest.fn(async () =>
        content("content", planDeleted ? [] : [publicationPlan()]),
      ),
      update: jest
        .fn()
        .mockResolvedValue(content("content", [publicationPlan()])),
    },
    notionSyncState: { upsert: jest.fn().mockResolvedValue({}) },
    publicationPlan: {
      create: jest.fn(),
      delete: jest.fn(async () => {
        planDeleted = true;
      }),
      update: jest.fn(),
    },
  };
  return { service: createService(basePrisma(), baseNotion()), transaction };
}

async function callApplyRemoteContent(
  service: IntegrationsService,
  transaction: object,
  remotePage: ReturnType<typeof page>,
) {
  await (
    service as unknown as {
      applyRemoteContent(
        client: object,
        connection: object,
        localContent: object,
        page: object,
      ): Promise<void>;
    }
  ).applyRemoteContent(
    transaction,
    {
      credential: { accessToken: "token" },
      mapping: mappingPayload(),
      organizationId: "organization",
    },
    content("content", [publicationPlan()]),
    remotePage,
  );
}

function content(id = "content", publicationPlans = [] as object[]) {
  return {
    body: "Complete body",
    id,
    publicationPlans,
    status: "DRAFT",
    title: "Local",
    updatedAt: new Date("2026-07-10T00:00:00.000Z"),
  };
}

function publicationPlan() {
  return {
    channel: "LINKEDIN",
    id: "plan",
    publicationDate: new Date("2026-07-15T09:00:00.000Z"),
  };
}

function page(id: string, properties: Record<string, unknown> = {}) {
  return {
    id,
    last_edited_time: "2026-07-10T01:00:00.000Z",
    properties,
  };
}

function mappingRecord() {
  return {
    conflictStrategy: "NOTION_WINS",
    dataSourceId: "source",
    databaseId: "database",
    databaseName: "Database",
    databaseUrl: "https://notion.so/database",
    id: "mapping",
    lastSchemaCheckAt: new Date("2026-07-10T00:00:00.000Z"),
    managed: false,
    organizationId: "organization",
    parentPageId: null,
    propertyIdMapping: mappingPayload().propertyIdMapping,
    propertyMapping: {
      ...mappingPayload().propertyMapping,
      __types: mappingPayload().propertyTypes,
    },
    schemaIssues: [],
    schemaStatus: "READY",
    schemaVersion: 1,
    updatedAt: new Date("2026-07-10T00:00:00.000Z"),
  };
}

function mappingPayload() {
  return {
    conflictStrategy: "NOTION_WINS" as const,
    dataSourceId: "source",
    databaseId: "database",
    databaseName: "Database",
    databaseUrl: "https://notion.so/database",
    managed: false,
    parentPageId: null,
    propertyIdMapping: {
      channel: "channel-id",
      date: "date-id",
      entityType: "type-id",
      sourceUrl: "url-id",
      status: "status-id",
      title: "title-id",
    },
    propertyMapping: {
      channel: "Canal",
      date: "Date de publication",
      entityType: "Type",
      sourceUrl: "URL source",
      status: "Statut",
      title: "Nom",
    },
    propertyTypes: {
      channel: "select" as const,
      date: "date" as const,
      entityType: "select" as const,
      sourceUrl: "url" as const,
      status: "select" as const,
      title: "title" as const,
    },
    schemaHealth: {
      checkedAt: "2026-07-10T00:00:00.000Z",
      issues: [],
      status: "READY" as const,
    },
    schemaVersion: 1,
    setupMode: "ADVANCED" as const,
    updatedAt: "2026-07-10T00:00:00.000Z",
  };
}

function managedSource() {
  return [
    { id: "title-id", name: "Nom", options: [], type: "title" },
    {
      id: "status-id",
      name: "Statut",
      options: [...MANAGED_NOTION_STATUS_OPTIONS],
      type: "select",
    },
    { id: "date-id", name: "Date de publication", options: [], type: "date" },
    { id: "channel-id", name: "Canal", options: [], type: "select" },
    { id: "type-id", name: "Type", options: [], type: "select" },
    { id: "url-id", name: "URL source", options: [], type: "url" },
  ];
}

function managedMappingRecord() {
  return {
    ...mappingRecord(),
    managed: true,
    managedMarker: "planif-managed:organization",
    parentPageId: "parent",
    propertyMapping: {
      ...mappingPayload().propertyMapping,
      __types: mappingPayload().propertyTypes,
    },
  };
}

function organizationContext() {
  return {
    membership: {
      id: "membership",
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
    },
    organization: {
      createdAt: new Date().toISOString(),
      id: "organization",
      name: "Organization",
      ownerId: "admin",
      role: "ADMIN" as const,
      slug: "organization",
    },
  };
}
