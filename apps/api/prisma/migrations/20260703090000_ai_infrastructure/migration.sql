alter type public.ai_generation_type add value if not exists 'CONTENT_IDEA';
alter type public.ai_generation_type add value if not exists 'CONTENT_DRAFT';
alter type public.ai_generation_type add value if not exists 'RESOURCE_SUMMARY';

alter table public.ai_generation_logs
  add column if not exists prompt_version text,
  add column if not exists input_hash text,
  add column if not exists error_code text,
  add column if not exists result_id uuid;

update public.ai_generation_logs
set prompt_version = coalesce(prompt_version, prompt_metadata ->> 'promptVersion')
where prompt_version is null;

update public.ai_generation_logs
set input_hash = coalesce(input_hash, prompt_metadata ->> 'inputHash')
where input_hash is null;

alter table public.ai_generation_logs
  alter column prompt_version set default 'legacy',
  alter column prompt_version set not null,
  alter column input_hash set default 'unknown',
  alter column input_hash set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_generation_logs_prompt_version_not_blank'
      and conrelid = 'public.ai_generation_logs'::regclass
  ) then
    alter table public.ai_generation_logs
      add constraint ai_generation_logs_prompt_version_not_blank
      check (length(trim(prompt_version)) > 0) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_generation_logs_input_hash_not_blank'
      and conrelid = 'public.ai_generation_logs'::regclass
  ) then
    alter table public.ai_generation_logs
      add constraint ai_generation_logs_input_hash_not_blank
      check (length(trim(input_hash)) > 0) not valid;
  end if;
end $$;

alter table public.ai_generation_logs
  validate constraint ai_generation_logs_prompt_version_not_blank;

alter table public.ai_generation_logs
  validate constraint ai_generation_logs_input_hash_not_blank;

create index if not exists ai_generation_logs_organization_input_hash_idx
  on public.ai_generation_logs (organization_id, input_hash);

create index if not exists ai_generation_logs_prompt_version_idx
  on public.ai_generation_logs (prompt_version);

create index if not exists ai_generation_logs_user_id_idx
  on public.ai_generation_logs (user_id);

create index if not exists ai_generation_logs_result_content_idea_id_idx
  on public.ai_generation_logs (result_content_idea_id);

create index if not exists ai_generation_logs_result_content_item_id_idx
  on public.ai_generation_logs (result_content_item_id);

create index if not exists ai_generation_logs_result_resource_id_idx
  on public.ai_generation_logs (result_resource_id);
