import { NotionAdapter } from "./notion.adapter";

describe("NotionAdapter", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("paginates database search until Notion has no next cursor", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          has_more: true,
          next_cursor: "cursor-2",
          results: [dataSource("source-1", "database-1", "First")],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          has_more: false,
          next_cursor: null,
          results: [dataSource("source-2", "database-2", "Second")],
        }),
      );
    global.fetch = fetchMock as typeof fetch;
    const adapter = createAdapter();

    await expect(adapter.listDatabases("token")).resolves.toEqual([
      expect.objectContaining({
        databaseId: "database-1",
        id: "source-1",
        name: "First",
      }),
      expect.objectContaining({
        databaseId: "database-2",
        id: "source-2",
        name: "Second",
      }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)),
    ).toMatchObject({
      start_cursor: "cursor-2",
    });
  });

  it("never retries createPage after an ambiguous network failure", async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error("socket closed"));
    global.fetch = fetchMock as typeof fetch;
    const adapter = createAdapter();

    await expect(
      adapter.createPage("token", {
        parent: { data_source_id: "source", type: "data_source_id" },
        properties: {},
      }),
    ).rejects.toMatchObject({ code: "NOTION_NETWORK_ERROR" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      "notion-version": "2026-03-11",
    });
  });

  it("marks post-create lookup failures as ambiguous without replaying creation", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: "database" }))
      .mockRejectedValue(new Error("lookup unavailable"));
    global.fetch = fetchMock as typeof fetch;
    const adapter = createAdapter();

    await expect(
      adapter.createDatabase("token", {
        description: "planif-managed:organization",
        parentPageId: "parent",
        properties: {},
        title: "Planif",
      }),
    ).rejects.toMatchObject({ code: "NOTION_CREATION_AMBIGUOUS" });
    expect(
      fetchMock.mock.calls.filter(
        ([url, init]) =>
          String(url).endsWith("/databases") && init?.method === "POST",
      ),
    ).toHaveLength(1);
  });

  it("treats a server error during database creation as ambiguous", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(
          { code: "internal_server_error", message: "Try again" },
          503,
        ),
      );
    global.fetch = fetchMock as typeof fetch;
    const adapter = createAdapter();

    await expect(
      adapter.createDatabase("token", {
        description: "planif-managed:organization",
        parentPageId: "parent",
        properties: {},
        title: "Planif",
      }),
    ).rejects.toMatchObject({ code: "NOTION_CREATION_AMBIGUOUS" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("appends every body block in provider-sized chunks", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ has_more: false, next_cursor: null, results: [] }),
      )
      .mockResolvedValue(jsonResponse({}));
    global.fetch = fetchMock as typeof fetch;
    const adapter = createAdapter();
    const children = Array.from({ length: 205 }, (_, index) => ({ index }));

    await adapter.replacePageBody("token", "page", children);

    const appendBodies = fetchMock.mock.calls
      .slice(1)
      .map(
        (call) => JSON.parse(String(call[1]?.body)) as { children: unknown[] },
      );
    expect(appendBodies.map((body) => body.children.length)).toEqual([
      100, 100, 5,
    ]);
  });

  it("keeps stable option IDs when parsing a data source", async () => {
    const source = dataSource("source", "database", "Planif");
    source.properties.Status = {
      id: "status-property",
      name: "Status",
      status: {
        options: [{ id: "draft-option", name: "Brouillon" }],
      },
      type: "status",
    };
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ has_more: false, next_cursor: null, results: [source] }),
      ) as typeof fetch;

    const [result] = await createAdapter().listDataSources("token");

    expect(result?.properties).toContainEqual(
      expect.objectContaining({
        id: "status-property",
        optionIds: { Brouillon: "draft-option" },
        options: ["Brouillon"],
      }),
    );
  });

  it("rejects multiple databases carrying the exact managed marker", async () => {
    const marker = "planif-managed:organization";
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          has_more: false,
          next_cursor: null,
          results: [
            dataSource("source-1", "database-1", "Planif"),
            dataSource("source-2", "database-2", "Planif"),
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(database("database-1", marker, ["source-1"])),
      )
      .mockResolvedValueOnce(
        jsonResponse(dataSource("source-1", "database-1", "Planif")),
      )
      .mockResolvedValueOnce(
        jsonResponse(database("database-2", marker, ["source-2"])),
      )
      .mockResolvedValueOnce(
        jsonResponse(dataSource("source-2", "database-2", "Planif")),
      ) as typeof fetch;

    await expect(
      createAdapter().findManagedDatabase("token", marker, {
        requiredProperties: [],
      }),
    ).rejects.toMatchObject({ code: "NOTION_MANAGED_DATABASE_AMBIGUOUS" });
  });

  it("does not accept a marker embedded in unrelated description text", async () => {
    const marker = "planif-managed:organization";
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          has_more: false,
          next_cursor: null,
          results: [dataSource("source", "database", "Planif")],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          database("database", `copie de ${marker} à ne pas utiliser`, [
            "source",
          ]),
        ),
      ) as typeof fetch;

    await expect(
      createAdapter().findManagedDatabase("token", marker, {
        requiredProperties: [],
      }),
    ).resolves.toBeNull();
  });
});

function createAdapter(): NotionAdapter {
  const values: Record<string, string> = {
    NOTION_API_VERSION: "2026-03-11",
    NOTION_CLIENT_ID: "client",
    NOTION_CLIENT_SECRET: "secret",
    NOTION_REDIRECT_URI: "https://api.example.com/callback",
  };
  return new NotionAdapter({
    get: jest.fn((key: string) => values[key]),
  } as never);
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function dataSource(id: string, databaseId: string, title: string) {
  return {
    id,
    object: "data_source",
    parent: { database_id: databaseId, type: "database_id" },
    properties: {
      Name: { id: "title", name: "Name", type: "title" },
    } as Record<string, Record<string, unknown>>,
    title: [{ plain_text: title }],
  };
}

function database(id: string, description: string, sourceIds: string[]) {
  return {
    data_sources: sourceIds.map((sourceId) => ({
      id: sourceId,
      name: "Planif",
    })),
    description: [{ plain_text: description }],
    id,
    object: "database",
    parent: { page_id: "parent", type: "page_id" },
    title: [{ plain_text: "Planif" }],
    url: `https://notion.so/${id}`,
  };
}
