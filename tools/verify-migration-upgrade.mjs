import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const sourceUrl = new URL(databaseUrl);
const hostname = sourceUrl.hostname.replace(/^\[|\]$/g, "");
if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
  throw new Error(
    "Migration upgrade verification only runs on loopback PostgreSQL.",
  );
}

const databaseName = `content_ai_upgrade_${process.pid}_${Date.now()}`.slice(
  0,
  60,
);
const upgradeUrl = new URL(sourceUrl);
upgradeUrl.pathname = `/${databaseName}`;
const admin = new Client({ connectionString: sourceUrl.toString() });
let upgrade;
let adminConnected = false;

try {
  await admin.connect();
  adminConnected = true;
  await admin.query(`do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
  end $$;`);
  await admin.query(`create database "${databaseName}"`);
  upgrade = new Client({ connectionString: upgradeUrl.toString() });
  await upgrade.connect();
  await upgrade.query("create schema if not exists extensions");

  const migrationsRoot = resolve("apps/api/prisma/migrations");
  const migrationNames = (
    await readdir(migrationsRoot, { withFileTypes: true })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const roadmapIndex = migrationNames.indexOf(
    "20260709120000_production_roadmap_completion",
  );
  const hardeningIndex = migrationNames.indexOf(
    "20260710120000_review_hardening",
  );
  if (
    roadmapIndex < 0 ||
    hardeningIndex < 0 ||
    hardeningIndex <= roadmapIndex
  ) {
    throw new Error("Expected roadmap migrations are missing or out of order.");
  }

  for (const migrationName of migrationNames.slice(0, roadmapIndex)) {
    await executeMigration(upgrade, migrationsRoot, migrationName);
  }

  await upgrade.query(`
    insert into public.users (id, email, name)
      values ('10000000-0000-4000-8000-000000000001', 'upgrade@example.com', 'Upgrade');
    insert into public.organizations (id, name, slug, owner_id)
      values (
        '20000000-0000-4000-8000-000000000001',
        'Upgrade organization',
        'upgrade-organization',
        '10000000-0000-4000-8000-000000000001'
      );
    insert into public.recommendations (
      organization_id, type, message, target_type, target_id, status
    ) values
      ('20000000-0000-4000-8000-000000000001', 'CONTENT_TO_PLAN', 'open 1', 'CONTENT', '30000000-0000-4000-8000-000000000001', 'OPEN'),
      ('20000000-0000-4000-8000-000000000001', 'CONTENT_TO_PLAN', 'open 2', 'CONTENT', '30000000-0000-4000-8000-000000000001', 'OPEN'),
      ('20000000-0000-4000-8000-000000000001', 'CONTENT_TO_PLAN', 'dismissed', 'CONTENT', '30000000-0000-4000-8000-000000000001', 'DISMISSED');
  `);

  await executeMigration(upgrade, migrationsRoot, migrationNames[roadmapIndex]);
  await upgrade.query(`
    insert into public.scheduled_job_runs (job_key, bucket_at, instance_id)
    values
      ('upgrade-job', '2026-07-10T00:00:00Z', 'instance-a'),
      ('upgrade-job', '2026-07-10T00:15:00Z', 'instance-b');
  `);
  await executeMigration(
    upgrade,
    migrationsRoot,
    migrationNames[hardeningIndex],
  );

  const recommendation = await upgrade.query(`
    select count(*)::integer as count, min(status::text) as status
    from public.recommendations
    where organization_id = '20000000-0000-4000-8000-000000000001'
      and type = 'CONTENT_TO_PLAN'
      and target_type = 'CONTENT'
      and target_id = '30000000-0000-4000-8000-000000000001';
  `);
  const activeJobs = await upgrade.query(`
    select count(*)::integer as count
    from public.scheduled_job_runs
    where job_key = 'upgrade-job' and status = 'RUNNING';
  `);
  if (
    recommendation.rows[0]?.count !== 1 ||
    recommendation.rows[0]?.status !== "DISMISSED" ||
    activeJobs.rows[0]?.count !== 1
  ) {
    throw new Error("Migration deduplication verification failed.");
  }

  console.log("[migration-upgrade] Existing duplicate data upgraded safely.");
} finally {
  if (upgrade) await upgrade.end().catch(() => undefined);
  if (adminConnected) {
    await admin
      .query(
        "select pg_terminate_backend(pid) from pg_stat_activity where datname = $1",
        [databaseName],
      )
      .catch(() => undefined);
    await admin
      .query(`drop database if exists "${databaseName}"`)
      .catch(() => undefined);
    await admin.end().catch(() => undefined);
  }
}

async function executeMigration(client, root, migrationName) {
  if (!migrationName) throw new Error("Migration name missing.");
  const sql = await readFile(
    resolve(root, migrationName, "migration.sql"),
    "utf8",
  );
  await client.query(sql);
}
