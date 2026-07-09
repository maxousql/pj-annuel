do $$
begin
  create type public.notion_sync_entity_type as enum ('CONTENT', 'RESOURCE');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notion_sync_status as enum ('SUCCEEDED', 'PARTIAL', 'FAILED');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.scheduled_job_status as enum ('RUNNING', 'SUCCEEDED', 'FAILED');
exception
  when duplicate_object then null;
end $$;

alter table public.source_feeds
  add column if not exists next_fetch_at timestamptz;

create index if not exists source_feeds_status_next_fetch_at_idx
  on public.source_feeds (status, next_fetch_at);

with ranked as (
  select id,
    row_number() over (
      partition by organization_id, type, target_type, target_id, status
      order by updated_at desc, created_at desc, id
    ) as duplicate_rank
  from public.recommendations
  where target_id is not null
)
delete from public.recommendations as recommendation
using ranked
where recommendation.id = ranked.id
  and ranked.duplicate_rank > 1;

create unique index if not exists recommendations_idempotency_key
  on public.recommendations (organization_id, type, target_type, target_id, status)
  where target_id is not null;
create unique index if not exists recommendations_organization_id_type_target_type_target_id_status_key
  on public.recommendations (organization_id, type, target_type, target_id, status);

with ranked as (
  select id,
    row_number() over (
      partition by user_id, reminder_id
      order by created_at asc, id
    ) as duplicate_rank
  from public.notifications
  where reminder_id is not null
)
delete from public.notifications as notification
using ranked
where notification.id = ranked.id
  and ranked.duplicate_rank > 1;

create unique index if not exists notifications_user_id_reminder_id_key
  on public.notifications (user_id, reminder_id);

create table if not exists public.notion_database_mappings (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  database_id text not null,
  database_name text not null,
  property_mapping jsonb not null default '{}',
  conflict_strategy text not null default 'NEWEST_WINS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notion_database_mappings_database_id_not_empty_chk check (length(trim(database_id)) > 0),
  constraint notion_database_mappings_database_name_not_empty_chk check (length(trim(database_name)) > 0),
  constraint notion_database_mappings_conflict_strategy_chk check (conflict_strategy in ('LOCAL_WINS', 'NOTION_WINS', 'NEWEST_WINS'))
);

create table if not exists public.notion_sync_states (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type public.notion_sync_entity_type not null,
  entity_id uuid not null,
  notion_page_id text not null,
  last_local_hash text,
  last_remote_edited_at timestamptz,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists notion_sync_states_entity_key
  on public.notion_sync_states (organization_id, entity_type, entity_id);
create unique index if not exists notion_sync_states_page_key
  on public.notion_sync_states (organization_id, notion_page_id);
create index if not exists notion_sync_states_last_synced_idx
  on public.notion_sync_states (organization_id, last_synced_at);

create table if not exists public.notion_sync_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  triggered_by_id uuid,
  operation text not null,
  status public.notion_sync_status not null,
  processed_count integer not null default 0,
  failed_count integer not null default 0,
  duration_ms integer not null default 0,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  constraint notion_sync_logs_counts_chk check (processed_count >= 0 and failed_count >= 0 and duration_ms >= 0)
);

create index if not exists notion_sync_logs_organization_id_created_at_idx
  on public.notion_sync_logs (organization_id, created_at);

create table if not exists public.organization_audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists organization_audit_logs_organization_id_created_at_idx
  on public.organization_audit_logs (organization_id, created_at);
create index if not exists organization_audit_logs_organization_id_action_idx
  on public.organization_audit_logs (organization_id, action);

create table if not exists public.scheduled_job_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  job_key text not null,
  bucket_at timestamptz not null,
  status public.scheduled_job_status not null default 'RUNNING',
  instance_id text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error text
);

create unique index if not exists scheduled_job_runs_job_key_bucket_at_key
  on public.scheduled_job_runs (job_key, bucket_at);
create index if not exists scheduled_job_runs_status_started_at_idx
  on public.scheduled_job_runs (status, started_at);

create table if not exists public.similarity_checks (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  target_type text not null,
  target_id uuid,
  score double precision not null,
  method text not null,
  created_at timestamptz not null default now(),
  constraint similarity_checks_score_chk check (score between 0 and 1)
);

create index if not exists similarity_checks_organization_id_created_at_idx
  on public.similarity_checks (organization_id, created_at);

create table if not exists public.ai_quality_evaluations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  format public.content_format not null,
  score integer not null,
  feedback text,
  created_by_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_quality_evaluations_score_chk check (score between 1 and 5)
);

create unique index if not exists ai_quality_evaluations_author_key
  on public.ai_quality_evaluations (organization_id, content_item_id, created_by_id);
create index if not exists ai_quality_evaluations_organization_id_format_idx
  on public.ai_quality_evaluations (organization_id, format);

alter table public.notion_database_mappings enable row level security;
alter table public.notion_sync_states enable row level security;
alter table public.notion_sync_logs enable row level security;
alter table public.organization_audit_logs enable row level security;
alter table public.scheduled_job_runs enable row level security;
alter table public.similarity_checks enable row level security;
alter table public.ai_quality_evaluations enable row level security;

revoke all on table public.notion_database_mappings, public.notion_sync_states,
  public.notion_sync_logs, public.organization_audit_logs, public.scheduled_job_runs,
  public.similarity_checks, public.ai_quality_evaluations
  from anon, authenticated;

grant select, insert, update, delete on table public.notion_database_mappings,
  public.notion_sync_states, public.notion_sync_logs, public.organization_audit_logs,
  public.scheduled_job_runs, public.similarity_checks, public.ai_quality_evaluations
  to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'notion_database_mappings',
    'notion_sync_states',
    'ai_quality_evaluations'
  ]
  loop
    if not exists (
      select 1 from pg_trigger
      where tgname = table_name || '_set_updated_at'
        and tgrelid = ('public.' || table_name)::regclass
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
        table_name || '_set_updated_at',
        table_name
      );
    end if;
  end loop;
end $$;

comment on table public.notion_database_mappings is 'Organization-level Notion database and property mapping.';
comment on table public.notion_sync_states is 'Idempotent local to Notion page synchronization state.';
comment on table public.organization_audit_logs is 'Security-relevant organization administration audit trail.';
comment on table public.scheduled_job_runs is 'Cross-instance job execution leases by deterministic time bucket.';
