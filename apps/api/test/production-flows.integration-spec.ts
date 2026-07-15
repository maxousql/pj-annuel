import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { PrismaService } from "../src/database/prisma.service";
import { IntegrationEncryptionService } from "../src/integrations/integration-encryption.service";
import { IntegrationsService } from "../src/integrations/integrations.service";
import { NotionAdapter } from "../src/integrations/notion/notion.adapter";
import { OrganizationsService } from "../src/organizations/organizations.service";

const databaseDescribe =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true"
    ? describe
    : describe.skip;

databaseDescribe("production flows with real PostgreSQL", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const notion = {
    createPage: jest.fn().mockResolvedValue(notionPage()),
    retrieveDatabase: jest.fn().mockResolvedValue({
      dataSources: [{ id: "source", name: "Editorial" }],
      description: "",
      id: "database",
      name: "Editorial",
      parentPageId: "parent",
      url: "https://notion.so/database",
    }),
    retrieveDataSource: jest.fn().mockResolvedValue({
      databaseId: "database",
      databaseUrl: "https://notion.so/database",
      id: "source",
      name: "Editorial",
      properties: [
        { id: "title", name: "Nom", options: [], type: "title" },
        { id: "status", name: "Statut", options: [], type: "status" },
        { id: "date", name: "Date de publication", options: [], type: "date" },
        { id: "channel", name: "Canal", options: [], type: "select" },
        { id: "type", name: "Type", options: [], type: "select" },
        { id: "url", name: "URL source", options: [], type: "url" },
      ],
    }),
    replacePageBody: jest.fn().mockResolvedValue(undefined),
    retrievePage: jest.fn().mockResolvedValue(notionPage()),
    updatePage: jest.fn().mockResolvedValue(notionPage()),
  };

  beforeAll(async () => {
    process.env.AI_PROVIDER = "mock";
    process.env.AUTH_SECRET =
      "database-integration-auth-secret-at-least-32-chars";
    process.env.DISABLE_SCHEDULED_JOBS = "true";
    process.env.FRONTEND_URL = "http://127.0.0.1:3000";
    process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
      "base64",
    );
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(NotionAdapter)
      .useValue(notion)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app, { frontendUrl: process.env.FRONTEND_URL });
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("persists onboarding, invitations, curation security, automations and Notion state", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const adminEmail = `integration-admin-${suffix}@example.com`;
    const invitedEmail = `integration-invitee-${suffix}@example.com`;
    const slug = `integration-${suffix}`;
    const adminCookie = await register(adminEmail, "Integration Admin");
    const organizationResponse = await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", adminCookie)
      .send({ name: "Integration organization", slug })
      .expect(201);
    const organizationId = organizationResponse.body.data.organization
      .id as string;

    try {
      await request(app.getHttpServer())
        .put(`/api/onboarding/organizations/${slug}/editorial-context`)
        .set("Cookie", adminCookie)
        .send({
          positioning: "Positioning",
          sector: "SaaS",
          targetAudience: "Marketing teams",
          themes: ["AI", "Content"],
          tone: "Expert",
        })
        .expect(200);

      const invitationResponse = await request(app.getHttpServer())
        .post(`/api/organizations/${slug}/invitations`)
        .set("Cookie", adminCookie)
        .send({ email: invitedEmail, role: "EDITOR" })
        .expect(201);
      const previewUrl = invitationResponse.body.data.previewUrl as string;
      const token = new URL(previewUrl).pathname.split("/").at(-1)!;
      const inviteeCookie = await register(invitedEmail, "Invited Editor");

      await request(app.getHttpServer())
        .post(`/api/invitations/${token}/accept`)
        .set("Cookie", inviteeCookie)
        .expect(201);
      const team = await request(app.getHttpServer())
        .get(`/api/organizations/${slug}/team`)
        .set("Cookie", adminCookie)
        .expect(200);
      expect(team.body.data.members).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ email: invitedEmail, role: "EDITOR" }),
        ]),
      );

      await request(app.getHttpServer())
        .post(`/api/organizations/${slug}/curation/resources`)
        .set("Cookie", adminCookie)
        .send({ url: "http://127.0.0.1:65535/private" })
        .expect(400);

      await request(app.getHttpServer())
        .put(
          `/api/organizations/${slug}/automations/rules/EDITORIAL_RECOMMENDATION`,
        )
        .set("Cookie", adminCookie)
        .send({ status: "ACTIVE", timezone: "Europe/Paris" })
        .expect(200);
      const automationState = await request(app.getHttpServer())
        .get(`/api/organizations/${slug}/automations`)
        .set("Cookie", adminCookie)
        .expect(200);
      expect(automationState.body.data.rules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "EDITORIAL_RECOMMENDATION" }),
        ]),
      );

      const admin = await prisma.user.findUniqueOrThrow({
        where: { email: adminEmail },
      });
      const context = await app
        .get(OrganizationsService)
        .resolveActiveOrganization(admin.id, slug);
      const encryption = app.get(IntegrationEncryptionService);
      await prisma.integrationCredential.create({
        data: {
          encryptedMetadata: encryption.encryptJson({
            accessToken: "test-token",
          }),
          organizationId,
          provider: "NOTION",
        },
      });
      const integrations = app.get(IntegrationsService);
      await integrations.saveNotionMapping(admin.id, context, {
        conflictStrategy: "NEWEST_WINS",
        databaseId: "database",
        databaseName: "Editorial",
        dataSourceId: "source",
        propertyMapping: {
          channel: "Canal",
          date: "Date de publication",
          entityType: "Type",
          sourceUrl: "URL source",
          status: "Statut",
          title: "Nom",
        },
      });
      const content = await prisma.contentItem.create({
        data: {
          body: "Persisted content body",
          createdById: admin.id,
          format: "LINKEDIN_POST",
          organizationId,
          title: "Persisted content",
        },
      });
      await expect(
        integrations.exportContent(admin.id, context, content.id),
      ).resolves.toMatchObject({ status: "SUCCEEDED" });
      await expect(
        prisma.notionSyncState.findUnique({
          where: {
            organizationId_entityType_entityId: {
              entityId: content.id,
              entityType: "CONTENT",
              organizationId,
            },
          },
        }),
      ).resolves.toMatchObject({ notionPageId: "notion-page" });
    } finally {
      await prisma.organization.deleteMany({ where: { id: organizationId } });
      await prisma.user.deleteMany({
        where: { email: { in: [adminEmail, invitedEmail] } },
      });
    }
  });

  async function register(email: string, name: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email, name, password: "IntegrationPassword2026!" })
      .expect(201);
    const header = response.headers["set-cookie"] as unknown;
    const cookies = Array.isArray(header) ? header : [String(header ?? "")];
    return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
  }
});

function notionPage() {
  return {
    id: "notion-page",
    last_edited_time: "2026-07-10T01:00:00.000Z",
    properties: {},
  };
}
