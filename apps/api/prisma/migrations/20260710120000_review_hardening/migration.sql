alter table public.source_feeds
  add column if not exists failure_count integer not null default 0;

alter table public.source_feeds
  drop constraint if exists source_feeds_failure_count_chk;
alter table public.source_feeds
  add constraint source_feeds_failure_count_chk check (failure_count >= 0);

alter table public.scheduled_job_runs
  add column if not exists lease_expires_at timestamptz;

update public.scheduled_job_runs
set lease_expires_at = coalesce(finished_at, started_at) + interval '5 minutes'
where lease_expires_at is null;

alter table public.scheduled_job_runs
  alter column lease_expires_at set not null;

with ranked as (
  select id,
    row_number() over (
      partition by job_key
      order by started_at desc, id
    ) as running_rank
  from public.scheduled_job_runs
  where status = 'RUNNING'
)
update public.scheduled_job_runs as run
set status = 'FAILED',
    finished_at = now(),
    error = 'Superseded during lease migration'
from ranked
where run.id = ranked.id
  and ranked.running_rank > 1;

create unique index if not exists scheduled_job_runs_one_active_key
  on public.scheduled_job_runs (job_key)
  where status = 'RUNNING';

drop index if exists public.recommendations_idempotency_key;
drop index if exists public.recommendations_organization_id_type_target_type_target_id_status_key;

with ranked as (
  select id,
    row_number() over (
      partition by organization_id, type, target_type, target_id
      order by
        case status
          when 'DISMISSED' then 0
          when 'APPLIED' then 1
          else 2
        end,
        updated_at desc,
        created_at desc,
        id
    ) as duplicate_rank
  from public.recommendations
  where target_id is not null
)
delete from public.recommendations as recommendation
using ranked
where recommendation.id = ranked.id
  and ranked.duplicate_rank > 1;

create unique index if not exists recommendations_organization_id_type_target_type_target_id_key
  on public.recommendations (organization_id, type, target_type, target_id);

update public.ai_quality_evaluations as evaluation
set created_by_id = null
where created_by_id is not null
  and not exists (
    select 1 from public.users as app_user
    where app_user.id = evaluation.created_by_id
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_quality_evaluations_created_by_id_fkey'
      and conrelid = 'public.ai_quality_evaluations'::regclass
  ) then
    alter table public.ai_quality_evaluations
      add constraint ai_quality_evaluations_created_by_id_fkey
      foreign key (created_by_id) references public.users(id) on delete set null;
  end if;
end $$;

comment on column public.source_feeds.failure_count is
  'Consecutive RSS failures used for bounded retry backoff.';
comment on column public.scheduled_job_runs.lease_expires_at is
  'Renewable cross-instance lease deadline for active scheduled jobs.';
