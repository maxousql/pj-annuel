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
          results: [database("database-1", "First")],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          has_more: false,
          next_cursor: null,
          results: [database("database-2", "Second")],
        }),
      );
    global.fetch = fetchMock as typeof fetch;
    const adapter = createAdapter();

    await expect(adapter.listDatabases("token")).resolves.toEqual([
      expect.objectContaining({ id: "database-1", name: "First" }),
      expect.objectContaining({ id: "database-2", name: "Second" }),
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
        parent: { database_id: "database" },
        properties: {},
      }),
    ).rejects.toMatchObject({ code: "NOTION_NETWORK_ERROR" });
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
});

function createAdapter(): NotionAdapter {
  const values: Record<string, string> = {
    NOTION_API_VERSION: "2022-06-28",
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

function database(id: string, title: string) {
  return {
    id,
    properties: {
      Name: { id: "title", type: "title" },
    },
    title: [{ plain_text: title }],
  };
}
