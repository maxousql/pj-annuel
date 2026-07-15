import {
  IntegrationsService,
  resolveAllowedFrontendOrigin,
  validateNotionPropertyMapping,
} from "./integrations.service";
import { NotionApiError } from "./notion/notion.types";

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
    replacePageBody: jest.fn().mockResolvedValue(undefined),
    retrievePage: jest.fn(),
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
    databaseId: "database",
    databaseName: "Database",
    propertyMapping: {
      ...mappingPayload().propertyMapping,
      __types: mappingPayload().propertyTypes,
    },
    updatedAt: new Date("2026-07-10T00:00:00.000Z"),
  };
}

function mappingPayload() {
  return {
    conflictStrategy: "NOTION_WINS" as const,
    databaseId: "database",
    databaseName: "Database",
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
    updatedAt: "2026-07-10T00:00:00.000Z",
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
