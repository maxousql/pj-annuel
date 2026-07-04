alter table public.users
  add column if not exists onboarding_completed_at timestamptz;

create index if not exists users_onboarding_completed_at_idx
  on public.users (onboarding_completed_at);
