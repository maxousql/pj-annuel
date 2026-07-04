import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("supabase.co")
      ? { rejectUnauthorized: false }
      : undefined,
  }),
});

async function main(): Promise<void> {
  if (process.env.SEED_DEMO_DATA !== "true") {
    console.log(
      "[db:seed] Skipped. Set SEED_DEMO_DATA=true to insert demo data.",
    );
    return;
  }

  const user = await prisma.user.upsert({
    create: {
      email: "demo@example.com",
      name: "Demo User",
      authAccounts: {
        create: {
          provider: "CREDENTIALS",
          providerAccountId: "demo@example.com",
          passwordHash: "demo-seed-placeholder",
        },
      },
    },
    update: {
      name: "Demo User",
    },
    where: {
      email: "demo@example.com",
    },
  });

  const organization = await prisma.organization.upsert({
    create: {
      name: "Demo Organization",
      slug: "demo-organization",
      ownerId: user.id,
      memberships: {
        create: {
          userId: user.id,
          role: "ADMIN",
          status: "ACTIVE",
        },
      },
    },
    update: {
      name: "Demo Organization",
    },
    where: {
      slug: "demo-organization",
    },
  });

  await prisma.editorialContext.upsert({
    create: {
      organizationId: organization.id,
      sector: "Content marketing",
      targetAudience: "PME et agences marketing",
      tone: "Expert, clair et actionnable",
      positioning: "Assistant IA pour structurer la production de contenus.",
      themes: ["IA", "Marketing", "Productivite"],
      createdById: user.id,
    },
    update: {
      tone: "Expert, clair et actionnable",
    },
    where: {
      organizationId: organization.id,
    },
  });

  console.log("[db:seed] Demo organization inserted.");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
