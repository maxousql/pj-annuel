import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { PrismaService } from "../src/database/prisma.service";

describe("Organizations API", () => {
  let app: INestApplication;
  let prisma: OrganizationFakePrismaService;

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-with-more-than-32-characters";
    process.env.AI_PROVIDER = "mock";
    prisma = new OrganizationFakePrismaService();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app, {
      frontendUrl: "http://localhost:3000",
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    prisma.reset();
  });

  it("creates an organization and makes the creator admin", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );

    const createResponse = await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({
        name: "Alpha Team",
      })
      .expect(201);

    expect(createResponse.body.data).toMatchObject({
      membership: {
        role: "ADMIN",
        status: "ACTIVE",
      },
      organization: {
        name: "Alpha Team",
        role: "ADMIN",
        slug: "alpha-team",
      },
    });

    const listResponse = await request(app.getHttpServer())
      .get("/api/organizations")
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(listResponse.body.data.organizations).toHaveLength(1);
    expect(listResponse.body.data.organizations[0]).toMatchObject({
      name: "Alpha Team",
      role: "ADMIN",
      slug: "alpha-team",
    });

    const membersResponse = await request(app.getHttpServer())
      .get("/api/organizations/alpha-team/members")
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(membersResponse.body.data.members).toEqual([
      expect.objectContaining({
        email: "owner@example.com",
        role: "ADMIN",
        status: "ACTIVE",
      }),
    ]);
  });

  it("prevents members from accessing organizations they do not belong to", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );
    const outsiderCookie = await registerAndExtractCookie(
      app,
      "outsider@example.com",
      "Outsider Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Private Team" })
      .expect(201);

    await request(app.getHttpServer())
      .get("/api/organizations/private-team")
      .set("Cookie", outsiderCookie)
      .expect(403);

    const outsiderOrganizations = await request(app.getHttpServer())
      .get("/api/organizations")
      .set("Cookie", outsiderCookie)
      .expect(200);

    expect(outsiderOrganizations.body.data.organizations).toEqual([]);
  });

  it("allows readers to switch organization but blocks admin-only member management", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );
    const readerCookie = await registerAndExtractCookie(
      app,
      "reader@example.com",
      "Reader Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Shared Team" })
      .expect(201);

    prisma.addMembershipByEmail("reader@example.com", "shared-team", "READER");

    const switchResponse = await request(app.getHttpServer())
      .post("/api/organizations/shared-team/switch")
      .set("Cookie", readerCookie)
      .expect(201);

    expect(switchResponse.body.data.organization).toMatchObject({
      role: "READER",
      slug: "shared-team",
    });

    await request(app.getHttpServer())
      .get("/api/organizations/shared-team/members")
      .set("Cookie", readerCookie)
      .expect(403);
  });

  it("guides a new user through onboarding to a ready dashboard state", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );

    const initialState = await request(app.getHttpServer())
      .get("/api/onboarding")
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(initialState.body.data).toMatchObject({
      activeOrganization: null,
      completed: false,
      editorialContext: null,
      nextStep: "CREATE_ORGANIZATION",
      organizations: [],
    });

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Onboarding Team" })
      .expect(201);

    const organizationState = await request(app.getHttpServer())
      .get("/api/onboarding")
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(organizationState.body.data).toMatchObject({
      activeOrganization: {
        name: "Onboarding Team",
        role: "ADMIN",
        slug: "onboarding-team",
      },
      completed: false,
      editorialContext: null,
      nextStep: "CONFIGURE_EDITORIAL_CONTEXT",
    });

    await request(app.getHttpServer())
      .post("/api/onboarding/organizations/onboarding-team/complete")
      .set("Cookie", ownerCookie)
      .expect(400);

    const contextState = await request(app.getHttpServer())
      .put("/api/onboarding/organizations/onboarding-team/editorial-context")
      .set("Cookie", ownerCookie)
      .send({
        sector: "SaaS B2B",
        targetAudience: "Fondateurs et responsables marketing",
        themes: ["IA", "Acquisition", "Productivite"],
        tone: "Expert et direct",
      })
      .expect(200);

    expect(contextState.body.data).toMatchObject({
      completed: false,
      editorialContext: {
        positioning: "Positionnement a preciser",
        sector: "SaaS B2B",
        targetAudience: "Fondateurs et responsables marketing",
        themes: ["IA", "Acquisition", "Productivite"],
        tone: "Expert et direct",
      },
      nextStep: "COMPLETE",
    });

    const completedState = await request(app.getHttpServer())
      .post("/api/onboarding/organizations/onboarding-team/complete")
      .set("Cookie", ownerCookie)
      .expect(201);

    expect(completedState.body.data).toMatchObject({
      activeOrganization: {
        slug: "onboarding-team",
      },
      completed: true,
      nextStep: "READY",
    });
    expect(completedState.body.data.user.onboardingCompletedAt).toEqual(
      expect.any(String),
    );
  });

  it("validates the minimum editorial context before saving onboarding", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Validation Team" })
      .expect(201);

    await request(app.getHttpServer())
      .put("/api/onboarding/organizations/validation-team/editorial-context")
      .set("Cookie", ownerCookie)
      .send({
        sector: "SaaS",
        targetAudience: "CMO",
        themes: [],
        tone: "Expert",
      })
      .expect(400);
  });

  it("creates, reads, updates and summarizes editorial context", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );
    const readerCookie = await registerAndExtractCookie(
      app,
      "reader@example.com",
      "Reader Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Editorial Team" })
      .expect(201);

    prisma.addMembershipByEmail(
      "reader@example.com",
      "editorial-team",
      "READER",
    );

    const emptyResponse = await request(app.getHttpServer())
      .get("/api/organizations/editorial-team/editorial-context")
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(emptyResponse.body.data.editorialContext).toBeNull();

    const createResponse = await request(app.getHttpServer())
      .put("/api/organizations/editorial-team/editorial-context")
      .set("Cookie", ownerCookie)
      .send({
        positioning: "Assistant IA pour equipes marketing",
        sector: "SaaS B2B",
        targetAudience: "CMO",
        themes: ["IA", "Acquisition"],
        tone: "Expert et direct",
      })
      .expect(200);

    expect(createResponse.body.data.editorialContext).toMatchObject({
      positioning: "Assistant IA pour equipes marketing",
      sector: "SaaS B2B",
      targetAudience: "CMO",
      themes: ["IA", "Acquisition"],
      tone: "Expert et direct",
    });

    const summaryResponse = await request(app.getHttpServer())
      .get("/api/organizations/editorial-team/editorial-context/summary")
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(summaryResponse.body.data.summary).toMatchObject({
      configured: true,
      organizationId: createResponse.body.data.editorialContext.organizationId,
      positioning: "Assistant IA pour equipes marketing",
      sector: "SaaS B2B",
      targetAudience: "CMO",
      themes: ["IA", "Acquisition"],
      tone: "Expert et direct",
    });
    expect(summaryResponse.body.data.summary.resourceNotes).toBeUndefined();

    await request(app.getHttpServer())
      .put("/api/organizations/editorial-team/editorial-context")
      .set("Cookie", readerCookie)
      .send({
        sector: "Marketplace",
        targetAudience: "PME",
        themes: ["Vente"],
        tone: "Simple",
      })
      .expect(403);

    const readerResponse = await request(app.getHttpServer())
      .get("/api/organizations/editorial-team/editorial-context")
      .set("Cookie", readerCookie)
      .expect(200);

    expect(readerResponse.body.data.editorialContext).toMatchObject({
      sector: "SaaS B2B",
    });
  });

  it("isolates editorial contexts between organizations", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Alpha Context" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Beta Context" })
      .expect(201);

    await request(app.getHttpServer())
      .put("/api/organizations/alpha-context/editorial-context")
      .set("Cookie", ownerCookie)
      .send({
        sector: "SaaS B2B",
        targetAudience: "CMO",
        themes: ["IA"],
        tone: "Expert",
      })
      .expect(200);

    await request(app.getHttpServer())
      .put("/api/organizations/beta-context/editorial-context")
      .set("Cookie", ownerCookie)
      .send({
        sector: "Formation",
        targetAudience: "Etudiants",
        themes: ["Carriere"],
        tone: "Pedagogique",
      })
      .expect(200);

    const alphaResponse = await request(app.getHttpServer())
      .get("/api/organizations/alpha-context/editorial-context/summary")
      .set("Cookie", ownerCookie)
      .expect(200);
    const betaResponse = await request(app.getHttpServer())
      .get("/api/organizations/beta-context/editorial-context/summary")
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(alphaResponse.body.data.summary).toMatchObject({
      sector: "SaaS B2B",
      themes: ["IA"],
    });
    expect(betaResponse.body.data.summary).toMatchObject({
      sector: "Formation",
      themes: ["Carriere"],
    });
  });

  it("generates, saves, lists and updates marketing content", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Content Team" })
      .expect(201);

    await request(app.getHttpServer())
      .put("/api/onboarding/organizations/content-team/editorial-context")
      .set("Cookie", ownerCookie)
      .send({
        sector: "SaaS B2B",
        targetAudience: "Responsables marketing",
        themes: ["Activation", "Retention"],
        tone: "Clair et direct",
      })
      .expect(200);

    const generateResponse = await request(app.getHttpServer())
      .post("/api/organizations/content-team/contents/generate")
      .set("Cookie", ownerCookie)
      .send({
        brief: "Creer un email pour convertir les utilisateurs en essai.",
        format: "EMAIL",
      })
      .expect(201);

    expect(generateResponse.body.data).toMatchObject({
      draft: {
        format: "EMAIL",
        title: expect.any(String),
      },
      sourceIdea: null,
    });

    const saveResponse = await request(app.getHttpServer())
      .post("/api/organizations/content-team/contents")
      .set("Cookie", ownerCookie)
      .send({
        body: `${generateResponse.body.data.draft.body} Version ajustee.`,
        brief: "Creer un email pour convertir les utilisateurs en essai.",
        format: "EMAIL",
        status: "REVIEW",
        title: generateResponse.body.data.draft.title,
        topic: "Activation",
      })
      .expect(201);

    expect(saveResponse.body.data.content).toMatchObject({
      format: "EMAIL",
      source: "AI_GENERATED",
      status: "REVIEW",
      topic: "Activation",
    });

    const listResponse = await request(app.getHttpServer())
      .get("/api/organizations/content-team/contents")
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(listResponse.body.data.contents).toHaveLength(1);
    expect(listResponse.body.data.contents[0].id).toBe(
      saveResponse.body.data.content.id,
    );

    const updateResponse = await request(app.getHttpServer())
      .patch(
        `/api/organizations/content-team/contents/${saveResponse.body.data.content.id}`,
      )
      .set("Cookie", ownerCookie)
      .send({
        body: "Corps de contenu mis a jour avec une longueur suffisante.",
        status: "READY",
        title: "Email de conversion ajuste",
      })
      .expect(200);

    expect(updateResponse.body.data.content).toMatchObject({
      status: "READY",
      title: "Email de conversion ajuste",
    });

    const detailResponse = await request(app.getHttpServer())
      .get(
        `/api/organizations/content-team/contents/${saveResponse.body.data.content.id}`,
      )
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(detailResponse.body.data.content).toMatchObject({
      body: "Corps de contenu mis a jour avec une longueur suffisante.",
      title: "Email de conversion ajuste",
    });
  });

  it("generates content from a saved idea and keeps the source link", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Ideas Team" })
      .expect(201);

    const ideaId = prisma.addContentIdeaBySlug("ideas-team", {
      angle: "Montrer comment prioriser les sujets qui convertissent.",
      category: "Strategie",
      recommendedFormat: "LINKEDIN_POST",
      title: "Prioriser les idees qui creent du revenu",
    });

    const ideasResponse = await request(app.getHttpServer())
      .get("/api/organizations/ideas-team/contents/source-ideas")
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(ideasResponse.body.data.ideas).toEqual([
      expect.objectContaining({
        id: ideaId,
        title: "Prioriser les idees qui creent du revenu",
      }),
    ]);

    const generateResponse = await request(app.getHttpServer())
      .post("/api/organizations/ideas-team/contents/generate")
      .set("Cookie", ownerCookie)
      .send({
        format: "LINKEDIN_POST",
        ideaId,
      })
      .expect(201);

    expect(generateResponse.body.data.sourceIdea).toMatchObject({
      id: ideaId,
    });

    const saveResponse = await request(app.getHttpServer())
      .post("/api/organizations/ideas-team/contents")
      .set("Cookie", ownerCookie)
      .send({
        body: `${generateResponse.body.data.draft.body} Complete pour test.`,
        format: "LINKEDIN_POST",
        ideaId,
        status: "DRAFT",
        title: generateResponse.body.data.draft.title,
      })
      .expect(201);

    expect(saveResponse.body.data.content).toMatchObject({
      ideaId,
      status: "DRAFT",
    });
  });

  it("generates, saves and updates content ideas", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Ideation Team" })
      .expect(201);

    await request(app.getHttpServer())
      .put("/api/onboarding/organizations/ideation-team/editorial-context")
      .set("Cookie", ownerCookie)
      .send({
        sector: "SaaS B2B",
        targetAudience: "Responsables marketing",
        themes: ["Activation", "Retention"],
        tone: "Clair et direct",
      })
      .expect(200);

    const generateResponse = await request(app.getHttpServer())
      .post("/api/organizations/ideation-team/ideas/generate")
      .set("Cookie", ownerCookie)
      .send({
        brief: "Trouver des angles pour ameliorer l'activation produit.",
        count: 3,
        format: "LINKEDIN_POST",
        topic: "Activation",
      })
      .expect(201);

    expect(generateResponse.body.data.ideas).toHaveLength(3);
    expect(generateResponse.body.data.ideas[0]).toMatchObject({
      duplicate: {
        warning: false,
      },
      recommendedFormat: "LINKEDIN_POST",
      title: expect.any(String),
    });

    const firstIdea = generateResponse.body.data.ideas[0];
    const saveResponse = await request(app.getHttpServer())
      .post("/api/organizations/ideation-team/ideas")
      .set("Cookie", ownerCookie)
      .send({
        angle: firstIdea.angle,
        category: firstIdea.category,
        justification: firstIdea.justification,
        recommendedFormat: firstIdea.recommendedFormat,
        title: firstIdea.title,
      })
      .expect(201);

    expect(saveResponse.body.data.idea).toMatchObject({
      status: "SAVED",
      title: firstIdea.title,
    });

    const listResponse = await request(app.getHttpServer())
      .get("/api/organizations/ideation-team/ideas")
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(listResponse.body.data.ideas).toEqual([
      expect.objectContaining({
        id: saveResponse.body.data.idea.id,
        status: "SAVED",
      }),
    ]);

    const usedResponse = await request(app.getHttpServer())
      .patch(
        `/api/organizations/ideation-team/ideas/${saveResponse.body.data.idea.id}/status`,
      )
      .set("Cookie", ownerCookie)
      .send({
        status: "USED",
      })
      .expect(200);

    expect(usedResponse.body.data.idea).toMatchObject({
      status: "USED",
    });

    await request(app.getHttpServer())
      .patch(
        `/api/organizations/ideation-team/ideas/${saveResponse.body.data.idea.id}/status`,
      )
      .set("Cookie", ownerCookie)
      .send({
        status: "ARCHIVED",
      })
      .expect(200);

    const archivedListResponse = await request(app.getHttpServer())
      .get("/api/organizations/ideation-team/ideas")
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(archivedListResponse.body.data.ideas).toEqual([]);
  });

  it("flags generated ideas that are close to existing history", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Duplicate Ideas Team" })
      .expect(201);

    prisma.addContentIdeaBySlug("duplicate-ideas-team", {
      angle: "Mettre en avant une methode simple et directement applicable.",
      category: "Strategie editoriale",
      recommendedFormat: "LINKEDIN_POST",
      title: "Structurer sa production de contenu avec l'IA",
    });

    const generateResponse = await request(app.getHttpServer())
      .post("/api/organizations/duplicate-ideas-team/ideas/generate")
      .set("Cookie", ownerCookie)
      .send({
        count: 1,
      })
      .expect(201);

    expect(generateResponse.body.data.ideas[0].duplicate).toMatchObject({
      matchedTitle: "Structurer sa production de contenu avec l'IA",
      source: "CONTENT_IDEA",
      warning: true,
    });
  });

  it("lists, searches and opens unified history entries", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "History Team" })
      .expect(201);

    const ideaId = prisma.addContentIdeaBySlug("history-team", {
      angle: "Identifier les sujets qui creent de la retention.",
      category: "Retention",
      recommendedFormat: "LINKEDIN_POST",
      title: "Idee retention client",
    });
    const contentId = prisma.addContentItemBySlug("history-team", {
      body: "Un email d'activation produit avec plusieurs conseils pratiques.",
      format: "EMAIL",
      status: "READY",
      title: "Email activation produit",
      topic: "Activation",
    });

    const emptySearchResponse = await request(app.getHttpServer())
      .get("/api/organizations/history-team/history")
      .set("Cookie", ownerCookie)
      .query({
        pageSize: 1,
        query: "inexistant",
      })
      .expect(200);

    expect(emptySearchResponse.body.data).toMatchObject({
      items: [],
      pagination: {
        total: 0,
        totalPages: 1,
      },
    });

    const firstPageResponse = await request(app.getHttpServer())
      .get("/api/organizations/history-team/history")
      .set("Cookie", ownerCookie)
      .query({
        pageSize: 1,
      })
      .expect(200);

    expect(firstPageResponse.body.data.pagination).toMatchObject({
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
    expect(firstPageResponse.body.data.items).toHaveLength(1);

    const searchResponse = await request(app.getHttpServer())
      .get("/api/organizations/history-team/history")
      .set("Cookie", ownerCookie)
      .query({
        query: "activation",
      })
      .expect(200);

    expect(searchResponse.body.data.items).toEqual([
      expect.objectContaining({
        id: contentId,
        title: "Email activation produit",
        type: "CONTENT",
      }),
    ]);

    const contentDetailResponse = await request(app.getHttpServer())
      .get(`/api/organizations/history-team/history/content/${contentId}`)
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(contentDetailResponse.body.data.item).toMatchObject({
      body: "Un email d'activation produit avec plusieurs conseils pratiques.",
      id: contentId,
      type: "CONTENT",
    });

    const ideaDetailResponse = await request(app.getHttpServer())
      .get(`/api/organizations/history-team/history/idea/${ideaId}`)
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(ideaDetailResponse.body.data.item).toMatchObject({
      angle: "Identifier les sujets qui creent de la retention.",
      id: ideaId,
      type: "IDEA",
    });
  });

  it("manages the V1 content library with filters, tags, categories and archive lifecycle", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );
    const readerCookie = await registerAndExtractCookie(
      app,
      "reader@example.com",
      "Reader Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Library Team" })
      .expect(201);

    prisma.addMembershipByEmail("reader@example.com", "library-team", "READER");

    const contentId = prisma.addContentItemBySlug("library-team", {
      body: "Un contenu long sur l'activation produit et la structuration commerciale.",
      format: "LINKEDIN_POST",
      status: "DRAFT",
      title: "Activation produit",
      topic: "Activation",
    });
    prisma.addContentItemBySlug("library-team", {
      body: "Un autre contenu publie sur la retention client.",
      format: "EMAIL",
      status: "PUBLISHED",
      title: "Retention client",
      topic: "Retention",
    });

    const tagResponse = await request(app.getHttpServer())
      .post("/api/organizations/library-team/library/tags")
      .set("Cookie", ownerCookie)
      .send({
        color: "#2f6fef",
        name: "Acquisition",
      })
      .expect(201);
    const categoryResponse = await request(app.getHttpServer())
      .post("/api/organizations/library-team/library/categories")
      .set("Cookie", ownerCookie)
      .send({
        name: "Activation",
      })
      .expect(201);

    const tagId = tagResponse.body.data.tag.id;
    const categoryId = categoryResponse.body.data.category.id;

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/organizations/library-team/library/${contentId}`)
      .set("Cookie", ownerCookie)
      .send({
        categoryId,
        status: "REVIEW",
        tagIds: [tagId],
      })
      .expect(200);

    expect(updateResponse.body.data.content).toMatchObject({
      category: {
        id: categoryId,
        name: "Activation",
      },
      id: contentId,
      status: "REVIEW",
      tags: [
        {
          id: tagId,
          name: "Acquisition",
        },
      ],
    });

    const filteredResponse = await request(app.getHttpServer())
      .get("/api/organizations/library-team/library")
      .set("Cookie", ownerCookie)
      .query({
        categoryId,
        pageSize: 1,
        query: "activation produit",
        status: "REVIEW",
        tagId,
      })
      .expect(200);

    expect(filteredResponse.body.data).toMatchObject({
      pagination: {
        page: 1,
        pageSize: 1,
        total: 1,
        totalPages: 1,
      },
    });
    expect(filteredResponse.body.data.contents).toEqual([
      expect.objectContaining({
        id: contentId,
        status: "REVIEW",
      }),
    ]);

    await request(app.getHttpServer())
      .patch(`/api/organizations/library-team/library/${contentId}`)
      .set("Cookie", readerCookie)
      .send({
        title: "Modification interdite",
      })
      .expect(403);

    const archiveResponse = await request(app.getHttpServer())
      .patch(`/api/organizations/library-team/library/${contentId}/archive`)
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(archiveResponse.body.data.content).toMatchObject({
      archivedAt: expect.any(String),
      status: "ARCHIVED",
    });

    const archivedListResponse = await request(app.getHttpServer())
      .get("/api/organizations/library-team/library")
      .set("Cookie", ownerCookie)
      .query({
        status: "ARCHIVED",
      })
      .expect(200);

    expect(archivedListResponse.body.data.contents).toEqual([
      expect.objectContaining({
        id: contentId,
        status: "ARCHIVED",
      }),
    ]);

    const restoreResponse = await request(app.getHttpServer())
      .patch(`/api/organizations/library-team/library/${contentId}/restore`)
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(restoreResponse.body.data.content).toMatchObject({
      archivedAt: null,
      status: "DRAFT",
    });
  });

  it("manages editorial planning with period filters, conflicts and reader restrictions", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );
    const readerCookie = await registerAndExtractCookie(
      app,
      "reader@example.com",
      "Reader Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Planning Team" })
      .expect(201);

    prisma.addMembershipByEmail(
      "reader@example.com",
      "planning-team",
      "READER",
    );

    const firstContentId = prisma.addContentItemBySlug("planning-team", {
      body: "Un post LinkedIn pret a etre planifie sur le calendrier.",
      format: "LINKEDIN_POST",
      status: "READY",
      title: "Post calendrier",
      topic: "Calendrier",
    });
    const secondContentId = prisma.addContentItemBySlug("planning-team", {
      body: "Un email pret pour tester les conflits de planification.",
      format: "EMAIL",
      status: "READY",
      title: "Email calendrier",
      topic: "Calendrier",
    });

    const readerListResponse = await request(app.getHttpServer())
      .get("/api/organizations/planning-team/publication-plans")
      .set("Cookie", readerCookie)
      .query({
        from: "2026-07-01",
        to: "2026-07-31",
      })
      .expect(200);

    expect(readerListResponse.body.data).toMatchObject({
      canEdit: false,
      plans: [],
    });

    const createResponse = await request(app.getHttpServer())
      .post("/api/organizations/planning-team/publication-plans")
      .set("Cookie", ownerCookie)
      .send({
        channel: "LINKEDIN",
        contentId: firstContentId,
        notes: "Publier le matin.",
        scheduledAt: "2026-07-15T09:00:00.000Z",
        status: "PLANNED",
      })
      .expect(201);

    expect(createResponse.body.data.plan).toMatchObject({
      channel: "LINKEDIN",
      conflictCount: 0,
      content: {
        id: firstContentId,
        status: "SCHEDULED",
      },
      notes: "Publier le matin.",
      scheduledAt: "2026-07-15T09:00:00.000Z",
      status: "PLANNED",
    });

    const firstPlanId = createResponse.body.data.plan.id;

    await request(app.getHttpServer())
      .post("/api/organizations/planning-team/publication-plans")
      .set("Cookie", ownerCookie)
      .send({
        channel: "LINKEDIN",
        contentId: secondContentId,
        scheduledAt: "2026-07-15T16:00:00.000Z",
        status: "PLANNED",
      })
      .expect(201);

    const filteredResponse = await request(app.getHttpServer())
      .get("/api/organizations/planning-team/publication-plans")
      .set("Cookie", ownerCookie)
      .query({
        channel: "LINKEDIN",
        from: "2026-07-01",
        status: "PLANNED",
        to: "2026-07-31",
      })
      .expect(200);

    expect(filteredResponse.body.data).toMatchObject({
      canEdit: true,
    });
    expect(filteredResponse.body.data.plans).toHaveLength(2);
    expect(filteredResponse.body.data.plans).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conflictCount: 1,
          id: firstPlanId,
        }),
      ]),
    );

    const outsidePeriodResponse = await request(app.getHttpServer())
      .get("/api/organizations/planning-team/publication-plans")
      .set("Cookie", ownerCookie)
      .query({
        from: "2026-08-01",
        to: "2026-08-31",
      })
      .expect(200);

    expect(outsidePeriodResponse.body.data.plans).toEqual([]);

    const updateResponse = await request(app.getHttpServer())
      .patch(
        `/api/organizations/planning-team/publication-plans/${firstPlanId}`,
      )
      .set("Cookie", ownerCookie)
      .send({
        channel: "BLOG",
        scheduledAt: "2026-07-16T10:30:00.000Z",
        status: "PUBLISHED",
      })
      .expect(200);

    expect(updateResponse.body.data.plan).toMatchObject({
      channel: "BLOG",
      content: {
        id: firstContentId,
        status: "PUBLISHED",
      },
      scheduledAt: "2026-07-16T10:30:00.000Z",
      status: "PUBLISHED",
    });

    await request(app.getHttpServer())
      .post("/api/organizations/planning-team/publication-plans")
      .set("Cookie", readerCookie)
      .send({
        channel: "EMAIL",
        contentId: firstContentId,
        scheduledAt: "2026-07-20T09:00:00.000Z",
      })
      .expect(403);

    await request(app.getHttpServer())
      .patch(
        `/api/organizations/planning-team/publication-plans/${firstPlanId}`,
      )
      .set("Cookie", readerCookie)
      .send({
        status: "CANCELLED",
      })
      .expect(403);

    await request(app.getHttpServer())
      .delete(
        `/api/organizations/planning-team/publication-plans/${firstPlanId}`,
      )
      .set("Cookie", readerCookie)
      .expect(403);
  });

  it("keeps duplicate checks scoped to the active organization", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Scoped Alpha" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Scoped Beta" })
      .expect(201);

    prisma.addContentItemBySlug("scoped-beta", {
      body: "Activation produit onboarding adoption retention expansion.",
      format: "LINKEDIN_POST",
      status: "READY",
      title: "Activation produit onboarding",
      topic: "Activation",
    });

    const isolatedResponse = await request(app.getHttpServer())
      .post("/api/organizations/scoped-alpha/history/duplicate-check")
      .set("Cookie", ownerCookie)
      .send({
        format: "LINKEDIN_POST",
        targetType: "CONTENT",
        text: "Activation produit onboarding adoption retention expansion.",
        title: "Activation produit onboarding",
        topic: "Activation",
      })
      .expect(201);

    expect(isolatedResponse.body.data.duplicate).toMatchObject({
      matchedId: null,
      warning: false,
    });

    prisma.addContentIdeaBySlug("scoped-alpha", {
      angle: "Activation produit onboarding adoption retention expansion.",
      category: "Activation",
      recommendedFormat: "LINKEDIN_POST",
      title: "Activation produit onboarding",
    });

    const duplicateResponse = await request(app.getHttpServer())
      .post("/api/organizations/scoped-alpha/history/duplicate-check")
      .set("Cookie", ownerCookie)
      .send({
        format: "LINKEDIN_POST",
        targetType: "CONTENT",
        text: "Activation produit onboarding adoption retention expansion.",
        title: "Activation produit onboarding",
        topic: "Activation",
      })
      .expect(201);

    expect(duplicateResponse.body.data.duplicate).toMatchObject({
      matchedTitle: "Activation produit onboarding",
      matchedType: "IDEA",
      warning: true,
    });
  });

  it("returns an empty dashboard summary for a new organization", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Empty Dashboard Team" })
      .expect(201);

    const dashboardResponse = await request(app.getHttpServer())
      .get("/api/organizations/empty-dashboard-team/dashboard")
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(dashboardResponse.body.data).toMatchObject({
      canEdit: true,
      counters: {
        aiGenerationsCount: 0,
        contentsCount: 0,
        draftsCount: 0,
        ideasCount: 0,
        toReviewCount: 0,
      },
      editorialContextConfigured: false,
      latestItems: [],
      reviewItems: [],
      topTopics: [],
    });
  });

  it("calculates dashboard aggregates without leaking another organization", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Dashboard Team" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Other Dashboard Team" })
      .expect(201);
    await request(app.getHttpServer())
      .put("/api/onboarding/organizations/dashboard-team/editorial-context")
      .set("Cookie", ownerCookie)
      .send({
        sector: "SaaS B2B",
        targetAudience: "Responsables marketing",
        themes: ["Activation"],
        tone: "Clair",
      })
      .expect(200);

    const ideaId = prisma.addContentIdeaBySlug("dashboard-team", {
      angle: "Angle activation client.",
      category: "Activation",
      recommendedFormat: "LINKEDIN_POST",
      title: "Idee activation dashboard",
    });
    const contentId = prisma.addContentItemBySlug("dashboard-team", {
      body: "Contenu en revue pour activation client.",
      format: "EMAIL",
      status: "REVIEW",
      title: "Email activation dashboard",
      topic: "Activation",
    });
    prisma.addContentItemBySlug("other-dashboard-team", {
      body: "Contenu d'une autre organisation.",
      format: "EMAIL",
      status: "DRAFT",
      title: "Email autre organisation",
      topic: "Confidentiel",
    });
    prisma.addAiGenerationLogBySlug("dashboard-team", "SUCCEEDED");
    prisma.addAiGenerationLogBySlug("other-dashboard-team", "SUCCEEDED");

    const dashboardResponse = await request(app.getHttpServer())
      .get("/api/organizations/dashboard-team/dashboard")
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(dashboardResponse.body.data).toMatchObject({
      counters: {
        aiGenerationsCount: 1,
        contentsCount: 1,
        draftsCount: 0,
        ideasCount: 1,
        toReviewCount: 1,
      },
      editorialContextConfigured: true,
      topTopics: [{ count: 2, topic: "Activation" }],
    });
    expect(dashboardResponse.body.data.latestItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ideaId,
          type: "IDEA",
        }),
        expect.objectContaining({
          id: contentId,
          type: "CONTENT",
        }),
      ]),
    );
    expect(dashboardResponse.body.data.reviewItems).toEqual([
      expect.objectContaining({
        id: contentId,
        status: "REVIEW",
      }),
    ]);
  });

  it("lets readers view dashboard data without edit capability", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );
    const readerCookie = await registerAndExtractCookie(
      app,
      "reader@example.com",
      "Reader Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Reader Dashboard Team" })
      .expect(201);
    prisma.addMembershipByEmail(
      "reader@example.com",
      "reader-dashboard-team",
      "READER",
    );
    prisma.addContentIdeaBySlug("reader-dashboard-team", {
      angle: "Angle visible lecteur.",
      category: "Education",
      recommendedFormat: "LINKEDIN_POST",
      title: "Idee dashboard lecteur",
    });

    const dashboardResponse = await request(app.getHttpServer())
      .get("/api/organizations/reader-dashboard-team/dashboard")
      .set("Cookie", readerCookie)
      .expect(200);

    expect(dashboardResponse.body.data).toMatchObject({
      canEdit: false,
      counters: {
        ideasCount: 1,
      },
    });
  });

  it("allows readers to list contents but blocks generation and save", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );
    const readerCookie = await registerAndExtractCookie(
      app,
      "reader@example.com",
      "Reader Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Reader Content Team" })
      .expect(201);

    prisma.addMembershipByEmail(
      "reader@example.com",
      "reader-content-team",
      "READER",
    );

    await request(app.getHttpServer())
      .get("/api/organizations/reader-content-team/contents")
      .set("Cookie", readerCookie)
      .expect(200);

    await request(app.getHttpServer())
      .post("/api/organizations/reader-content-team/contents/generate")
      .set("Cookie", readerCookie)
      .send({
        brief: "Creer un post LinkedIn.",
        format: "LINKEDIN_POST",
      })
      .expect(403);

    await request(app.getHttpServer())
      .post("/api/organizations/reader-content-team/contents")
      .set("Cookie", readerCookie)
      .send({
        body: "Un contenu suffisamment long pour passer la validation.",
        format: "LINKEDIN_POST",
        title: "Contenu lecteur",
      })
      .expect(403);
  });

  it("allows readers to list saved ideas but blocks idea mutations", async () => {
    const ownerCookie = await registerAndExtractCookie(
      app,
      "owner@example.com",
      "Owner Example",
    );
    const readerCookie = await registerAndExtractCookie(
      app,
      "reader@example.com",
      "Reader Example",
    );

    await request(app.getHttpServer())
      .post("/api/organizations")
      .set("Cookie", ownerCookie)
      .send({ name: "Reader Ideas Team" })
      .expect(201);

    prisma.addMembershipByEmail(
      "reader@example.com",
      "reader-ideas-team",
      "READER",
    );
    const ideaId = prisma.addContentIdeaBySlug("reader-ideas-team", {
      angle: "Montrer un exemple d'angle accessible aux lecteurs.",
      category: "Education",
      recommendedFormat: "LINKEDIN_POST",
      title: "Idee visible en lecture",
    });

    const listResponse = await request(app.getHttpServer())
      .get("/api/organizations/reader-ideas-team/ideas")
      .set("Cookie", readerCookie)
      .expect(200);

    expect(listResponse.body.data.ideas).toEqual([
      expect.objectContaining({
        id: ideaId,
      }),
    ]);

    await request(app.getHttpServer())
      .post("/api/organizations/reader-ideas-team/ideas/generate")
      .set("Cookie", readerCookie)
      .send({
        count: 1,
      })
      .expect(403);

    await request(app.getHttpServer())
      .post("/api/organizations/reader-ideas-team/ideas")
      .set("Cookie", readerCookie)
      .send({
        angle: "Un angle suffisamment detaille pour passer la validation.",
        justification: "Une justification suffisamment longue pour le test.",
        recommendedFormat: "LINKEDIN_POST",
        title: "Idee lecteur",
      })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/organizations/reader-ideas-team/ideas/${ideaId}/status`)
      .set("Cookie", readerCookie)
      .send({
        status: "ARCHIVED",
      })
      .expect(403);
  });
});

type Role = "ADMIN" | "EDITOR" | "READER";
type Status = "ACTIVE" | "PENDING" | "DISABLED";
type ContentFormat =
  | "BLOG_ARTICLE"
  | "LINKEDIN_POST"
  | "SOCIAL_POST"
  | "EMAIL"
  | "HOOK"
  | "THREAD"
  | "OTHER";
type ContentIdeaStatus = "DRAFT" | "SAVED" | "DISMISSED" | "USED" | "ARCHIVED";
type ContentItemStatus =
  | "DRAFT"
  | "REVIEW"
  | "READY"
  | "SCHEDULED"
  | "PUBLISHED"
  | "ARCHIVED"
  | "DELETED";
type ContentSource =
  "AI_GENERATED" | "USER_CREATED" | "CURATED_RESOURCE" | "IMPORTED" | "NOTION";
type PublicationChannel =
  "LINKEDIN" | "BLOG" | "EMAIL" | "X" | "FACEBOOK" | "INSTAGRAM" | "OTHER";
type DbPublicationStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "CANCELLED";
type AdvancedOnboardingStep =
  | "CHECKLIST"
  | "PRESET"
  | "FIRST_IDEA"
  | "FIRST_CONTENT"
  | "DONE";

type StoredUser = {
  avatarUrl: string | null;
  deletedAt: Date | null;
  email: string;
  id: string;
  name: string;
  onboardingCompletedAt: Date | null;
};

type StoredAuthAccount = {
  id: string;
  metadata: Record<string, unknown>;
  passwordHash: string | null;
  provider: "CREDENTIALS" | "GOOGLE";
  providerAccountId: string;
  userId: string;
};

type StoredOrganization = {
  createdAt: Date;
  deletedAt: Date | null;
  id: string;
  name: string;
  ownerId: string;
  slug: string;
};

type StoredMembership = {
  createdAt: Date;
  id: string;
  organizationId: string;
  role: Role;
  status: Status;
  userId: string;
};

type StoredEditorialContext = {
  createdAt: Date;
  createdById: string | null;
  id: string;
  organizationId: string;
  positioning: string;
  resourceNotes: string | null;
  sector: string;
  targetAudience: string;
  themes: string[];
  tone: string;
  updatedAt: Date;
};

type StoredContentIdea = {
  angle: string;
  archivedAt: Date | null;
  category: string | null;
  createdAt: Date;
  createdById: string | null;
  id: string;
  justification: string;
  organizationId: string;
  recommendedFormat: ContentFormat;
  status: ContentIdeaStatus;
  title: string;
  updatedAt: Date;
};

type StoredContentItem = {
  archivedAt: Date | null;
  body: string;
  brief: string | null;
  categoryId: string | null;
  createdAt: Date;
  createdById: string | null;
  deletedAt: Date | null;
  duplicateScore: number | null;
  format: ContentFormat;
  id: string;
  ideaId: string | null;
  organizationId: string;
  publishedAt: Date | null;
  source: ContentSource;
  status: ContentItemStatus;
  title: string;
  topic: string | null;
  updatedAt: Date;
};

type StoredContentCategory = {
  createdAt: Date;
  id: string;
  name: string;
  organizationId: string;
  slug: string;
  updatedAt: Date;
};

type StoredTag = {
  color: string | null;
  createdAt: Date;
  id: string;
  name: string;
  organizationId: string;
  slug: string;
  updatedAt: Date;
};

type StoredContentTag = {
  contentItemId: string;
  createdAt: Date;
  organizationId: string;
  tagId: string;
};

type StoredAiGenerationLog = {
  createdAt: Date;
  id: string;
  organizationId: string;
  status: "FAILED" | "SUCCEEDED";
};

type StoredPublicationPlan = {
  channel: PublicationChannel;
  contentItemId: string;
  createdAt: Date;
  id: string;
  notes: string | null;
  organizationId: string;
  publicationDate: Date;
  status: DbPublicationStatus;
  updatedAt: Date;
};

type StoredOnboardingProgress = {
  completedAt: Date | null;
  completedSteps: AdvancedOnboardingStep[];
  createdAt: Date;
  currentStep: AdvancedOnboardingStep;
  id: string;
  organizationId: string;
  skippedAt: Date | null;
  updatedAt: Date;
  userId: string;
};

type StoredBrandVoiceProfile = {
  creativity: number;
  examples: string[];
  forbiddenTerms: string[];
  language: string;
  organizationId: string;
  targetLength: string;
  toneRules: string;
  updatedAt: Date;
};

type Select = Record<string, boolean> | undefined;
type ContentItemWhere = Record<string, any>;
type PublicationPlanWhere = Record<string, any>;

class OrganizationFakePrismaService {
  private users: StoredUser[] = [];
  private authAccounts: StoredAuthAccount[] = [];
  private organizations: StoredOrganization[] = [];
  private memberships: StoredMembership[] = [];
  private editorialContexts: StoredEditorialContext[] = [];
  private contentIdeas: StoredContentIdea[] = [];
  private contentItems: StoredContentItem[] = [];
  private contentCategories: StoredContentCategory[] = [];
  private tags: StoredTag[] = [];
  private contentTags: StoredContentTag[] = [];
  private aiGenerationLogs: StoredAiGenerationLog[] = [];
  private publicationPlans: StoredPublicationPlan[] = [];
  private onboardingProgresses: StoredOnboardingProgress[] = [];
  private brandVoiceProfiles: StoredBrandVoiceProfile[] = [];
  private sequence = 0;

  readonly user = {
    create: async (args: {
      data: Pick<StoredUser, "email" | "name"> &
        Partial<Pick<StoredUser, "avatarUrl">>;
      select?: Select;
    }) => {
      const user: StoredUser = {
        avatarUrl: args.data.avatarUrl ?? null,
        deletedAt: null,
        email: args.data.email,
        id: this.nextId(),
        name: args.data.name,
        onboardingCompletedAt: null,
      };
      this.users.push(user);

      return selectRecord(user, args.select);
    },
    findUnique: async (args: {
      select?: Select;
      where: { email?: string; id?: string };
    }) => {
      const user =
        typeof args.where.email === "string"
          ? this.users.find((candidate) => candidate.email === args.where.email)
          : this.users.find((candidate) => candidate.id === args.where.id);

      return user ? selectRecord(user, args.select) : null;
    },
    update: async (args: {
      data: Partial<
        Pick<StoredUser, "avatarUrl" | "name" | "onboardingCompletedAt">
      >;
      select?: Select;
      where: { id: string };
    }) => {
      const user = this.users.find(
        (candidate) => candidate.id === args.where.id,
      );

      if (!user) {
        throw new Error("User not found");
      }

      user.avatarUrl = args.data.avatarUrl ?? user.avatarUrl;
      user.name = args.data.name ?? user.name;
      user.onboardingCompletedAt =
        args.data.onboardingCompletedAt ?? user.onboardingCompletedAt;

      return selectRecord(user, args.select);
    },
  };

  readonly authAccount = {
    create: async (args: {
      data: Pick<
        StoredAuthAccount,
        "passwordHash" | "provider" | "providerAccountId" | "userId"
      > &
        Partial<Pick<StoredAuthAccount, "metadata">>;
    }) => {
      const account: StoredAuthAccount = {
        id: this.nextId(),
        metadata: args.data.metadata ?? {},
        passwordHash: args.data.passwordHash,
        provider: args.data.provider,
        providerAccountId: args.data.providerAccountId,
        userId: args.data.userId,
      };
      this.authAccounts.push(account);

      return account;
    },
    findUnique: async (args: {
      include?: { user?: { select?: Select } };
      where: {
        provider_providerAccountId: Pick<
          StoredAuthAccount,
          "provider" | "providerAccountId"
        >;
      };
    }) => {
      const account = this.authAccounts.find((candidate) => {
        return (
          candidate.provider ===
            args.where.provider_providerAccountId.provider &&
          candidate.providerAccountId ===
            args.where.provider_providerAccountId.providerAccountId
        );
      });

      if (!account) {
        return null;
      }

      const user = this.users.find(
        (candidate) => candidate.id === account.userId,
      );

      return {
        ...account,
        ...(args.include?.user
          ? { user: selectRecord(user, args.include.user.select) }
          : {}),
      };
    },
    upsert: async () => {
      throw new Error("Not implemented in this test fake");
    },
  };

  readonly organization = {
    create: async (args: {
      data: Pick<StoredOrganization, "name" | "ownerId" | "slug">;
      select?: Select;
    }) => {
      const organization: StoredOrganization = {
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
        deletedAt: null,
        id: this.nextId(),
        name: args.data.name,
        ownerId: args.data.ownerId,
        slug: args.data.slug,
      };
      this.organizations.push(organization);

      return selectRecord(organization, args.select);
    },
    findUnique: async (args: { select?: Select; where: { slug: string } }) => {
      const organization = this.organizations.find((candidate) => {
        return candidate.slug === args.where.slug;
      });

      return organization ? selectRecord(organization, args.select) : null;
    },
  };

  readonly membership = {
    create: async (args: {
      data: Pick<
        StoredMembership,
        "organizationId" | "role" | "status" | "userId"
      >;
      select?: Select;
    }) => {
      const membership: StoredMembership = {
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
        id: this.nextId(),
        organizationId: args.data.organizationId,
        role: args.data.role,
        status: args.data.status,
        userId: args.data.userId,
      };
      this.memberships.push(membership);

      return selectRecord(membership, args.select);
    },
    findFirst: async (args: {
      include?: { organization?: { select?: Select } };
      where: {
        organization?: { deletedAt?: null; slug?: string };
        status?: Status;
        userId?: string;
      };
    }) => {
      const membership = this.memberships.find((candidate) => {
        const organization = this.organizations.find((item) => {
          return item.id === candidate.organizationId;
        });

        return (
          candidate.userId === args.where.userId &&
          candidate.status === args.where.status &&
          organization?.slug === args.where.organization?.slug &&
          organization?.deletedAt === args.where.organization?.deletedAt
        );
      });

      if (!membership) {
        return null;
      }

      const organization = this.organizations.find((candidate) => {
        return candidate.id === membership.organizationId;
      });

      return {
        ...membership,
        ...(args.include?.organization
          ? {
              organization: selectRecord(
                organization,
                args.include.organization.select,
              ),
            }
          : {}),
      };
    },
    findMany: async (args: {
      include?: {
        organization?: { select?: Select };
        user?: { select?: Select };
      };
      orderBy?: { createdAt?: "asc" | "desc" };
      where: {
        organization?: { deletedAt?: null; slug?: string };
        status?: Status;
        userId?: string;
      };
    }) => {
      const memberships = this.memberships.filter((candidate) => {
        const organization = this.organizations.find((item) => {
          return item.id === candidate.organizationId;
        });

        if (args.where.userId && candidate.userId !== args.where.userId) {
          return false;
        }

        if (args.where.status && candidate.status !== args.where.status) {
          return false;
        }

        if (
          args.where.organization?.slug &&
          organization?.slug !== args.where.organization.slug
        ) {
          return false;
        }

        if (
          "deletedAt" in (args.where.organization ?? {}) &&
          organization?.deletedAt !== args.where.organization?.deletedAt
        ) {
          return false;
        }

        return true;
      });

      return memberships.map((membership) => {
        const organization = this.organizations.find((candidate) => {
          return candidate.id === membership.organizationId;
        });
        const user = this.users.find(
          (candidate) => candidate.id === membership.userId,
        );

        return {
          ...membership,
          ...(args.include?.organization
            ? {
                organization: selectRecord(
                  organization,
                  args.include.organization.select,
                ),
              }
            : {}),
          ...(args.include?.user
            ? { user: selectRecord(user, args.include.user.select) }
            : {}),
        };
      });
    },
  };

  readonly editorialContext = {
    findMany: async (args: {
      select?: Select;
      where: { organizationId?: { in?: string[] } };
    }) => {
      const organizationIds = args.where.organizationId?.in ?? [];

      return this.editorialContexts
        .filter((context) => organizationIds.includes(context.organizationId))
        .map((context) => selectRecord(context, args.select));
    },
    findUnique: async (args: {
      select?: Select;
      where: { organizationId: string };
    }) => {
      const context = this.editorialContexts.find((candidate) => {
        return candidate.organizationId === args.where.organizationId;
      });

      return context ? selectRecord(context, args.select) : null;
    },
    upsert: async (args: {
      create: Pick<
        StoredEditorialContext,
        | "createdById"
        | "organizationId"
        | "positioning"
        | "resourceNotes"
        | "sector"
        | "targetAudience"
        | "themes"
        | "tone"
      >;
      select?: Select;
      update: Pick<
        StoredEditorialContext,
        | "positioning"
        | "resourceNotes"
        | "sector"
        | "targetAudience"
        | "themes"
        | "tone"
      >;
      where: { organizationId: string };
    }) => {
      const context = this.editorialContexts.find((candidate) => {
        return candidate.organizationId === args.where.organizationId;
      });

      if (context) {
        Object.assign(context, args.update, {
          updatedAt: new Date("2026-07-02T01:00:00.000Z"),
        });
        return selectRecord(context, args.select);
      }

      const createdContext: StoredEditorialContext = {
        ...args.create,
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
        id: this.nextId(),
        updatedAt: new Date("2026-07-02T00:00:00.000Z"),
      };
      this.editorialContexts.push(createdContext);

      return selectRecord(createdContext, args.select);
    },
  };

  readonly onboardingProgress = {
    findUnique: async (args: {
      select?: Select;
      where: {
        userId_organizationId: {
          organizationId: string;
          userId: string;
        };
      };
    }) => {
      const progress = this.onboardingProgresses.find((candidate) => {
        return (
          candidate.organizationId ===
            args.where.userId_organizationId.organizationId &&
          candidate.userId === args.where.userId_organizationId.userId
        );
      });

      return progress ? selectRecord(progress, args.select) : null;
    },
    upsert: async (args: {
      create: Partial<
        Pick<
          StoredOnboardingProgress,
          | "completedAt"
          | "completedSteps"
          | "currentStep"
          | "skippedAt"
        >
      > &
        Pick<StoredOnboardingProgress, "organizationId" | "userId">;
      select?: Select;
      update: Partial<
        Pick<
          StoredOnboardingProgress,
          | "completedAt"
          | "completedSteps"
          | "currentStep"
          | "skippedAt"
        >
      >;
      where: {
        userId_organizationId: {
          organizationId: string;
          userId: string;
        };
      };
    }) => {
      const progress = this.onboardingProgresses.find((candidate) => {
        return (
          candidate.organizationId ===
            args.where.userId_organizationId.organizationId &&
          candidate.userId === args.where.userId_organizationId.userId
        );
      });

      if (progress) {
        Object.assign(progress, args.update, {
          updatedAt: new Date("2026-07-02T01:00:00.000Z"),
        });

        return selectRecord(progress, args.select);
      }

      const createdProgress: StoredOnboardingProgress = {
        completedAt: args.create.completedAt ?? null,
        completedSteps: args.create.completedSteps ?? [],
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
        currentStep: args.create.currentStep ?? "CHECKLIST",
        id: this.nextId(),
        organizationId: args.create.organizationId,
        skippedAt: args.create.skippedAt ?? null,
        updatedAt: new Date("2026-07-02T00:00:00.000Z"),
        userId: args.create.userId,
      };
      this.onboardingProgresses.push(createdProgress);

      return selectRecord(createdProgress, args.select);
    },
  };

  readonly brandVoiceProfile = {
    findUnique: async (args: {
      select?: Select;
      where: { organizationId: string };
    }) => {
      const profile = this.brandVoiceProfiles.find((candidate) => {
        return candidate.organizationId === args.where.organizationId;
      });

      return profile ? selectRecord(profile, args.select) : null;
    },
    upsert: async (args: {
      create: Omit<StoredBrandVoiceProfile, "updatedAt">;
      select?: Select;
      update: Partial<StoredBrandVoiceProfile>;
      where: { organizationId: string };
    }) => {
      const profile = this.brandVoiceProfiles.find((candidate) => {
        return candidate.organizationId === args.where.organizationId;
      });

      if (profile) {
        Object.assign(profile, args.update, {
          updatedAt: new Date("2026-07-02T01:00:00.000Z"),
        });

        return selectRecord(profile, args.select);
      }

      const createdProfile: StoredBrandVoiceProfile = {
        ...args.create,
        updatedAt: new Date("2026-07-02T00:00:00.000Z"),
      };
      this.brandVoiceProfiles.push(createdProfile);

      return selectRecord(createdProfile, args.select);
    },
  };

  readonly contentIdea = {
    create: async (args: {
      data: Pick<
        StoredContentIdea,
        | "angle"
        | "category"
        | "createdById"
        | "justification"
        | "organizationId"
        | "recommendedFormat"
        | "status"
        | "title"
      >;
      select?: Select;
    }) => {
      const idea: StoredContentIdea = {
        ...args.data,
        archivedAt: null,
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
        id: this.nextId(),
        updatedAt: new Date("2026-07-02T00:00:00.000Z"),
      };
      this.contentIdeas.push(idea);

      return selectRecord(idea, args.select);
    },
    findFirst: async (args: {
      select?: Select;
      where: {
        archivedAt?: null;
        id?: string;
        organizationId?: string;
      };
    }) => {
      const idea = this.contentIdeas.find((candidate) => {
        if (args.where.id && candidate.id !== args.where.id) {
          return false;
        }

        if (
          args.where.organizationId &&
          candidate.organizationId !== args.where.organizationId
        ) {
          return false;
        }

        if (
          "archivedAt" in args.where &&
          candidate.archivedAt !== args.where.archivedAt
        ) {
          return false;
        }

        return true;
      });

      return idea ? selectRecord(idea, args.select) : null;
    },
    findMany: async (args: {
      orderBy?: { createdAt?: "asc" | "desc" };
      select?: Select;
      take?: number;
      where: {
        archivedAt?: null;
        organizationId?: string;
        status?: { in?: ContentIdeaStatus[] };
      };
    }) => {
      const ideas = this.contentIdeas
        .filter((candidate) => {
          if (
            args.where.organizationId &&
            candidate.organizationId !== args.where.organizationId
          ) {
            return false;
          }

          if (
            "archivedAt" in args.where &&
            candidate.archivedAt !== args.where.archivedAt
          ) {
            return false;
          }

          if (
            args.where.status?.in &&
            !args.where.status.in.includes(candidate.status)
          ) {
            return false;
          }

          return true;
        })
        .sort((first, second) => {
          if (args.orderBy?.createdAt === "asc") {
            return first.createdAt.getTime() - second.createdAt.getTime();
          }

          return second.createdAt.getTime() - first.createdAt.getTime();
        });

      return ideas
        .slice(0, args.take ?? ideas.length)
        .map((idea) => selectRecord(idea, args.select));
    },
    update: async (args: {
      data: Partial<Pick<StoredContentIdea, "archivedAt" | "status">>;
      select?: Select;
      where: { id: string };
    }) => {
      const idea = this.contentIdeas.find((candidate) => {
        return candidate.id === args.where.id;
      });

      if (!idea) {
        throw new Error("Content idea not found");
      }

      Object.assign(idea, args.data, {
        updatedAt: new Date("2026-07-02T01:00:00.000Z"),
      });

      return selectRecord(idea, args.select);
    },
  };

  readonly contentCategory = {
    create: async (args: {
      data: Pick<StoredContentCategory, "name" | "organizationId" | "slug">;
      select?: Select;
    }) => {
      const category: StoredContentCategory = {
        ...args.data,
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
        id: this.nextId(),
        updatedAt: new Date("2026-07-02T00:00:00.000Z"),
      };
      this.contentCategories.push(category);

      return selectRecord(category, args.select);
    },
    findFirst: async (args: {
      select?: Select;
      where: Partial<
        Pick<StoredContentCategory, "id" | "organizationId" | "slug">
      >;
    }) => {
      const category = this.contentCategories.find((candidate) => {
        if (args.where.id && candidate.id !== args.where.id) {
          return false;
        }

        if (
          args.where.organizationId &&
          candidate.organizationId !== args.where.organizationId
        ) {
          return false;
        }

        if (args.where.slug && candidate.slug !== args.where.slug) {
          return false;
        }

        return true;
      });

      return category ? selectRecord(category, args.select) : null;
    },
    findMany: async (args: {
      orderBy?: { name?: "asc" | "desc" };
      select?: Select;
      where: { organizationId?: string };
    }) => {
      return this.contentCategories
        .filter((category) => {
          if (
            args.where.organizationId &&
            category.organizationId !== args.where.organizationId
          ) {
            return false;
          }

          return true;
        })
        .sort((first, second) => {
          return args.orderBy?.name === "desc"
            ? second.name.localeCompare(first.name)
            : first.name.localeCompare(second.name);
        })
        .map((category) => selectRecord(category, args.select));
    },
  };

  readonly tag = {
    create: async (args: {
      data: Pick<StoredTag, "color" | "name" | "organizationId" | "slug">;
      select?: Select;
    }) => {
      const tag: StoredTag = {
        ...args.data,
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
        id: this.nextId(),
        updatedAt: new Date("2026-07-02T00:00:00.000Z"),
      };
      this.tags.push(tag);

      return selectRecord(tag, args.select);
    },
    findFirst: async (args: {
      select?: Select;
      where: Partial<Pick<StoredTag, "id" | "organizationId" | "slug">>;
    }) => {
      const tag = this.tags.find((candidate) => {
        if (args.where.id && candidate.id !== args.where.id) {
          return false;
        }

        if (
          args.where.organizationId &&
          candidate.organizationId !== args.where.organizationId
        ) {
          return false;
        }

        if (args.where.slug && candidate.slug !== args.where.slug) {
          return false;
        }

        return true;
      });

      return tag ? selectRecord(tag, args.select) : null;
    },
    findMany: async (args: {
      orderBy?: { name?: "asc" | "desc" };
      select?: Select;
      where: {
        id?: { in?: string[] };
        organizationId?: string;
      };
    }) => {
      return this.tags
        .filter((tag) => {
          if (
            args.where.organizationId &&
            tag.organizationId !== args.where.organizationId
          ) {
            return false;
          }

          if (args.where.id?.in && !args.where.id.in.includes(tag.id)) {
            return false;
          }

          return true;
        })
        .sort((first, second) => {
          return args.orderBy?.name === "desc"
            ? second.name.localeCompare(first.name)
            : first.name.localeCompare(second.name);
        })
        .map((tag) => selectRecord(tag, args.select));
    },
  };

  readonly contentTag = {
    createMany: async (args: {
      data: Array<
        Pick<StoredContentTag, "contentItemId" | "organizationId" | "tagId">
      >;
      skipDuplicates?: boolean;
    }) => {
      let count = 0;

      args.data.forEach((input) => {
        const exists = this.contentTags.some((candidate) => {
          return (
            candidate.contentItemId === input.contentItemId &&
            candidate.tagId === input.tagId
          );
        });

        if (exists && args.skipDuplicates) {
          return;
        }

        this.contentTags.push({
          ...input,
          createdAt: new Date("2026-07-02T00:00:00.000Z"),
        });
        count += 1;
      });

      return { count };
    },
    deleteMany: async (args: {
      where: Partial<
        Pick<StoredContentTag, "contentItemId" | "organizationId">
      >;
    }) => {
      const initialLength = this.contentTags.length;
      this.contentTags = this.contentTags.filter((candidate) => {
        if (
          args.where.contentItemId &&
          candidate.contentItemId !== args.where.contentItemId
        ) {
          return true;
        }

        if (
          args.where.organizationId &&
          candidate.organizationId !== args.where.organizationId
        ) {
          return true;
        }

        return false;
      });

      return { count: initialLength - this.contentTags.length };
    },
  };

  readonly contentItem = {
    create: async (args: {
      data: Pick<
        StoredContentItem,
        | "body"
        | "brief"
        | "categoryId"
        | "createdById"
        | "duplicateScore"
        | "format"
        | "ideaId"
        | "organizationId"
        | "source"
        | "status"
        | "title"
        | "topic"
      >;
      select?: Select;
    }) => {
      const content: StoredContentItem = {
        ...args.data,
        archivedAt: null,
        categoryId: args.data.categoryId ?? null,
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
        deletedAt: null,
        id: this.nextId(),
        publishedAt: null,
        updatedAt: new Date("2026-07-02T00:00:00.000Z"),
      };
      this.contentItems.push(content);

      return selectRecord(this.buildContentItemResult(content), args.select);
    },
    findFirst: async (args: { select?: Select; where: ContentItemWhere }) => {
      const content = this.contentItems.find((candidate) => {
        return matchesContentItemWhere(
          candidate,
          args.where,
          this.contentTags,
          this.contentCategories,
        );
      });

      return content
        ? selectRecord(this.buildContentItemResult(content), args.select)
        : null;
    },
    findMany: async (args: {
      orderBy?: { createdAt?: "asc" | "desc"; updatedAt?: "asc" | "desc" };
      select?: Select;
      skip?: number;
      take?: number;
      where: ContentItemWhere;
    }) => {
      const contents = this.contentItems
        .filter((candidate) =>
          matchesContentItemWhere(
            candidate,
            args.where,
            this.contentTags,
            this.contentCategories,
          ),
        )
        .sort((first, second) => {
          if (args.orderBy?.updatedAt === "asc") {
            return first.updatedAt.getTime() - second.updatedAt.getTime();
          }

          if (args.orderBy?.updatedAt === "desc") {
            return second.updatedAt.getTime() - first.updatedAt.getTime();
          }

          if (args.orderBy?.createdAt === "asc") {
            return first.createdAt.getTime() - second.createdAt.getTime();
          }

          return second.createdAt.getTime() - first.createdAt.getTime();
        });

      return contents
        .slice(
          args.skip ?? 0,
          (args.skip ?? 0) + (args.take ?? contents.length),
        )
        .map((content) =>
          selectRecord(this.buildContentItemResult(content), args.select),
        );
    },
    count: async (args: { where: ContentItemWhere }) => {
      return this.contentItems.filter((candidate) =>
        matchesContentItemWhere(
          candidate,
          args.where,
          this.contentTags,
          this.contentCategories,
        ),
      ).length;
    },
    update: async (args: {
      data: Partial<
        Pick<
          StoredContentItem,
          | "archivedAt"
          | "body"
          | "brief"
          | "categoryId"
          | "duplicateScore"
          | "format"
          | "ideaId"
          | "publishedAt"
          | "status"
          | "title"
          | "topic"
        >
      >;
      select?: Select;
      where: { id: string };
    }) => {
      const content = this.contentItems.find((candidate) => {
        return candidate.id === args.where.id;
      });

      if (!content) {
        throw new Error("Content not found");
      }

      Object.assign(content, args.data, {
        updatedAt: new Date("2026-07-02T01:00:00.000Z"),
      });

      return selectRecord(this.buildContentItemResult(content), args.select);
    },
  };

  readonly publicationPlan = {
    create: async (args: {
      data: Pick<
        StoredPublicationPlan,
        | "channel"
        | "contentItemId"
        | "notes"
        | "organizationId"
        | "publicationDate"
        | "status"
      >;
      select?: Select;
    }) => {
      const plan: StoredPublicationPlan = {
        ...args.data,
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
        id: this.nextId(),
        publicationDate: new Date(args.data.publicationDate),
        updatedAt: new Date("2026-07-02T00:00:00.000Z"),
      };
      this.publicationPlans.push(plan);

      return selectRecord(this.buildPublicationPlanResult(plan), args.select);
    },
    findFirst: async (args: {
      orderBy?: {
        createdAt?: "asc" | "desc";
        publicationDate?: "asc" | "desc";
      };
      select?: Select;
      where: PublicationPlanWhere;
    }) => {
      const plans = this.findPublicationPlans(args.where, args.orderBy);
      const plan = plans[0];

      return plan
        ? selectRecord(this.buildPublicationPlanResult(plan), args.select)
        : null;
    },
    findMany: async (args: {
      orderBy?: {
        createdAt?: "asc" | "desc";
        publicationDate?: "asc" | "desc";
      };
      select?: Select;
      take?: number;
      where: PublicationPlanWhere;
    }) => {
      return this.findPublicationPlans(args.where, args.orderBy)
        .slice(0, args.take ?? this.publicationPlans.length)
        .map((plan) =>
          selectRecord(this.buildPublicationPlanResult(plan), args.select),
        );
    },
    update: async (args: {
      data: Partial<
        Pick<
          StoredPublicationPlan,
          "channel" | "contentItemId" | "notes" | "publicationDate" | "status"
        >
      >;
      select?: Select;
      where: { id: string };
    }) => {
      const plan = this.publicationPlans.find((candidate) => {
        return candidate.id === args.where.id;
      });

      if (!plan) {
        throw new Error("Publication plan not found");
      }

      Object.assign(plan, args.data, {
        publicationDate: args.data.publicationDate
          ? new Date(args.data.publicationDate)
          : plan.publicationDate,
        updatedAt: new Date("2026-07-02T01:00:00.000Z"),
      });

      return selectRecord(this.buildPublicationPlanResult(plan), args.select);
    },
    delete: async (args: { where: { id: string } }) => {
      const planIndex = this.publicationPlans.findIndex((candidate) => {
        return candidate.id === args.where.id;
      });

      if (planIndex < 0) {
        throw new Error("Publication plan not found");
      }

      const [plan] = this.publicationPlans.splice(planIndex, 1);

      if (!plan) {
        throw new Error("Publication plan not found");
      }

      return this.buildPublicationPlanResult(plan);
    },
  };

  readonly aiGenerationLog = {
    create: async (args: { data: Record<string, unknown> }) => {
      const generationLog: StoredAiGenerationLog = {
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
        id: this.nextId(),
        organizationId: String(args.data.organizationId),
        status:
          args.data.status === "FAILED" || args.data.status === "SUCCEEDED"
            ? args.data.status
            : "SUCCEEDED",
      };
      this.aiGenerationLogs.push(generationLog);

      return {
        ...args.data,
        id: generationLog.id,
      };
    },
    findMany: async (args: {
      select?: Select;
      where: { organizationId?: string };
    }) => {
      return this.aiGenerationLogs
        .filter((generationLog) => {
          if (
            args.where.organizationId &&
            generationLog.organizationId !== args.where.organizationId
          ) {
            return false;
          }

          return true;
        })
        .map((generationLog) => selectRecord(generationLog, args.select));
    },
  };

  reset(): void {
    this.users = [];
    this.authAccounts = [];
    this.organizations = [];
    this.memberships = [];
    this.editorialContexts = [];
    this.contentIdeas = [];
    this.contentItems = [];
    this.contentCategories = [];
    this.tags = [];
    this.contentTags = [];
    this.aiGenerationLogs = [];
    this.publicationPlans = [];
    this.onboardingProgresses = [];
    this.brandVoiceProfiles = [];
    this.sequence = 0;
  }

  async $transaction<T>(
    callback: (transaction: this) => Promise<T>,
  ): Promise<T> {
    return callback(this);
  }

  addMembershipByEmail(
    email: string,
    organizationSlug: string,
    role: Role,
  ): void {
    const user = this.users.find((candidate) => candidate.email === email);
    const organization = this.organizations.find((candidate) => {
      return candidate.slug === organizationSlug;
    });

    if (!user || !organization) {
      throw new Error("Cannot add fake membership");
    }

    this.memberships.push({
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
      id: this.nextId(),
      organizationId: organization.id,
      role,
      status: "ACTIVE",
      userId: user.id,
    });
  }

  addContentIdeaBySlug(
    organizationSlug: string,
    input: Pick<
      StoredContentIdea,
      "angle" | "category" | "recommendedFormat" | "title"
    > &
      Partial<Pick<StoredContentIdea, "justification" | "status">>,
  ): string {
    const organization = this.organizations.find((candidate) => {
      return candidate.slug === organizationSlug;
    });

    if (!organization) {
      throw new Error("Cannot add fake content idea");
    }

    const idea: StoredContentIdea = {
      angle: input.angle,
      archivedAt: null,
      category: input.category,
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
      createdById: organization.ownerId,
      id: this.nextId(),
      justification: input.justification ?? "Justification de test",
      organizationId: organization.id,
      recommendedFormat: input.recommendedFormat,
      status: input.status ?? "SAVED",
      title: input.title,
      updatedAt: new Date("2026-07-02T00:00:00.000Z"),
    };

    this.contentIdeas.push(idea);

    return idea.id;
  }

  addContentItemBySlug(
    organizationSlug: string,
    input: Pick<StoredContentItem, "body" | "format" | "status" | "title"> &
      Partial<
        Pick<
          StoredContentItem,
          | "brief"
          | "categoryId"
          | "duplicateScore"
          | "ideaId"
          | "source"
          | "topic"
        >
      >,
  ): string {
    const organization = this.organizations.find((candidate) => {
      return candidate.slug === organizationSlug;
    });

    if (!organization) {
      throw new Error("Cannot add fake content item");
    }

    const content: StoredContentItem = {
      archivedAt: null,
      body: input.body,
      brief: input.brief ?? null,
      categoryId: input.categoryId ?? null,
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
      createdById: organization.ownerId,
      deletedAt: null,
      duplicateScore: input.duplicateScore ?? null,
      format: input.format,
      id: this.nextId(),
      ideaId: input.ideaId ?? null,
      organizationId: organization.id,
      publishedAt: null,
      source: input.source ?? "AI_GENERATED",
      status: input.status,
      title: input.title,
      topic: input.topic ?? null,
      updatedAt: new Date("2026-07-02T00:00:00.000Z"),
    };

    this.contentItems.push(content);

    return content.id;
  }

  addAiGenerationLogBySlug(
    organizationSlug: string,
    status: StoredAiGenerationLog["status"],
  ): string {
    const organization = this.organizations.find((candidate) => {
      return candidate.slug === organizationSlug;
    });

    if (!organization) {
      throw new Error("Cannot add fake AI generation log");
    }

    const generationLog: StoredAiGenerationLog = {
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
      id: this.nextId(),
      organizationId: organization.id,
      status,
    };

    this.aiGenerationLogs.push(generationLog);

    return generationLog.id;
  }

  private findPublicationPlans(
    where: PublicationPlanWhere,
    orderBy?: { createdAt?: "asc" | "desc"; publicationDate?: "asc" | "desc" },
  ): StoredPublicationPlan[] {
    return this.publicationPlans
      .filter((plan) => matchesPublicationPlanWhere(plan, where))
      .sort((first, second) => {
        if (orderBy?.publicationDate === "desc") {
          return (
            second.publicationDate.getTime() - first.publicationDate.getTime()
          );
        }

        if (orderBy?.publicationDate === "asc") {
          return (
            first.publicationDate.getTime() - second.publicationDate.getTime()
          );
        }

        if (orderBy?.createdAt === "asc") {
          return first.createdAt.getTime() - second.createdAt.getTime();
        }

        return second.createdAt.getTime() - first.createdAt.getTime();
      });
  }

  private buildPublicationPlanResult(plan: StoredPublicationPlan) {
    const contentItem = this.contentItems.find((candidate) => {
      return candidate.id === plan.contentItemId;
    });

    return {
      ...plan,
      contentItem: contentItem
        ? selectRecord(this.buildContentItemResult(contentItem), {
            format: true,
            id: true,
            status: true,
            title: true,
          })
        : null,
    };
  }

  private buildContentItemResult(content: StoredContentItem) {
    const category = content.categoryId
      ? (this.contentCategories.find((candidate) => {
          return candidate.id === content.categoryId;
        }) ?? null)
      : null;
    const contentTags = this.contentTags
      .filter((contentTag) => {
        return contentTag.contentItemId === content.id;
      })
      .map((contentTag) => {
        const tag = this.tags.find((candidate) => {
          return candidate.id === contentTag.tagId;
        });

        return {
          ...contentTag,
          tag,
        };
      })
      .filter(
        (contentTag): contentTag is StoredContentTag & { tag: StoredTag } => {
          return Boolean(contentTag.tag);
        },
      );

    return {
      ...content,
      category,
      contentTags,
    };
  }

  private nextId(): string {
    this.sequence += 1;
    return `018f7b8f-3eb4-4e57-a321-${String(this.sequence).padStart(12, "0")}`;
  }
}

async function registerAndExtractCookie(
  app: INestApplication,
  email: string,
  name: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post("/api/auth/register")
    .send({
      email,
      name,
      password: "Password123",
    })
    .expect(201);

  const cookie = response.headers["set-cookie"];

  if (!Array.isArray(cookie) || !cookie[0]) {
    throw new Error("Expected auth cookie");
  }

  return cookie[0];
}

function selectRecord<TRecord extends object | undefined>(
  record: TRecord,
  select?: Select,
): TRecord | Partial<NonNullable<TRecord>> | undefined {
  if (!record || !select) {
    return record;
  }

  const source = record as Record<string, unknown>;

  return Object.fromEntries(
    Object.entries(select)
      .filter(([, enabled]) => enabled)
      .map(([key]) => [key, source[key]]),
  ) as Partial<NonNullable<TRecord>>;
}

function matchesContentItemWhere(
  content: StoredContentItem,
  where: ContentItemWhere,
  contentTags: StoredContentTag[] = [],
  contentCategories: StoredContentCategory[] = [],
): boolean {
  if (where.AND) {
    const filters = Array.isArray(where.AND) ? where.AND : [where.AND];

    if (
      !filters.every((filter) =>
        matchesContentItemWhere(
          content,
          filter,
          contentTags,
          contentCategories,
        ),
      )
    ) {
      return false;
    }
  }

  if (where.OR) {
    const filters = Array.isArray(where.OR) ? where.OR : [where.OR];

    if (
      !filters.some((filter) =>
        matchesContentItemWhere(
          content,
          filter,
          contentTags,
          contentCategories,
        ),
      )
    ) {
      return false;
    }
  }

  if (where.id && content.id !== where.id) {
    return false;
  }

  if (where.organizationId && content.organizationId !== where.organizationId) {
    return false;
  }

  if ("deletedAt" in where && content.deletedAt !== where.deletedAt) {
    return false;
  }

  if (where.categoryId && content.categoryId !== where.categoryId) {
    return false;
  }

  if (where.format && content.format !== where.format) {
    return false;
  }

  if (typeof where.status === "string" && content.status !== where.status) {
    return false;
  }

  if (where.status && typeof where.status === "object") {
    if (where.status.not && content.status === where.status.not) {
      return false;
    }

    if (where.status.notIn && where.status.notIn.includes(content.status)) {
      return false;
    }

    if (where.status.in && !where.status.in.includes(content.status)) {
      return false;
    }
  }

  if (where.updatedAt && typeof where.updatedAt === "object") {
    if (where.updatedAt.gte && content.updatedAt < where.updatedAt.gte) {
      return false;
    }

    if (where.updatedAt.lte && content.updatedAt > where.updatedAt.lte) {
      return false;
    }
  }

  if (where.title && !matchesStringFilter(content.title, where.title)) {
    return false;
  }

  if (where.body && !matchesStringFilter(content.body, where.body)) {
    return false;
  }

  if (where.topic && !matchesStringFilter(content.topic ?? "", where.topic)) {
    return false;
  }

  if (where.category?.name) {
    const category = content.categoryId
      ? contentCategories.find((candidate) => {
          return candidate.id === content.categoryId;
        })
      : null;

    if (!category || !matchesStringFilter(category.name, where.category.name)) {
      return false;
    }
  }

  if (where.contentTags?.some) {
    const hasMatchingTag = contentTags.some((contentTag) => {
      if (contentTag.contentItemId !== content.id) {
        return false;
      }

      if (
        where.contentTags.some.organizationId &&
        contentTag.organizationId !== where.contentTags.some.organizationId
      ) {
        return false;
      }

      if (
        where.contentTags.some.tagId &&
        contentTag.tagId !== where.contentTags.some.tagId
      ) {
        return false;
      }

      return true;
    });

    if (!hasMatchingTag) {
      return false;
    }
  }

  return true;
}

function matchesPublicationPlanWhere(
  plan: StoredPublicationPlan,
  where: PublicationPlanWhere,
): boolean {
  if (where.id && plan.id !== where.id) {
    return false;
  }

  if (where.organizationId && plan.organizationId !== where.organizationId) {
    return false;
  }

  if (where.contentItemId && plan.contentItemId !== where.contentItemId) {
    return false;
  }

  if (where.channel && plan.channel !== where.channel) {
    return false;
  }

  if (typeof where.status === "string" && plan.status !== where.status) {
    return false;
  }

  if (where.status && typeof where.status === "object") {
    if (where.status.not && plan.status === where.status.not) {
      return false;
    }

    if (where.status.in && !where.status.in.includes(plan.status)) {
      return false;
    }

    if (where.status.notIn && where.status.notIn.includes(plan.status)) {
      return false;
    }
  }

  if (where.publicationDate && typeof where.publicationDate === "object") {
    if (
      where.publicationDate.gte &&
      plan.publicationDate < where.publicationDate.gte
    ) {
      return false;
    }

    if (
      where.publicationDate.lte &&
      plan.publicationDate > where.publicationDate.lte
    ) {
      return false;
    }
  }

  return true;
}

function matchesStringFilter(value: string, filter: Record<string, unknown>) {
  if (typeof filter.contains !== "string") {
    return true;
  }

  return value.toLowerCase().includes(filter.contains.toLowerCase());
}
