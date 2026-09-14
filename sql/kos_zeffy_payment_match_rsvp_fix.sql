-- Durable Zeffy payment fixes for ALL event ticket purchases:
-- 1) member_email_aliases for roster match beyond primary email
-- 2) kos_record_payment: multi-email match, event link, auto-RSVP + Clovers
-- 3) list_recent_payments: show roster name when matched
-- 4) Repair historically 100x-inflated Zeffy amounts (raw.amount * 100 bug)
-- 5) Mini Golf smoke repair: Doug match + RSVP Doug & Melissa
-- Preserves rsvp_to_event(... p_note) "Ticket already purchased" member path.

create table if not exists public.member_email_aliases (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  email text not null,
  note text,
  created_at timestamptz not null default now()
);

create unique index if not exists member_email_aliases_email_uidx
  on public.member_email_aliases (lower(btrim(email)));

create index if not exists member_email_aliases_member_idx
  on public.member_email_aliases (member_id);

alter table public.member_email_aliases enable row level security;

drop policy if exists member_email_aliases_officer_read on public.member_email_aliases;
create policy member_email_aliases_officer_read on public.member_email_aliases
  for select using (public.is_krewe_officer());

-- Seed known alternate checkout emails (idempotent).
insert into public.member_email_aliases (member_id, email, note)
select m.id, lower(a.email), a.note
from public.members m
join (values
  ('Dougtully@protonmail.com', 'doug@encountive.com', 'Zeffy / Encountive'),
  ('Dougtully@protonmail.com', 'doug@theonefor.ai', 'Alternate work'),
  ('melissajotully@gmail.com', 'melissa@encountive.com', 'Encountive')
) as a(roster_email, email, note)
  on lower(m.email) = lower(a.roster_email)
where m.merged_into is null
  and not exists (
    select 1 from public.member_email_aliases x
    where lower(btrim(x.email)) = lower(btrim(a.email))
  );

create or replace function public.kos_normalize_event_key(p text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        lower(replace(replace(coalesce(p, ''), '&', ' and '), '+', ' and ')),
        '^kos[[:space:]_-]*',
        ''
      ),
      '[^a-z0-9]+',
      '',
      'g'
    ),
    ''
  );
$$;

create or replace function public.kos_match_member_by_email(p_email text)
returns uuid
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return null;
  end if;

  select id into v_id
  from public.members
  where merged_into is null
    and lower(btrim(email)) = v_email
  order by created_at
  limit 1;
  if v_id is not null then return v_id; end if;

  select a.member_id into v_id
  from public.member_email_aliases a
  join public.members m on m.id = a.member_id and m.merged_into is null
  where lower(btrim(a.email)) = v_email
  order by a.created_at
  limit 1;
  return v_id;
end;
$$;

create or replace function public.kos_match_member_by_name(p_name text)
returns uuid
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_first text;
  v_last text;
  v_id uuid;
begin
  if v_name = '' or position(' ' in v_name) = 0 then
    return null;
  end if;
  v_first := split_part(v_name, ' ', 1);
  v_last := regexp_replace(v_name, '^.*\s+', '');
  if length(v_first) < 2 or length(v_last) < 2 then
    return null;
  end if;

  select id into v_id
  from public.members
  where merged_into is null
    and lower(btrim(last_name)) = lower(v_last)
    and (
      lower(btrim(first_name)) = lower(v_first)
      or lower(btrim(first_name)) like lower(v_first) || '%'
      or lower(v_first) like lower(btrim(first_name)) || '%'
    )
  order by
    case when lower(btrim(first_name)) = lower(v_first) then 0 else 1 end,
    created_at
  limit 1;
  return v_id;
end;
$$;

create or replace function public.kos_find_event_for_payment(p jsonb)
returns uuid
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_slug text := nullif(lower(btrim(coalesce(p->>'campaign_slug', ''))), '');
  v_desc_key text := public.kos_normalize_event_key(p->>'description');
begin
  if nullif(p->>'event_id', '') is not null then
    return (p->>'event_id')::uuid;
  end if;

  if v_slug is not null then
    select e.id into v_id
    from public.events e
    where e.source = 'krewe'
      and coalesce(e.ticket_payment_url, '') ilike '%' || v_slug || '%'
    order by e.start_time desc nulls last
    limit 1;
    if v_id is not null then return v_id; end if;
  end if;

  if v_desc_key is not null then
    select e.id into v_id
    from public.events e
    where e.source = 'krewe'
      and public.kos_normalize_event_key(e.name) = v_desc_key
    order by e.start_time desc nulls last
    limit 1;
    if v_id is not null then return v_id; end if;

    select e.id into v_id
    from public.events e
    where e.source = 'krewe'
      and (
        public.kos_normalize_event_key(e.name) like '%' || v_desc_key || '%'
        or v_desc_key like '%' || public.kos_normalize_event_key(e.name) || '%'
      )
    order by e.start_time desc nulls last
    limit 1;
  end if;

  return v_id;
end;
$$;

create or replace function public.kos_auto_rsvp_from_payment(
  p_event_id uuid,
  p_member_id uuid,
  p_guests integer default 0,
  p_note text default 'Tickets purchased via Zeffy'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_event_name text;
  v_event_source text;
  v_capacity int;
  v_current int;
  v_status text;
  v_signup_id uuid;
  v_clovers int := 0;
  v_note text := nullif(left(btrim(coalesce(p_note, '')), 500), '');
  v_guests int := greatest(coalesce(p_guests, 0), 0);
begin
  if p_event_id is null or p_member_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  select name, capacity, source
    into v_event_name, v_capacity, v_event_source
  from public.events
  where id = p_event_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_event');
  end if;

  -- Do not overwrite an existing cancelled-style status aggressively; upsert registered.
  select coalesce(sum(1 + guests_count), 0) into v_current
  from public.event_signups
  where event_id = p_event_id
    and status in ('registered', 'confirmed', 'attended')
    and member_id is distinct from p_member_id;

  if v_capacity is not null and (v_current + 1 + v_guests) > v_capacity then
    v_status := 'waitlisted';
  else
    v_status := 'registered';
  end if;

  insert into public.event_signups (
    event_id, member_id, signup_role, status, guests_count, notes
  ) values (
    p_event_id, p_member_id, 'attendee', v_status, v_guests, v_note
  )
  on conflict (event_id, member_id) do update
    set status = case
          when public.event_signups.status in ('attended', 'confirmed') then public.event_signups.status
          else excluded.status
        end,
        guests_count = greatest(public.event_signups.guests_count, excluded.guests_count),
        notes = coalesce(public.event_signups.notes, excluded.notes)
  returning id into v_signup_id;

  if v_status in ('registered', 'confirmed')
     and lower(coalesce(v_event_source, '')) = 'krewe' then
    if not exists (
      select 1 from public.clover_ledger cl
      where cl.member_id = p_member_id
        and cl.event_id = p_event_id
        and cl.reason = 'rsvp'
    ) then
      insert into public.clover_ledger (member_id, clovers, reason, event_id, event_name)
      values (p_member_id, 5, 'rsvp', p_event_id, v_event_name);
      v_clovers := 5;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'signup_id', v_signup_id,
    'status', v_status,
    'clovers_awarded', v_clovers
  );
end;
$$;

create or replace function public.kos_record_payment(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_member uuid;
  v_id uuid;
  v_kind text;
  v_year integer;
  v_event uuid;
  v_emails text[] := '{}';
  v_email text;
  v_matched uuid[] := '{}';
  v_mid uuid;
  v_ticket_count int;
  v_rsvp_results jsonb := '[]'::jsonb;
  v_rsvp jsonb;
  v_i int := 0;
  v_guests int := 0;
begin
  v_kind := coalesce(p->>'product_kind', 'other');
  if v_kind not in ('store', 'event', 'dues', 'donation', 'raffle', 'other') then
    v_kind := 'other';
  end if;
  v_year := coalesce(
    nullif(p->>'membership_year', '')::integer,
    extract(year from current_date)::integer
  );

  -- Gather emails: primary + arrays from webhook.
  if coalesce(p->>'payer_email', '') <> '' then
    v_emails := array_append(v_emails, lower(btrim(p->>'payer_email')));
  end if;
  if jsonb_typeof(p->'payer_emails') = 'array' then
    for v_email in
      select lower(btrim(x))
      from jsonb_array_elements_text(p->'payer_emails') as t(x)
      where position('@' in x) > 0
    loop
      if not (v_email = any (v_emails)) then
        v_emails := array_append(v_emails, v_email);
      end if;
    end loop;
  end if;
  if jsonb_typeof(p->'attendee_emails') = 'array' then
    for v_email in
      select lower(btrim(x))
      from jsonb_array_elements_text(p->'attendee_emails') as t(x)
      where position('@' in x) > 0
    loop
      if not (v_email = any (v_emails)) then
        v_emails := array_append(v_emails, v_email);
      end if;
    end loop;
  end if;

  foreach v_email in array v_emails loop
    v_mid := public.kos_match_member_by_email(v_email);
    if v_mid is not null and not (v_mid = any (v_matched)) then
      v_matched := array_append(v_matched, v_mid);
    end if;
  end loop;

  if coalesce(array_length(v_matched, 1), 0) = 0 then
    v_mid := public.kos_match_member_by_name(p->>'payer_name');
    if v_mid is not null then
      v_matched := array_append(v_matched, v_mid);
    end if;
  end if;

  v_member := case when coalesce(array_length(v_matched, 1), 0) > 0 then v_matched[1] else null end;
  v_event := public.kos_find_event_for_payment(p);
  v_ticket_count := greatest(coalesce(nullif(p->>'ticket_count', '')::integer, 1), 1);

  insert into public.payments (
    provider, provider_event_id, provider_payment_id, amount_cents, currency,
    status, payer_email, payer_name, description, product_kind, member_id,
    event_id, membership_year, raw
  ) values (
    coalesce(p->>'provider', 'stripe'),
    p->>'provider_event_id',
    p->>'provider_payment_id',
    coalesce((p->>'amount_cents')::integer, 0),
    coalesce(p->>'currency', 'usd'),
    coalesce(p->>'status', 'succeeded'),
    nullif(lower(btrim(coalesce(p->>'payer_email', ''))), ''),
    nullif(btrim(coalesce(p->>'payer_name', '')), ''),
    p->>'description',
    v_kind,
    v_member,
    v_event,
    v_year,
    p->'raw'
  )
  on conflict (provider_event_id) do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('duplicate', true);
  end if;

  if v_kind = 'dues' and v_member is not null then
    update public.dues_payments
       set paid = true, paid_date = current_date, payment_method = 'card'
     where member_id = v_member
       and membership_year = v_year
       and paid = false;
  end if;

  -- Auto-RSVP for event ticket purchases linked to a krewe event.
  if v_kind = 'event' and v_event is not null and coalesce(array_length(v_matched, 1), 0) > 0 then
    for v_i in 1 .. array_length(v_matched, 1) loop
      v_guests := case
        when v_i = 1 and array_length(v_matched, 1) = 1
          then greatest(v_ticket_count - 1, 0)
        else 0
      end;
      v_rsvp := public.kos_auto_rsvp_from_payment(
        v_event,
        v_matched[v_i],
        v_guests,
        'Tickets purchased via Zeffy'
      );
      v_rsvp_results := v_rsvp_results || jsonb_build_array(v_rsvp);
    end loop;
  end if;

  return jsonb_build_object(
    'ok', true,
    'payment_id', v_id,
    'member_matched', v_member is not null,
    'member_id', v_member,
    'event_id', v_event,
    'matched_members', to_jsonb(v_matched),
    'rsvps', v_rsvp_results
  );
end;
$$;

revoke all on function public.kos_record_payment(jsonb) from public, anon, authenticated;
grant execute on function public.kos_record_payment(jsonb) to service_role;
grant execute on function public.kos_match_member_by_email(text) to service_role;
grant execute on function public.kos_match_member_by_name(text) to service_role;
grant execute on function public.kos_find_event_for_payment(jsonb) to service_role;
grant execute on function public.kos_auto_rsvp_from_payment(uuid, uuid, integer, text) to service_role;

create or replace function public.list_recent_payments(p_limit integer default 50)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select case when public.can_view_payments() then coalesce((
    select jsonb_agg(jsonb_build_object(
      'when', pm.created_at,
      'amount_cents', pm.amount_cents,
      'kind', pm.product_kind,
      'payer', coalesce(
        nullif(btrim(pm.payer_name), ''),
        nullif(btrim(m.first_name || ' ' || m.last_name), ''),
        pm.payer_email
      ),
      'email', pm.payer_email,
      'description', pm.description,
      'matched', pm.member_id is not null,
      'event_id', pm.event_id
    ) order by pm.created_at desc)
    from (
      select *
      from public.payments
      order by created_at desc
      limit least(greatest(coalesce(p_limit, 50), 1), 200)
    ) pm
    left join public.members m on m.id = pm.member_id
  ), '[]'::jsonb)
  else null end;
$$;

revoke all on function public.list_recent_payments(integer) from anon;
grant execute on function public.list_recent_payments(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Historical repair: Zeffy amount was treated as dollars and *100 again.
-- Safe heuristic: provider=zeffy AND raw->data->>'amount' is numeric AND
-- amount_cents = that value * 100 (exact 100x inflation vs webhook cents).
-- ---------------------------------------------------------------------------
update public.payments pm
   set amount_cents = (pm.raw->'data'->>'amount')::integer
 where pm.provider = 'zeffy'
   and pm.raw ? 'data'
   and (pm.raw->'data'->>'amount') ~ '^[0-9]+$'
   and pm.amount_cents = (pm.raw->'data'->>'amount')::integer * 100
   and pm.amount_cents > (pm.raw->'data'->>'amount')::integer;

-- Backfill payer / member / event / kind on the Mini Golf (and any similar) rows
-- from raw buyer + aliases, for Zeffy rows still missing a roster match.
update public.payments pm
   set payer_email = coalesce(
         pm.payer_email,
         lower(btrim(pm.raw#>>'{data,buyer,email}'))
       ),
       payer_name = coalesce(
         pm.payer_name,
         nullif(btrim(
           coalesce(pm.raw#>>'{data,buyer,first_name}', '') || ' ' ||
           coalesce(pm.raw#>>'{data,buyer,last_name}', '')
         ), '')
       ),
       member_id = coalesce(
         pm.member_id,
         public.kos_match_member_by_email(pm.raw#>>'{data,buyer,email}'),
         public.kos_match_member_by_name(
           coalesce(pm.raw#>>'{data,buyer,first_name}', '') || ' ' ||
           coalesce(pm.raw#>>'{data,buyer,last_name}', '')
         )
       ),
       event_id = coalesce(
         pm.event_id,
         public.kos_find_event_for_payment(jsonb_build_object(
           'description', pm.description,
           'campaign_slug', public.kos_normalize_event_key(pm.description)
         ))
       ),
       product_kind = case
         when pm.product_kind = 'other'
           and (
             lower(coalesce(pm.raw#>>'{data,campaign_type}', '')) in ('ticketing', 'event')
             or lower(coalesce(pm.raw#>>'{data,campaign_category}', '')) = 'event'
             or exists (
               select 1
               from jsonb_array_elements(coalesce(pm.raw#>'{data,items}', '[]'::jsonb)) it
               where lower(coalesce(it->>'type', '')) = 'ticket'
             )
           )
         then 'event'
         else pm.product_kind
       end
 where pm.provider = 'zeffy'
   and (
     pm.member_id is null
     or pm.payer_email is null
     or pm.event_id is null
     or pm.product_kind = 'other'
   );

-- Mini Golf smoke: RSVP Doug (purchaser) and Melissa (covered by purchase).
do $$
declare
  v_event uuid := 'd0ed40e0-f242-4532-88e1-89ff5bf1d3ea';
  v_doug uuid := '11fd6285-7ead-4790-b573-db2744742ecd';
  v_melissa uuid := '5549b096-a153-4046-8c73-7c17eef53ae2';
begin
  perform public.kos_auto_rsvp_from_payment(
    v_event, v_doug, 0, 'Tickets purchased via Zeffy'
  );
  perform public.kos_auto_rsvp_from_payment(
    v_event, v_melissa, 0, 'Tickets purchased via Zeffy (covered on Doug Tully order)'
  );
end $$;
