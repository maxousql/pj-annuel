do $$
begin
  create type public.source_feed_status as enum ('ACTIVE', 'PAUSED', 'ERROR');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.automation_rule_type as enum ('PUBLICATION_REMINDER', 'EDITORIAL_RECOMMENDATION');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.automation_rule_status as enum ('ACTIVE', 'PAUSED');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.reminder_status as enum ('PENDING', 'SENT', 'CANCELLED');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.recommendation_status as enum ('OPEN', 'DISMISSED', 'APPLIED');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_status as enum ('UNREAD', 'READ');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.source_feeds (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  url text not null,
  title text not null,
  status public.source_feed_status not null default 'ACTIVE',
  last_fetched_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_feeds_url_not_empty_chk check (length(trim(url)) > 0),
  constraint source_feeds_title_not_empty_chk check (length(trim(title)) > 0)
);

create unique index if not exists source_feeds_organization_id_url_key
  on public.source_feeds (organization_id, url);
create index if not exists source_feeds_organization_id_status_idx
  on public.source_feeds (organization_id, status);

alter table public.curated_resources
  add column if not exists source_feed_id uuid references public.source_feeds(id) on delete set null,
  add column if not exists description text,
  add column if not exists key_points text[] not null default '{}',
  add column if not exists source_name text,
  add column if not exists published_at timestamptz;

create index if not exists curated_resources_organization_id_source_feed_id_idx
  on public.curated_resources (organization_id, source_feed_id);

create table if not exists public.resource_tags (
  resource_id uuid not null references public.curated_resources(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (resource_id, tag_id)
);

create index if not exists resource_tags_organization_id_idx
  on public.resource_tags (organization_id);
create index if not exists resource_tags_tag_id_idx
  on public.resource_tags (tag_id);

create table if not exists public.brand_voice_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  language text not null default 'fr',
  tone_rules text not null default '',
  examples text[] not null default '{}',
  forbidden_terms text[] not null default '{}',
  creativity integer not null default 2,
  target_length text not null default 'standard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_voice_profiles_creativity_chk check (creativity between 1 and 5),
  constraint brand_voice_profiles_language_not_empty_chk check (length(trim(language)) > 0)
);

create table if not exists public.onboarding_progress (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  current_step text not null default 'CHECKLIST',
  completed_steps text[] not null default '{}',
  skipped_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists onboarding_progress_user_id_organization_id_key
  on public.onboarding_progress (user_id, organization_id);
create index if not exists onboarding_progress_organization_id_idx
  on public.onboarding_progress (organization_id);

create table if not exists public.automation_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type public.automation_rule_type not null,
  status public.automation_rule_status not null default 'ACTIVE',
  parameters jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists automation_rules_organization_id_type_key
  on public.automation_rules (organization_id, type);
create index if not exists automation_rules_organization_id_status_idx
  on public.automation_rules (organization_id, status);

create table if not exists public.reminders (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  publication_plan_id uuid not null references public.publication_plans(id) on delete cascade,
  trigger_at timestamptz not null,
  status public.reminder_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists reminders_organization_id_publication_plan_id_trigger_at_key
  on public.reminders (organization_id, publication_plan_id, trigger_at);
create index if not exists reminders_organization_id_status_idx
  on public.reminders (organization_id, status);
create index if not exists reminders_trigger_at_idx
  on public.reminders (trigger_at);

create table if not exists public.recommendations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null,
  message text not null,
  target_type text,
  target_id uuid,
  status public.recommendation_status not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recommendations_type_not_empty_chk check (length(trim(type)) > 0),
  constraint recommendations_message_not_empty_chk check (length(trim(message)) > 0)
);

create index if not exists recommendations_organization_id_status_idx
  on public.recommendations (organization_id, status);
create index if not exists recommendations_organization_id_type_idx
  on public.recommendations (organization_id, type);

create table if not exists public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reminder_id uuid references public.reminders(id) on delete set null,
  title text not null,
  body text not null,
  status public.notification_status not null default 'UNREAD',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_title_not_empty_chk check (length(trim(title)) > 0),
  constraint notifications_body_not_empty_chk check (length(trim(body)) > 0)
);

create index if not exists notifications_user_id_status_idx
  on public.notifications (user_id, status);
create index if not exists notifications_organization_id_created_at_idx
  on public.notifications (organization_id, created_at);
create unique index if not exists notifications_reminder_id_user_id_key
  on public.notifications (reminder_id, user_id)
  where reminder_id is not null;

create table if not exists public.notification_preferences (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists notification_preferences_user_id_organization_id_key
  on public.notification_preferences (user_id, organization_id);
create index if not exists notification_preferences_organization_id_idx
  on public.notification_preferences (organization_id);

alter table public.source_feeds enable row level security;
alter table public.resource_tags enable row level security;
alter table public.brand_voice_profiles enable row level security;
alter table public.onboarding_progress enable row level security;
alter table public.automation_rules enable row level security;
alter table public.reminders enable row level security;
alter table public.recommendations enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

revoke all on table public.source_feeds, public.resource_tags, public.brand_voice_profiles,
  public.onboarding_progress, public.automation_rules, public.reminders,
  public.recommendations, public.notifications, public.notification_preferences
  from anon, authenticated;

grant select, insert, update, delete on table public.source_feeds, public.resource_tags,
  public.brand_voice_profiles, public.onboarding_progress, public.automation_rules,
  public.reminders, public.recommendations, public.notifications,
  public.notification_preferences
  to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'source_feeds',
    'brand_voice_profiles',
    'onboarding_progress',
    'automation_rules',
    'reminders',
    'recommendations',
    'notification_preferences'
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

comment on table public.source_feeds is 'Organization-scoped RSS sources for V2 curation imports.';
comment on table public.brand_voice_profiles is 'Organization-level AI generation language, tone and prompt preference profile.';
comment on table public.automation_rules is 'Opt-in deterministic marketing automation rules.';
comment on table public.notifications is 'In-app notifications generated by V2 automations.';
