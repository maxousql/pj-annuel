import {
  CurationService,
  parseFeedItems,
  rssRetryBackoffMs,
} from "./curation.service";

describe("curation RSS parsing", () => {
  it("parses RSS and Atom entries without executing embedded markup", () => {
    const items = parseFeedItems(`
      <rss><channel>
        <item>
          <title><![CDATA[Premier &amp; utile]]></title>
          <link>https://example.com/one</link>
          <description><![CDATA[<strong>Resume</strong> lisible]]></description>
          <pubDate>Wed, 09 Jul 2026 12:00:00 GMT</pubDate>
        </item>
      </channel></rss>
      <feed>
        <entry>
          <title>Second</title>
          <link href="https://example.com/two" />
          <summary>Atom</summary>
          <updated>2026-07-09T13:00:00.000Z</updated>
        </entry>
      </feed>
    `);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      description: "Resume lisible",
      title: "Premier & utile",
      url: "https://example.com/one",
    });
    expect(items[1]).toMatchObject({
      description: "Atom",
      title: "Second",
      url: "https://example.com/two",
    });
  });

  it("resolves relative feed links and discards non-http schemes", () => {
    const items = parseFeedItems(
      `<rss><channel>
        <item><title>Relative</title><link>/article</link></item>
        <item><title>Script</title><link>javascript:alert(1)</link></item>
      </channel></rss>`,
      "https://feed.example/news.xml",
    );

    expect(items[0]?.url).toBe("https://feed.example/article");
    expect(items[1]?.url).toBe("");
  });

  it("uses bounded exponential backoff for failed feeds", () => {
    expect(rssRetryBackoffMs(0)).toBe(15 * 60 * 1_000);
    expect(rssRetryBackoffMs(3)).toBe(2 * 60 * 60 * 1_000);
    expect(rssRetryBackoffMs(100)).toBeLessThanOrEqual(24 * 60 * 60 * 1_000);
  });

  it("skips a due feed while a manual import holds its lease", async () => {
    const prisma = {
      sourceFeed: {
        findMany: jest.fn().mockResolvedValue([
          {
            createdAt: new Date(),
            failureCount: 1,
            id: "feed",
            lastError: "previous",
            lastFetchedAt: null,
            nextFetchAt: new Date(),
            organizationId: "organization",
            status: "ERROR",
            title: "Feed",
            updatedAt: new Date(),
            url: "https://feed.example/rss",
          },
        ]),
      },
    };
    const jobs = {
      runWithLease: jest.fn().mockResolvedValue({ acquired: false }),
    };
    const service = new CurationService(
      prisma as never,
      {} as never,
      {} as never,
      jobs as never,
    );

    await expect(service.importDueFeeds()).resolves.toEqual({
      failedFeeds: 0,
      importedResources: 0,
      processedFeeds: 1,
    });
    expect(jobs.runWithLease).toHaveBeenCalledWith(
      "curation:feed:feed",
      expect.any(Number),
      expect.any(Function),
    );
  });
});
