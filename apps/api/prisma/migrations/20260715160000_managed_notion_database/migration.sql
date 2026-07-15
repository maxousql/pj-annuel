alter table public.notion_database_mappings
  add column if not exists data_source_id text,
  add column if not exists parent_page_id text,
  add column if not exists database_url text,
  add column if not exists managed boolean not null default false,
  add column if not exists managed_marker text,
  add column if not exists schema_version integer not null default 1,
  add column if not exists schema_status text not null default 'UNCHECKED',
  add column if not exists schema_issues jsonb not null default '[]'::jsonb,
  add column if not exists last_schema_check_at timestamptz,
  add column if not exists property_id_mapping jsonb not null default '{}'::jsonb;

alter table public.notion_database_mappings
  drop constraint if exists notion_database_mappings_schema_version_chk;
alter table public.notion_database_mappings
  add constraint notion_database_mappings_schema_version_chk
  check (schema_version >= 1);

alter table public.notion_database_mappings
  drop constraint if exists notion_database_mappings_schema_status_chk;
alter table public.notion_database_mappings
  add constraint notion_database_mappings_schema_status_chk
  check (schema_status in ('UNCHECKED', 'PROVISIONING', 'READY', 'DRIFTED', 'UNAVAILABLE'));

alter table public.notion_database_mappings
  drop constraint if exists notion_database_mappings_schema_issues_chk;
alter table public.notion_database_mappings
  add constraint notion_database_mappings_schema_issues_chk
  check (jsonb_typeof(schema_issues) = 'array');

create unique index if not exists notion_database_mappings_managed_marker_key
  on public.notion_database_mappings (managed_marker)
  where managed_marker is not null;

create table if not exists public.notion_provisioning_leases (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  lease_token uuid not null,
  lease_expires_at timestamptz not null,
  marker text not null,
  parent_page_id text not null,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notion_provisioning_leases_lease_expires_at_idx
  on public.notion_provisioning_leases (lease_expires_at);

alter table public.notion_provisioning_leases enable row level security;

revoke all on table public.notion_provisioning_leases from anon, authenticated;
grant select, insert, update, delete on table public.notion_provisioning_leases to service_role;

comment on column public.notion_database_mappings.data_source_id is
  'Notion data source containing synchronized page rows; backfilled lazily for legacy mappings.';
comment on column public.notion_database_mappings.property_id_mapping is
  'Stable logical-field to Notion property-ID mapping, independent of user-visible column names.';
comment on column public.notion_database_mappings.schema_issues is
  'Last detected Notion schema issues, retained so repair remains actionable after a page reload.';
comment on table public.notion_provisioning_leases is
  'Cross-instance lease for managed Notion provisioning; no SQL transaction remains open during provider calls.';
