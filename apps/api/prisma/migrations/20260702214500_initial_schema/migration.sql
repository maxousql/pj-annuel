create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'auth_provider'
  ) then
    create type public.auth_provider as enum ('CREDENTIALS', 'GOOGLE');
  end if;

  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'organization_role'
  ) then
    create type public.organization_role as enum ('ADMIN', 'EDITOR', 'READER');
  end if;

  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'membership_status'
  ) then
    create type public.membership_status as enum ('ACTIVE', 'PENDING', 'DISABLED');
  end if;

  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'invitation_status'
  ) then
    create type public.invitation_status as enum ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
  end if;

  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'content_format'
  ) then
    create type public.content_format as enum ('BLOG_ARTICLE', 'LINKEDIN_POST', 'SOCIAL_POST', 'EMAIL', 'HOOK', 'THREAD', 'OTHER');
  end if;

  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'content_idea_status'
  ) then
    create type public.content_idea_status as enum ('DRAFT', 'SAVED', 'DISMISSED', 'USED', 'ARCHIVED');
  end if;

  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'content_item_status'
  ) then
    create type public.content_item_status as enum ('DRAFT', 'REVIEW', 'READY', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED', 'DELETED');
  end if;

  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'content_source'
  ) then
    create type public.content_source as enum ('AI_GENERATED', 'USER_CREATED', 'CURATED_RESOURCE', 'IMPORTED', 'NOTION');
  end if;

  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'resource_type'
  ) then
    create type public.resource_type as enum ('URL', 'RSS', 'MANUAL', 'NOTION');
  end if;

  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'resource_status'
  ) then
    create type public.resource_status as enum ('NEW', 'SUMMARIZED', 'USED', 'ARCHIVED');
  end if;

  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'publication_channel'
  ) then
    create type public.publication_channel as enum ('LINKEDIN', 'BLOG', 'EMAIL', 'X', 'FACEBOOK', 'INSTAGRAM', 'OTHER');
  end if;

  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'publication_status'
  ) then
    create type public.publication_status as enum ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'CANCELLED');
  end if;

  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'integration_provider'
  ) then
    create type public.integration_provider as enum ('NOTION', 'GOOGLE', 'RSS', 'OTHER');
  end if;

  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'integration_status'
  ) then
    create type public.integration_status as enum ('ACTIVE', 'DISABLED', 'ERROR');
  end if;

  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'ai_generation_type'
  ) then
    create type public.ai_generation_type as enum ('IDEA', 'CONTENT', 'SUMMARY', 'DUPLICATE_CHECK', 'EDITORIAL_CONTEXT');
  end if;

  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace and typname = 'ai_generation_status'
  ) then
    create type public.ai_generation_status as enum ('SUCCEEDED', 'FAILED');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

create table if not exists public.users (
  id uuid primary key default extensions.gen_random_uuid(),
  email text not null,
  name text not null,
  avatar_url text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint users_email_normalized_chk check (email = lower(trim(email))),
  constraint users_email_not_empty_chk check (length(email) > 3),
  constraint users_name_not_empty_chk check (length(trim(name)) > 0)
);

create unique index if not exists users_email_key on public.users (email);
create index if not exists users_created_at_idx on public.users (created_at);

create table if not exists public.auth_accounts (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider public.auth_provider not null,
  provider_account_id text not null,
  password_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auth_accounts_provider_account_not_empty_chk check (length(trim(provider_account_id)) > 0)
);

create unique index if not exists auth_accounts_provider_provider_account_id_key
  on public.auth_accounts (provider, provider_account_id);
create index if not exists auth_accounts_user_id_idx on public.auth_accounts (user_id);

create table if not exists public.organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  slug text not null,
  owner_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint organizations_name_not_empty_chk check (length(trim(name)) > 0),
  constraint organizations_slug_format_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists organizations_slug_key on public.organizations (slug);
create index if not exists organizations_owner_id_idx on public.organizations (owner_id);

create table if not exists public.memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.organization_role not null default 'READER',
  status public.membership_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists memberships_user_id_organization_id_key
  on public.memberships (user_id, organization_id);
create index if not exists memberships_organization_id_status_idx
  on public.memberships (organization_id, status);
create index if not exists memberships_organization_id_role_idx
  on public.memberships (organization_id, role);

create table if not exists public.invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.organization_role not null default 'READER',
  token_hash text not null,
  expires_at timestamptz not null,
  status public.invitation_status not null default 'PENDING',
  invited_by_id uuid references public.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_email_normalized_chk check (email = lower(trim(email))),
  constraint invitations_email_not_empty_chk check (length(email) > 3),
  constraint invitations_token_hash_not_empty_chk check (length(trim(token_hash)) > 0)
);

create unique index if not exists invitations_token_hash_key on public.invitations (token_hash);
create unique index if not exists invitations_organization_id_email_key
  on public.invitations (organization_id, email);
create index if not exists invitations_organization_id_status_idx
  on public.invitations (organization_id, status);
create index if not exists invitations_expires_at_idx on public.invitations (expires_at);

create table if not exists public.editorial_contexts (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sector text not null,
  target_audience text not null,
  tone text not null,
  positioning text not null,
  themes text[] not null default '{}'::text[],
  resource_notes text,
  created_by_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint editorial_contexts_sector_not_empty_chk check (length(trim(sector)) > 0),
  constraint editorial_contexts_target_audience_not_empty_chk check (length(trim(target_audience)) > 0),
  constraint editorial_contexts_tone_not_empty_chk check (length(trim(tone)) > 0),
  constraint editorial_contexts_positioning_not_empty_chk check (length(trim(positioning)) > 0)
);

create unique index if not exists editorial_contexts_organization_id_key
  on public.editorial_contexts (organization_id);

create table if not exists public.content_ideas (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  angle text not null,
  recommended_format public.content_format not null,
  justification text not null,
  category text,
  status public.content_idea_status not null default 'DRAFT',
  created_by_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint content_ideas_title_not_empty_chk check (length(trim(title)) > 0),
  constraint content_ideas_angle_not_empty_chk check (length(trim(angle)) > 0)
);

create index if not exists content_ideas_organization_id_status_idx
  on public.content_ideas (organization_id, status);
create index if not exists content_ideas_organization_id_created_at_idx
  on public.content_ideas (organization_id, created_at);
create index if not exists content_ideas_organization_id_recommended_format_idx
  on public.content_ideas (organization_id, recommended_format);

create table if not exists public.content_items (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  idea_id uuid references public.content_ideas(id) on delete set null,
  title text not null,
  body text not null default '',
  format public.content_format not null,
  status public.content_item_status not null default 'DRAFT',
  source public.content_source not null default 'AI_GENERATED',
  created_by_id uuid references public.users(id) on delete set null,
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_items_title_not_empty_chk check (length(trim(title)) > 0)
);

create index if not exists content_items_organization_id_status_idx
  on public.content_items (organization_id, status);
create index if not exists content_items_organization_id_created_at_idx
  on public.content_items (organization_id, created_at);
create index if not exists content_items_organization_id_format_idx
  on public.content_items (organization_id, format);
create index if not exists content_items_organization_id_source_idx
  on public.content_items (organization_id, source);

create table if not exists public.tags (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_name_not_empty_chk check (length(trim(name)) > 0),
  constraint tags_slug_format_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists tags_organization_id_slug_key
  on public.tags (organization_id, slug);
create index if not exists tags_organization_id_idx on public.tags (organization_id);

create table if not exists public.content_tags (
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (content_item_id, tag_id)
);

create index if not exists content_tags_organization_id_idx
  on public.content_tags (organization_id);
create index if not exists content_tags_tag_id_idx on public.content_tags (tag_id);

create table if not exists public.curated_resources (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  url text not null,
  title text not null,
  summary text,
  source text,
  topic text,
  type public.resource_type not null default 'URL',
  status public.resource_status not null default 'NEW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curated_resources_url_not_empty_chk check (length(trim(url)) > 0),
  constraint curated_resources_title_not_empty_chk check (length(trim(title)) > 0)
);

create unique index if not exists curated_resources_organization_id_url_key
  on public.curated_resources (organization_id, url);
create index if not exists curated_resources_organization_id_status_idx
  on public.curated_resources (organization_id, status);
create index if not exists curated_resources_organization_id_type_idx
  on public.curated_resources (organization_id, type);
create index if not exists curated_resources_organization_id_created_at_idx
  on public.curated_resources (organization_id, created_at);

create table if not exists public.publication_plans (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  channel public.publication_channel not null,
  publication_date timestamptz not null,
  status public.publication_status not null default 'DRAFT',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists publication_plans_organization_id_publication_date_idx
  on public.publication_plans (organization_id, publication_date);
create index if not exists publication_plans_organization_id_status_idx
  on public.publication_plans (organization_id, status);
create index if not exists publication_plans_organization_id_channel_idx
  on public.publication_plans (organization_id, channel);

create table if not exists public.integration_credentials (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider public.integration_provider not null,
  encrypted_metadata text not null,
  encryption_key_ref text,
  status public.integration_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_credentials_encrypted_metadata_not_empty_chk
    check (length(trim(encrypted_metadata)) > 0)
);

create unique index if not exists integration_credentials_organization_id_provider_key
  on public.integration_credentials (organization_id, provider);
create index if not exists integration_credentials_organization_id_status_idx
  on public.integration_credentials (organization_id, status);

create table if not exists public.ai_generation_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  type public.ai_generation_type not null,
  prompt_metadata jsonb not null default '{}'::jsonb,
  model text not null,
  estimated_cost_cents integer,
  status public.ai_generation_status not null default 'SUCCEEDED',
  result_content_idea_id uuid references public.content_ideas(id) on delete set null,
  result_content_item_id uuid references public.content_items(id) on delete set null,
  result_resource_id uuid references public.curated_resources(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  constraint ai_generation_logs_model_not_empty_chk check (length(trim(model)) > 0),
  constraint ai_generation_logs_estimated_cost_cents_positive_chk
    check (estimated_cost_cents is null or estimated_cost_cents >= 0)
);

create index if not exists ai_generation_logs_organization_id_type_idx
  on public.ai_generation_logs (organization_id, type);
create index if not exists ai_generation_logs_organization_id_created_at_idx
  on public.ai_generation_logs (organization_id, created_at);
create index if not exists ai_generation_logs_organization_id_model_idx
  on public.ai_generation_logs (organization_id, model);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'users',
    'auth_accounts',
    'organizations',
    'memberships',
    'invitations',
    'editorial_contexts',
    'content_ideas',
    'content_items',
    'tags',
    'content_tags',
    'curated_resources',
    'publication_plans',
    'integration_credentials',
    'ai_generation_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);

    execute format(
      'revoke all on table public.%I from anon, authenticated',
      table_name
    );

    execute format(
      'grant select, insert, update, delete on table public.%I to service_role',
      table_name
    );
  end loop;
end $$;

do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'users',
    'auth_accounts',
    'organizations',
    'memberships',
    'invitations',
    'editorial_contexts',
    'content_ideas',
    'content_items',
    'tags',
    'curated_resources',
    'publication_plans',
    'integration_credentials'
  ] loop
    trigger_name := table_name || '_set_updated_at';

    if not exists (
      select 1 from pg_trigger
      where tgname = trigger_name
        and tgrelid = format('public.%I', table_name)::regclass
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
        trigger_name,
        table_name
      );
    end if;
  end loop;
end $$;

comment on table public.organizations is 'SaaS tenant. All business tables are scoped by organization_id.';
comment on table public.content_items is 'Generated or user-authored content. Soft deletion uses deleted_at/status instead of destructive deletion.';
comment on column public.integration_credentials.encrypted_metadata is 'Application-encrypted integration metadata. Never store provider tokens in plaintext.';
