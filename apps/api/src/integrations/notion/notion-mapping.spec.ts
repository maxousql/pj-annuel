import {
  buildNotionProperties,
  buildNotionBodyChildren,
  DEFAULT_NOTION_PROPERTY_MAPPING,
  readNotionPageFields,
} from "./notion-mapping";

describe("Notion mapping", () => {
  it("maps local editorial fields to configured Notion properties", () => {
    const properties = buildNotionProperties({
      channel: "LINKEDIN",
      date: "2026-07-12T08:00:00.000Z",
      entityType: "Contenu",
      mapping: DEFAULT_NOTION_PROPERTY_MAPPING,
      status: "SCHEDULED",
      title: "Annonce produit",
    });

    expect(properties["Nom"]).toEqual({
      title: [{ text: { content: "Annonce produit" } }],
    });
    expect(properties["Statut"]).toEqual({
      select: { name: "SCHEDULED" },
    });
  });

  it("reads status and date changes from a remote page", () => {
    const fields = readNotionPageFields(
      {
        id: "page",
        last_edited_time: "2026-07-09T12:00:00.000Z",
        properties: {
          Canal: { select: { name: "BLOG" } },
          "Date de publication": {
            date: { start: "2026-07-14T09:30:00.000Z" },
          },
          Nom: { title: [{ plain_text: "Titre distant" }] },
          Statut: { select: { name: "PUBLISHED" } },
        },
      },
      DEFAULT_NOTION_PROPERTY_MAPPING,
    );

    expect(fields.channel).toBe("BLOG");
    expect(fields.date?.toISOString()).toBe("2026-07-14T09:30:00.000Z");
    expect(fields.status).toBe("PUBLISHED");
    expect(fields.title).toBe("Titre distant");
  });

  it("writes a native Notion status property when configured", () => {
    const properties = buildNotionProperties({
      entityType: "Contenu",
      mapping: DEFAULT_NOTION_PROPERTY_MAPPING,
      propertyTypes: {
        channel: "select",
        date: "date",
        entityType: "select",
        sourceUrl: "url",
        status: "status",
        title: "title",
      },
      status: "READY",
      title: "Titre",
    });

    expect(properties.Statut).toEqual({ status: { name: "READY" } });
  });

  it("chunks the complete body without silently truncating it", () => {
    const body = "x".repeat(1_900 * 105 + 17);
    const blocks = buildNotionBodyChildren(body) as Array<{
      paragraph: { rich_text: Array<{ text: { content: string } }> };
    }>;
    const reconstructed = blocks
      .map((block) => block.paragraph.rich_text[0]?.text.content ?? "")
      .join("");

    expect(blocks.length).toBe(106);
    expect(reconstructed).toBe(body);
  });
});
