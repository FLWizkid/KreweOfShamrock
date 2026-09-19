-- ============================================================
-- Krewe of Shamrock — Document Library (Phase 1 backend)
-- Plan: DOCUMENT_LIBRARY_PLAN.md
-- Applied as migration: kos_document_library
--
-- Creates:
--   * documents               — library metadata (files or in-repo pages)
--   * document_discoveries    — one row per member per found easter egg
--   * discover_document(slug) — member RPC: record a find, award +10 Clovers once
--   * officer_upsert_document / officer_set_document_published /
--     officer_delete_document — officer management RPCs
--   * krewe-documents         — PRIVATE storage bucket (signed URLs only)
--   * Seeds: 5 governing documents (published) + 3 surprise documents
--     (unpublished until the eggs go live in Phase 5)
--
-- Decisions honored (2026-09-19): NO download logging of any kind;
-- +10 Clovers on first discovery; categories governing/calendars/forms/
-- newsletters/fun/general.
-- ============================================================

-- ---------- 1. documents ----------
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  category      text not null default 'general'
                constraint documents_category_check
                check (category in ('governing','calendars','forms','newsletters','fun','general')),
  storage_path  text,          -- path inside the krewe-documents bucket
  page_url      text,          -- OR a site-relative page like /assets/docs/bylaws.html
  file_type     text,          -- 'pdf' | 'html' | 'docx' | 'image'
  file_size     bigint,
  is_published  boolean not null default false,
  is_surprise   boolean not null default false,
  surprise_slug text unique,
  sort_order    int not null default 100,
  uploaded_by   uuid references public.members(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- exactly one source: an uploaded file OR an in-repo page
  constraint documents_one_source_check
    check (((storage_path is not null)::int + (page_url is not null)::int) = 1),
  -- a surprise must have a slug to be discoverable
  constraint documents_surprise_slug_check
    check ((not is_surprise) or (surprise_slug is not null)),
  -- page URLs stay on this site
  constraint documents_page_url_shape_check
    check (page_url is null or page_url like '/%')
);

create or replace function public.kos_documents_set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
  before update on public.documents
  for each row execute function public.kos_documents_set_updated_at();

alter table public.documents enable row level security;
-- (The read policy is created below, after document_discoveries exists,
--  because the policy's USING clause refers to that table.)
-- No direct insert/update/delete policies: all writes go through the
-- officer RPCs below (matches the 2026-09-08 hardening posture).

-- ---------- 2. document_discoveries ----------
create table if not exists public.document_discoveries (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  found_at    timestamptz not null default now(),
  -- one find per member per document: this is what makes the
  -- +10 Clover award impossible to farm
  constraint document_discoveries_once unique (document_id, member_id)
);

alter table public.document_discoveries enable row level security;

drop policy if exists document_discoveries_member_read on public.document_discoveries;
create policy document_discoveries_member_read on public.document_discoveries
  for select to authenticated
  using (member_id = public.kos_current_member_id() or public.is_krewe_officer());
-- Inserts happen only inside discover_document (SECURITY DEFINER).

-- Members read published shelf documents, plus surprises they personally found.
-- Officers read everything (drafts and undiscovered surprises included).
drop policy if exists documents_member_read on public.documents;
create policy documents_member_read on public.documents
  for select to authenticated
  using (
    public.is_krewe_officer()
    or (is_published and not is_surprise)
    or (is_published and is_surprise and exists (
          select 1 from public.document_discoveries dd
          where dd.document_id = documents.id
            and dd.member_id = public.kos_current_member_id()))
  );

-- ---------- 3. discover_document ----------
create or replace function public.discover_document(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid;
  v_doc    public.documents%rowtype;
  v_new    boolean := false;
begin
  v_member := public.kos_current_member_id();
  if v_member is null then
    return jsonb_build_object('ok', false, 'error', 'not_linked');
  end if;

  select * into v_doc
  from public.documents
  where surprise_slug = lower(trim(p_slug))
    and is_surprise
    and is_published;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  insert into public.document_discoveries (document_id, member_id)
  values (v_doc.id, v_member)
  on conflict (document_id, member_id) do nothing;
  v_new := found;

  if v_new then
    insert into public.clover_ledger (member_id, clovers, reason, notes)
    values (v_member, 10, 'easter_egg', 'Found hidden document: ' || v_doc.title);
  end if;

  return jsonb_build_object(
    'ok', true,
    'newly_found', v_new,
    'clovers_awarded', case when v_new then 10 else 0 end,
    'document', jsonb_build_object(
      'id', v_doc.id, 'title', v_doc.title, 'description', v_doc.description,
      'category', v_doc.category, 'page_url', v_doc.page_url,
      'storage_path', v_doc.storage_path, 'file_type', v_doc.file_type));
end $$;

revoke execute on function public.discover_document(text) from public, anon;
grant execute on function public.discover_document(text) to authenticated;

-- ---------- 4. Officer RPCs ----------
create or replace function public.officer_upsert_document(
  p_id            uuid default null,
  p_title         text default null,
  p_description   text default null,
  p_category      text default 'general',
  p_storage_path  text default null,
  p_page_url      text default null,
  p_file_type     text default null,
  p_file_size     bigint default null,
  p_is_surprise   boolean default false,
  p_surprise_slug text default null,
  p_sort_order    int default 100
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   uuid;
  v_slug text;
begin
  if not public.is_krewe_officer() then
    return jsonb_build_object('ok', false, 'error', 'not_officer');
  end if;
  if p_title is null or length(trim(p_title)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'title_required');
  end if;
  if p_is_surprise then
    v_slug := lower(trim(coalesce(p_surprise_slug, '')));
    if v_slug !~ '^[a-z0-9][a-z0-9-]{2,39}$' then
      return jsonb_build_object('ok', false, 'error', 'bad_slug');
    end if;
  else
    v_slug := null;
  end if;

  if p_id is null then
    insert into public.documents
      (title, description, category, storage_path, page_url, file_type,
       file_size, is_surprise, surprise_slug, sort_order, uploaded_by)
    values
      (trim(p_title), p_description, p_category, p_storage_path, p_page_url,
       p_file_type, p_file_size, p_is_surprise, v_slug, p_sort_order,
       public.kos_current_member_id())
    returning id into v_id;
  else
    update public.documents set
      title = trim(p_title), description = p_description, category = p_category,
      storage_path = p_storage_path, page_url = p_page_url,
      file_type = p_file_type, file_size = p_file_size,
      is_surprise = p_is_surprise, surprise_slug = v_slug,
      sort_order = p_sort_order
    where id = p_id
    returning id into v_id;
    if v_id is null then
      return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.officer_set_document_published(
  p_id uuid, p_published boolean
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_krewe_officer() then
    return jsonb_build_object('ok', false, 'error', 'not_officer');
  end if;
  update public.documents set is_published = p_published
  where id = p_id returning id into v_id;
  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'is_published', p_published);
end $$;

-- Deletes the metadata row; the Document Studio (Phase 3) removes the
-- bucket file itself. Prefer unpublishing over deleting.
create or replace function public.officer_delete_document(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_krewe_officer() then
    return jsonb_build_object('ok', false, 'error', 'not_officer');
  end if;
  delete from public.documents where id = p_id returning id into v_id;
  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

revoke execute on function public.officer_upsert_document(uuid,text,text,text,text,text,text,bigint,boolean,text,int) from public, anon;
grant  execute on function public.officer_upsert_document(uuid,text,text,text,text,text,text,bigint,boolean,text,int) to authenticated;
revoke execute on function public.officer_set_document_published(uuid,boolean) from public, anon;
grant  execute on function public.officer_set_document_published(uuid,boolean) to authenticated;
revoke execute on function public.officer_delete_document(uuid) from public, anon;
grant  execute on function public.officer_delete_document(uuid) to authenticated;

-- ---------- 5. Private storage bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('krewe-documents', 'krewe-documents', false, 20971520,
        array['application/pdf',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Any signed-in member may read (signed URLs require this); only officers write.
drop policy if exists "krewe documents member read" on storage.objects;
create policy "krewe documents member read" on storage.objects
  for select to authenticated
  using (bucket_id = 'krewe-documents');

drop policy if exists "krewe documents officer insert" on storage.objects;
create policy "krewe documents officer insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'krewe-documents' and public.is_krewe_officer());

drop policy if exists "krewe documents officer update" on storage.objects;
create policy "krewe documents officer update" on storage.objects
  for update to authenticated
  using (bucket_id = 'krewe-documents' and public.is_krewe_officer())
  with check (bucket_id = 'krewe-documents' and public.is_krewe_officer());

drop policy if exists "krewe documents officer delete" on storage.objects;
create policy "krewe documents officer delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'krewe-documents' and public.is_krewe_officer());

-- ---------- 6. Seed rows ----------
-- Five governing documents already on the site (published).
insert into public.documents (title, description, category, page_url, file_type, is_published, sort_order)
select v.title, v.description, 'governing', v.page_url, 'html', true, v.sort_order
from (values
  ('Official Bylaws',
   'The governing document of the Krewe of Shamrock, Inc. Adopted 2000, amended 2025.',
   '/assets/docs/bylaws.html', 10),
  ('Code of Conduct',
   'The standard every member upholds — the creed behind the craic.',
   '/assets/docs/code-of-conduct.html', 20),
  ('Parade Rules',
   'How we march safely: krewe practices and the organizers'' rules.',
   '/assets/docs/parade-rules.html', 30),
  ('Dues & Leave of Absence',
   'Membership dues and how a leave of absence works.',
   '/assets/docs/dues-and-loa.html', 40),
  ('Liability Waiver',
   'The season liability waiver every marching member signs.',
   '/assets/docs/liability-waiver.html', 50)
) as v(title, description, page_url, sort_order)
where not exists (select 1 from public.documents d where d.page_url = v.page_url);

-- Three surprise documents (UNPUBLISHED until the eggs go live in Phase 5).
insert into public.documents (title, description, category, page_url, file_type,
                              is_published, is_surprise, surprise_slug, sort_order)
select v.title, v.description, 'fun', v.page_url, 'html', false, true, v.slug, v.sort_order
from (values
  ('Tampa Bay Parade Calendar',
   'Every parade on the Inter-Krewe Council calendar, on one printable page.',
   '/assets/docs/tampa-bay-parades.html', 'tampa-parades', 10),
  ('Shamrock Lore',
   'The founding tale, the secrets in the tartan, and a trivia quiz.',
   '/assets/docs/shamrock-lore.html', 'shamrock-lore', 20),
  ('Irish Blessing Card',
   'A printable 5×7 blessing card — Céad Míle Fáilte.',
   '/assets/docs/irish-blessing-card.html', 'irish-blessing', 30)
) as v(title, description, page_url, slug, sort_order)
where not exists (select 1 from public.documents d where d.page_url = v.page_url);
