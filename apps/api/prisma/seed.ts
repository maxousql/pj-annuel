import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PrismaClient } from "../src/generated/prisma/client";
import { assertDemoSeedSafety } from "../src/database/demo-seed-safety";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl)
  throw new Error("DATABASE_URL is required to seed the database.");

const seedEnabled = assertDemoSeedSafety(process.env, databaseUrl);

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("supabase.co")
      ? { rejectUnauthorized: false }
      : undefined,
  }),
});

type DemoData = {
  users: Array<{ email: string; name: string }>;
  organizations: Array<{ name: string; slug: string }>;
  editorialContexts: Array<{
    industry: string;
    organizationSlug: string;
    positioning: string;
    resourceNotes: string;
    targetAudience: string;
    tone: string;
    topics: string[];
  }>;
  ideas: Array<{
    angle: string;
    category: string;
    format: "BLOG_ARTICLE" | "LINKEDIN_POST" | "SOCIAL_POST" | "EMAIL" | "HOOK";
    justification: string;
    organizationSlug: string;
    title: string;
  }>;
  contents: Array<{
    body: string;
    format: "BLOG_ARTICLE" | "LINKEDIN_POST" | "SOCIAL_POST" | "EMAIL" | "HOOK";
    organizationSlug: string;
    status: "DRAFT" | "REVIEW" | "READY" | "SCHEDULED" | "PUBLISHED";
    title: string;
    topic: string;
  }>;
};

async function main(): Promise<void> {
  if (!seedEnabled) {
    console.log(
      "[db:seed] Skipped. Set SEED_DEMO_DATA=true to insert demo data.",
    );
    return;
  }

  const data = loadDemoData();
  const demoUser = data.users[0];
  const demoOrganization = data.organizations[0];

  if (!demoUser || !demoOrganization) {
    throw new Error(
      "db/seeds/demo-data.json must define a user and an organization.",
    );
  }

  const email = (process.env.DEMO_USER_EMAIL ?? demoUser.email).toLowerCase();
  const password = process.env.DEMO_USER_PASSWORD ?? "DemoContent2026!";

  if (password.length < 12)
    throw new Error("DEMO_USER_PASSWORD must contain at least 12 characters.");

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    create: { email, name: demoUser.name },
    update: { deletedAt: null, name: demoUser.name },
    where: { email },
  });

  await prisma.authAccount.upsert({
    create: {
      passwordHash,
      provider: "CREDENTIALS",
      providerAccountId: email,
      userId: user.id,
    },
    update: { passwordHash, userId: user.id },
    where: {
      provider_providerAccountId: {
        provider: "CREDENTIALS",
        providerAccountId: email,
      },
    },
  });

  const organization = await prisma.organization.upsert({
    create: {
      name: demoOrganization.name,
      ownerId: user.id,
      slug: demoOrganization.slug,
    },
    update: { deletedAt: null, name: demoOrganization.name, ownerId: user.id },
    where: { slug: demoOrganization.slug },
  });

  await prisma.membership.upsert({
    create: {
      organizationId: organization.id,
      role: "ADMIN",
      status: "ACTIVE",
      userId: user.id,
    },
    update: { role: "ADMIN", status: "ACTIVE" },
    where: {
      userId_organizationId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
  });

  const context = data.editorialContexts.find(
    (candidate) => candidate.organizationSlug === organization.slug,
  );
  if (context) {
    await prisma.editorialContext.upsert({
      create: {
        createdById: user.id,
        organizationId: organization.id,
        positioning: context.positioning,
        resourceNotes: context.resourceNotes,
        sector: context.industry,
        targetAudience: context.targetAudience,
        themes: context.topics,
        tone: context.tone,
      },
      update: {
        positioning: context.positioning,
        resourceNotes: context.resourceNotes,
        sector: context.industry,
        targetAudience: context.targetAudience,
        themes: context.topics,
        tone: context.tone,
      },
      where: { organizationId: organization.id },
    });
  }

  for (const idea of data.ideas.filter(
    (candidate) => candidate.organizationSlug === organization.slug,
  )) {
    const existing = await prisma.contentIdea.findFirst({
      where: { organizationId: organization.id, title: idea.title },
    });
    const values = {
      angle: idea.angle,
      category: idea.category,
      justification: idea.justification,
      recommendedFormat: idea.format,
      status: "SAVED" as const,
    };

    if (existing)
      await prisma.contentIdea.update({
        data: values,
        where: { id: existing.id },
      });
    else {
      await prisma.contentIdea.create({
        data: {
          ...values,
          createdById: user.id,
          organizationId: organization.id,
          title: idea.title,
        },
      });
    }
  }

  const seededContents = [];
  for (const content of data.contents.filter(
    (candidate) => candidate.organizationSlug === organization.slug,
  )) {
    const existing = await prisma.contentItem.findFirst({
      where: { organizationId: organization.id, title: content.title },
    });
    const values = {
      body: content.body,
      format: content.format,
      status: content.status,
      topic: content.topic,
    };
    const saved = existing
      ? await prisma.contentItem.update({
          data: values,
          where: { id: existing.id },
        })
      : await prisma.contentItem.create({
          data: {
            ...values,
            createdById: user.id,
            organizationId: organization.id,
            source: "USER_CREATED",
            title: content.title,
          },
        });
    seededContents.push(saved);
  }

  const scheduledContent = seededContents[0];
  if (scheduledContent) {
    const existingPlan = await prisma.publicationPlan.findFirst({
      where: {
        contentItemId: scheduledContent.id,
        organizationId: organization.id,
      },
    });
    const publicationDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1_000);
    if (existingPlan) {
      await prisma.publicationPlan.update({
        data: { channel: "LINKEDIN", publicationDate, status: "SCHEDULED" },
        where: { id: existingPlan.id },
      });
    } else {
      await prisma.publicationPlan.create({
        data: {
          channel: "LINKEDIN",
          contentItemId: scheduledContent.id,
          organizationId: organization.id,
          publicationDate,
          status: "SCHEDULED",
        },
      });
    }
  }

  await prisma.curatedResource.upsert({
    create: {
      description:
        "Documentation de reference pour preparer une strategie editoriale.",
      organizationId: organization.id,
      sourceName: "Content Marketing Institute",
      title: "Guide de strategie de contenu",
      topic: "content marketing",
      type: "URL",
      url: "https://contentmarketinginstitute.com/",
    },
    update: { status: "NEW", topic: "content marketing" },
    where: {
      organizationId_url: {
        organizationId: organization.id,
        url: "https://contentmarketinginstitute.com/",
      },
    },
  });

  await prisma.user.update({
    data: { onboardingCompletedAt: new Date() },
    where: { id: user.id },
  });

  console.log(`[db:seed] Demo ready: ${email} / ${organization.slug}`);
  if (
    !process.env.DEMO_USER_PASSWORD &&
    process.env.NODE_ENV !== "production"
  ) {
    console.log(
      "[db:seed] Local demo password: DemoContent2026! (override with DEMO_USER_PASSWORD).",
    );
  }
}

function loadDemoData(): DemoData {
  const path = resolve(__dirname, "../../../db/seeds/demo-data.json");
  return JSON.parse(readFileSync(path, "utf8")) as DemoData;
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed failed.");
    process.exit(1);
  });
