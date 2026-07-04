alter table public.content_items
  add column if not exists brief text,
  add column if not exists topic text,
  add column if not exists duplicate_score double precision;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'content_items_duplicate_score_range_chk'
      and conrelid = 'public.content_items'::regclass
  ) then
    alter table public.content_items
      add constraint content_items_duplicate_score_range_chk
      check (
        duplicate_score is null
        or (duplicate_score >= 0 and duplicate_score <= 1)
      )
      not valid;
  end if;
end $$;

alter table public.content_items
  validate constraint content_items_duplicate_score_range_chk;

create index if not exists content_items_organization_id_duplicate_score_idx
  on public.content_items (organization_id, duplicate_score);
