do $$
begin
  create type public.idea_discovery_signal as enum ('LIKE', 'DISLIKE', 'SKIP');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.idea_discovery_rejection_reason as enum (
    'OFF_TOPIC',
    'ALREADY_COVERED',
    'WRONG_FORMAT',
    'TOO_GENERIC',
    'NOT_NOW'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.idea_discovery_candidates (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generated_by_id uuid references public.users(id) on delete set null,
  title text not null,
  angle text not null,
  recommended_format public.content_format not null,
  justification text not null,
  category text,
  fingerprint text not null,
  is_exploratory boolean not null default false,
  prompt_version text not null,
  duplicate_warning boolean not null default false,
  duplicate_score double precision not null default 0,
  duplicate_source text,
  duplicate_matched_id uuid,
  duplicate_matched_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint idea_discovery_candidates_duplicate_score_chk
    check (duplicate_score >= 0 and duplicate_score <= 1),
  constraint idea_discovery_candidates_duplicate_source_chk
    check (duplicate_source is null or duplicate_source in ('CONTENT_IDEA', 'CONTENT_ITEM'))
);

create unique index if not exists idea_discovery_candidates_organization_fingerprint_key
  on public.idea_discovery_candidates (organization_id, fingerprint);
create unique index if not exists idea_discovery_candidates_id_organization_key
  on public.idea_discovery_candidates (id, organization_id);
create index if not exists idea_discovery_candidates_organization_created_at_idx
  on public.idea_discovery_candidates (organization_id, created_at);
create index if not exists idea_discovery_candidates_generated_by_id_idx
  on public.idea_discovery_candidates (generated_by_id);

alter table public.content_ideas
  add column if not exists discovery_candidate_id uuid
  references public.idea_discovery_candidates(id) on delete set null;
create unique index if not exists content_ideas_discovery_candidate_id_key
  on public.content_ideas (discovery_candidate_id);
alter table public.content_ideas
  add constraint content_ideas_discovery_candidate_organization_fkey
  foreign key (discovery_candidate_id, organization_id)
  references public.idea_discovery_candidates(id, organization_id)
  on delete no action;

create table if not exists public.idea_discovery_feedbacks (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  candidate_id uuid not null references public.idea_discovery_candidates(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  signal public.idea_discovery_signal not null,
  reason public.idea_discovery_rejection_reason,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint idea_discovery_feedbacks_reason_chk check (
    reason is null or signal = 'DISLIKE'
  )
);

create unique index if not exists idea_discovery_feedbacks_user_candidate_key
  on public.idea_discovery_feedbacks (user_id, candidate_id);
create index if not exists idea_discovery_feedbacks_organization_created_at_idx
  on public.idea_discovery_feedbacks (organization_id, created_at);
create index if not exists idea_discovery_feedbacks_candidate_id_idx
  on public.idea_discovery_feedbacks (candidate_id);
alter table public.idea_discovery_feedbacks
  add constraint idea_discovery_feedbacks_candidate_organization_fkey
  foreign key (candidate_id, organization_id)
  references public.idea_discovery_candidates(id, organization_id)
  on delete cascade;

create table if not exists public.idea_preference_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  liked_count integer not null default 0,
  disliked_count integer not null default 0,
  theme_scores jsonb not null default '{}'::jsonb,
  format_scores jsonb not null default '{}'::jsonb,
  reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint idea_preference_profiles_counts_chk
    check (liked_count >= 0 and disliked_count >= 0),
  constraint idea_preference_profiles_theme_scores_chk
    check (jsonb_typeof(theme_scores) = 'object'),
  constraint idea_preference_profiles_format_scores_chk
    check (jsonb_typeof(format_scores) = 'object')
);

alter table public.idea_discovery_candidates enable row level security;
alter table public.idea_discovery_feedbacks enable row level security;
alter table public.idea_preference_profiles enable row level security;

revoke all on table public.idea_discovery_candidates from anon, authenticated;
revoke all on table public.idea_discovery_feedbacks from anon, authenticated;
revoke all on table public.idea_preference_profiles from anon, authenticated;

grant select, insert, update, delete on table public.idea_discovery_candidates to service_role;
grant select, insert, update, delete on table public.idea_discovery_feedbacks to service_role;
grant select, insert, update, delete on table public.idea_preference_profiles to service_role;

comment on table public.idea_discovery_candidates is
  'Temporary editorial suggestions. A ContentIdea is created only after an explicit LIKE.';
comment on table public.idea_discovery_feedbacks is
  'Organization-scoped explicit feedback; SKIP is retained but excluded from learning.';
comment on table public.idea_preference_profiles is
  'Explainable aggregate preference weights derived from qualified feedback after reset_at.';
