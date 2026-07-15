import {
  buildNotionProperties,
  buildNotionBodyChildren,
  DEFAULT_NOTION_PROPERTY_MAPPING,
  fromNotionContentStatus,
  fromNotionResourceStatus,
  MANAGED_NOTION_PROPERTY_SCHEMA,
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
      select: { name: "Planifié" },
    });
  });

  it("reads status and date changes from a remote page", () => {
    const fields = readNotionPageFields(
      {
        id: "page",
        last_edited_time: "2026-07-09T12:00:00.000Z",
        properties: {
          Canal: { id: "channel-id", select: { name: "Blog" } },
          "Date de publication": {
            date: { start: "2026-07-14T09:30:00.000Z" },
          },
          Nom: { id: "title-id", title: [{ plain_text: "Titre distant" }] },
          Statut: { id: "status-id", select: { name: "Publié" } },
        },
      },
      DEFAULT_NOTION_PROPERTY_MAPPING,
      {
        channel: "channel-id",
        date: "date-id",
        entityType: "type-id",
        sourceUrl: "url-id",
        status: "status-id",
        title: "title-id",
      },
    );

    expect(fields.channel).toBe("BLOG");
    expect(fields.date?.toISOString()).toBe("2026-07-14T09:30:00.000Z");
    expect(fields.status).toBe("Publié");
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

    expect(properties.Statut).toEqual({ status: { name: "Prêt" } });
  });

  it("creates localized statuses in their native Notion groups", () => {
    expect(MANAGED_NOTION_PROPERTY_SCHEMA.Statut).toMatchObject({
      status: {
        options: expect.arrayContaining([
          { group: "To-do", name: "Brouillon" },
          { group: "In progress", name: "Prêt" },
          { group: "Complete", name: "Publié" },
        ]),
      },
    });
  });

  it("writes with stable property IDs after visible columns are renamed", () => {
    const properties = buildNotionProperties({
      entityType: "Ressource",
      mapping: DEFAULT_NOTION_PROPERTY_MAPPING,
      propertyIds: {
        channel: "channel-id",
        date: "date-id",
        entityType: "type-id",
        sourceUrl: "url-id",
        status: "status-id",
        title: "title-id",
      },
      status: "NEW",
      title: "Veille",
    });

    expect(properties["title-id"]).toBeDefined();
    expect(properties["status-id"]).toEqual({ select: { name: "Nouveau" } });
    expect(properties.Nom).toBeUndefined();
  });

  it("accepts French labels and historical English values on read", () => {
    expect(fromNotionContentStatus("En révision")).toBe("REVIEW");
    expect(fromNotionContentStatus("PUBLISHED")).toBe("PUBLISHED");
    expect(fromNotionResourceStatus("Résumé")).toBe("SUMMARIZED");
    expect(fromNotionResourceStatus("UNKNOWN")).toBeNull();
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
