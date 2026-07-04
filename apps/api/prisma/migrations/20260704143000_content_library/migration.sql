create table if not exists public.content_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_categories_name_not_empty_chk check (length(trim(name)) > 0),
  constraint content_categories_slug_format_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists content_categories_organization_id_slug_key
  on public.content_categories (organization_id, slug);
create index if not exists content_categories_organization_id_idx
  on public.content_categories (organization_id);

alter table public.content_items
  add column if not exists category_id uuid references public.content_categories(id) on delete set null,
  add column if not exists archived_at timestamptz;

create index if not exists content_items_organization_id_category_id_idx
  on public.content_items (organization_id, category_id);
create index if not exists content_items_organization_id_published_at_idx
  on public.content_items (organization_id, published_at);
create index if not exists content_items_organization_id_archived_at_idx
  on public.content_items (organization_id, archived_at);

alter table public.content_categories enable row level security;
revoke all on table public.content_categories from anon, authenticated;
grant select, insert, update, delete on table public.content_categories to service_role;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'content_categories_set_updated_at'
      and tgrelid = 'public.content_categories'::regclass
  ) then
    create trigger content_categories_set_updated_at
      before update on public.content_categories
      for each row execute function public.set_updated_at();
  end if;
end $$;

comment on table public.content_categories is 'Organization-scoped flat content categories for the V1 content library.';
