-- Krewe of Shamrock QR registry: every printed square in one table, with
-- anonymous scan counts and re-pointable destinations (QR_LIBRARY_BUILD_PLAN.md
-- Phase 2). Applied to oazwkwflgbthojvnclfc. Safe to run more than once.
--
-- Officer decision recorded 2026-09-18: scans are ANONYMOUS. qr_scans stores
-- only which code was scanned and when — never who scanned it, no member id,
-- no IP address, no browser details. Counts answer "is this flyer working?".
--
-- Flow: a printed square encodes go.html?c=SLUG → go.html calls resolve_qr →
-- one anonymous scan row is written → the visitor is redirected to target_url.
-- Officers can edit target_url later, so squares already printed keep working.

-- ========== TABLES ==========
create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  target_url text not null,
  purpose text not null default 'link',
  event_id uuid references public.events(id) on delete set null,
  product_id uuid references public.shop_products(id) on delete set null,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
do $$ begin
  alter table public.qr_codes drop constraint if exists qr_codes_purpose_check;
  alter table public.qr_codes add constraint qr_codes_purpose_check
    check (purpose in ('event_rsvp','checkin','shop','dues','hours','link'));
exception when others then null; end $$;
do $$ begin
  alter table public.qr_codes drop constraint if exists qr_codes_slug_check;
  alter table public.qr_codes add constraint qr_codes_slug_check
    check (slug ~ '^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$' or slug ~ '^[a-z0-9]$');
exception when others then null; end $$;
do $$ begin
  alter table public.qr_codes drop constraint if exists qr_codes_target_check;
  alter table public.qr_codes add constraint qr_codes_target_check
    check (target_url ~* '^(https://|mailto:)');
exception when others then null; end $$;
create index if not exists qr_codes_active_idx on public.qr_codes(active);

create table if not exists public.qr_scans (
  id bigint generated always as identity primary key,
  qr_id uuid not null references public.qr_codes(id) on delete cascade,
  scanned_at timestamptz not null default now()
);
create index if not exists qr_scans_qr_time_idx on public.qr_scans(qr_id, scanned_at);

-- ========== RLS (locked down; all access goes through the RPCs below) ==========
alter table public.qr_codes enable row level security;
alter table public.qr_scans enable row level security;

drop policy if exists "QR codes readable by officers" on public.qr_codes;
create policy "QR codes readable by officers" on public.qr_codes
  for select to authenticated using (public.is_krewe_officer());
-- qr_scans has no policies on purpose: nobody reads or writes rows directly.
-- resolve_qr inserts as security definer; officers see counts via officer_list_qr_codes.

-- ========== PUBLIC RPC: the scan hop ==========
-- go.html calls this anonymously. It logs one anonymous scan and returns the
-- destination. Unknown or deactivated slugs return ok:false (no scan logged).
create or replace function public.resolve_qr(p_slug text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_slug text := lower(nullif(btrim(coalesce(p_slug,'')),''));
  v_row public.qr_codes%rowtype;
begin
  if v_slug is null or length(v_slug) > 40 then
    return jsonb_build_object('ok', false, 'error', 'That QR link is missing its code.');
  end if;
  select * into v_row from public.qr_codes where slug = v_slug;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Unknown QR code.');
  end if;
  if not v_row.active then
    return jsonb_build_object('ok', false, 'error', 'This QR code has been retired.');
  end if;
  insert into public.qr_scans(qr_id) values (v_row.id);
  return jsonb_build_object('ok', true, 'target_url', v_row.target_url, 'label', v_row.label);
end;
$$;
revoke all on function public.resolve_qr(text) from public;
grant execute on function public.resolve_qr(text) to anon, authenticated;

-- ========== OFFICER RPCs (management surface for the Phase 3 library card) ==========
create or replace function public.officer_upsert_qr_code(
  p_slug text,
  p_label text,
  p_target_url text,
  p_purpose text default 'link',
  p_id uuid default null,
  p_event uuid default null,
  p_product uuid default null
) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_slug text := lower(nullif(btrim(coalesce(p_slug,'')),''));
  v_label text := nullif(btrim(coalesce(p_label,'')),'');
  v_target text := nullif(btrim(coalesce(p_target_url,'')),'');
  v_purpose text := lower(coalesce(nullif(btrim(p_purpose),''),'link'));
  v_row public.qr_codes%rowtype;
begin
  if auth.uid() is null or not public.is_krewe_officer() then
    raise exception 'Officers only.';
  end if;
  if v_label is null then raise exception 'Give the QR code a label.'; end if;
  if v_slug is null or v_slug !~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$' then
    raise exception 'Slug must be 1-40 characters: lowercase letters, numbers, dashes (no dash at the ends).';
  end if;
  if v_target is null or v_target !~* '^(https://|mailto:)' then
    raise exception 'Destination must start with https:// or mailto:.';
  end if;
  if v_purpose not in ('event_rsvp','checkin','shop','dues','hours','link') then v_purpose := 'link'; end if;
  if p_id is not null then
    update public.qr_codes q set
      slug = v_slug,
      label = v_label,
      target_url = v_target,
      purpose = v_purpose,
      event_id = p_event,
      product_id = p_product,
      updated_at = now()
    where q.id = p_id
    returning * into v_row;
    if not found then raise exception 'QR code not found.'; end if;
  else
    insert into public.qr_codes(slug, label, target_url, purpose, event_id, product_id, created_by)
    values (v_slug, v_label, v_target, v_purpose, p_event, p_product, auth.uid())
    on conflict (slug) do update set
      label = excluded.label,
      target_url = excluded.target_url,
      purpose = excluded.purpose,
      event_id = excluded.event_id,
      product_id = excluded.product_id,
      updated_at = now()
    returning * into v_row;
  end if;
  return jsonb_build_object('ok', true, 'qr', to_jsonb(v_row));
end;
$$;
revoke all on function public.officer_upsert_qr_code(text,text,text,text,uuid,uuid,uuid) from public;
grant execute on function public.officer_upsert_qr_code(text,text,text,text,uuid,uuid,uuid) to authenticated;

create or replace function public.officer_set_qr_active(p_id uuid, p_active boolean) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_row public.qr_codes%rowtype;
begin
  if auth.uid() is null or not public.is_krewe_officer() then
    raise exception 'Officers only.';
  end if;
  update public.qr_codes q set active = coalesce(p_active, true), updated_at = now()
  where q.id = p_id
  returning * into v_row;
  if not found then raise exception 'QR code not found.'; end if;
  return jsonb_build_object('ok', true, 'qr', to_jsonb(v_row));
end;
$$;
revoke all on function public.officer_set_qr_active(uuid,boolean) from public;
grant execute on function public.officer_set_qr_active(uuid,boolean) to authenticated;

-- Deleting a code also deletes its anonymous scan rows (cascade). Prefer
-- deactivating (officer_set_qr_active) to keep the count history.
create or replace function public.officer_delete_qr_code(p_id uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null or not public.is_krewe_officer() then
    raise exception 'Officers only.';
  end if;
  delete from public.qr_codes where id = p_id;
  if not found then raise exception 'QR code not found.'; end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.officer_delete_qr_code(uuid) from public;
grant execute on function public.officer_delete_qr_code(uuid) to authenticated;

-- The library listing: every code with its anonymous totals.
create or replace function public.officer_list_qr_codes() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if auth.uid() is null or not public.is_krewe_officer() then
    raise exception 'Officers only.';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc)
    from (
      select
        q.id, q.slug, q.label, q.target_url, q.purpose, q.event_id, q.product_id,
        q.active, q.created_at, q.updated_at,
        coalesce((select count(*)::int from public.qr_scans s where s.qr_id = q.id), 0) as scan_count,
        (select max(s.scanned_at) from public.qr_scans s where s.qr_id = q.id) as last_scan_at,
        coalesce((select count(*)::int from public.qr_scans s
                  where s.qr_id = q.id and s.scanned_at > now() - interval '30 days'), 0) as scans_30d
      from public.qr_codes q
    ) x
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.officer_list_qr_codes() from public;
grant execute on function public.officer_list_qr_codes() to authenticated;
