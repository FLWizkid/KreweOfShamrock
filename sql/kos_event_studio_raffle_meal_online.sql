-- Event Studio: optional raffle tickets, meal choice, and online meeting URL.
-- Applied live to Supabase project oazwkwflgbthojvnclfc. Safe to re-run.
--
-- Reuses existing raffle_events (price lives there; officers enter it) plus
-- Event Studio collect_raffle / raffle_options / event_signups.raffle_tickets.
-- Does not invent a second raffle system or hardcode a dollar amount.
-- Existing events with none of these options keep working.

-- ---------------------------------------------------------------------------
-- A. Columns (idempotent). Live DB may already have these from an earlier apply.
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists raffle_event_id uuid,
  add column if not exists collect_meals boolean not null default false,
  add column if not exists meal_options text,
  add column if not exists is_online boolean not null default false,
  add column if not exists meeting_url text;

alter table public.event_signups
  add column if not exists meal_choice text;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_raffle_event_id_fkey'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_raffle_event_id_fkey
      foreign key (raffle_event_id) references public.raffle_events(id) on delete set null;
  end if;
end $$;

alter table public.events drop constraint if exists events_event_type_check;
alter table public.events add constraint events_event_type_check
  check (event_type is null or event_type = any (array[
    'parade','party','meeting','fundraiser','volunteer','social','ball','online','other'
  ]));

comment on column public.events.raffle_event_id is
  'Optional link to an existing raffle_events row. Null means this event has no raffle tickets attached.';
comment on column public.events.collect_meals is
  'When true, registration asks the member to pick a meal from meal_options.';
comment on column public.events.meal_options is
  'Officer-defined meal labels, one per line (commas also accepted). Ignored when collect_meals is false.';
comment on column public.events.is_online is
  'When true, this is an online event and meeting_url is the join link emailed to the registering member.';
comment on column public.events.meeting_url is
  'Open meeting join URL (https). Emailed only to the member who just registered, and only for this event. Public signup does not select this column; rsvp_to_event returns it only to that registrant.';
comment on column public.event_signups.meal_choice is
  'Meal selected at signup when the event collects meals. Null otherwise.';

create index if not exists events_raffle_event_id_idx
  on public.events (raffle_event_id)
  where raffle_event_id is not null;

-- ---------------------------------------------------------------------------
-- B. Helpers
-- ---------------------------------------------------------------------------
create or replace function public.kos_parse_meal_options(p_text text)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(x order by ord), '{}'::text[])
  from (
    select btrim(x) as x, min(ord) as ord
    from unnest(string_to_array(replace(coalesce(p_text, ''), ',', E'\n'), E'\n'))
         with ordinality as t(x, ord)
    where btrim(x) <> ''
    group by btrim(x)
  ) s;
$$;

revoke all on function public.kos_parse_meal_options(text) from public;
grant execute on function public.kos_parse_meal_options(text) to anon, authenticated;

create or replace function public.kos_escape_html(p text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

revoke all on function public.kos_escape_html(text) from public;

create or replace function public.kos_clean_meeting_url(p_url text)
returns text
language sql
immutable
as $$
  select case
    when v ~* '^https?://' and v !~* '[[:space:]]' then v
    else null
  end
  from (select nullif(btrim(coalesce(p_url, '')), '') as v) s;
$$;

revoke all on function public.kos_clean_meeting_url(text) from public;

-- Unique Zeffy ticket URL helpers (same as sql/kos_unique_zeffy_ticket_url.sql).
create or replace function public.kos_ticket_url_key(p_url text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      regexp_replace(lower(btrim(coalesce(p_url, ''))), '[?#].*$', ''),
      '/+$',
      ''
    ),
    ''
  );
$$;

revoke all on function public.kos_ticket_url_key(text) from public, anon, authenticated;

create or replace function public.kos_notify_missing_ticket_url(p jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_req jsonb;
  v_host text;
  v_auth text;
  v_apikey text;
  v_headers extensions.http_header[];
begin
  begin
    v_req := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    return;
  end;
  if v_req is null or jsonb_typeof(v_req) <> 'object' then
    return;
  end if;

  v_host := lower(split_part(btrim(coalesce(v_req->>'host', v_req->>'Host', '')), ':', 1));
  if v_host is distinct from 'oazwkwflgbthojvnclfc.supabase.co' then
    return;
  end if;

  v_auth := nullif(btrim(coalesce(v_req->>'authorization', v_req->>'Authorization', '')), '');
  v_apikey := nullif(btrim(coalesce(v_req->>'apikey', v_req->>'Apikey', '')), '');
  if v_auth is null then
    return;
  end if;

  v_headers := array[
    extensions.http_header('Content-Type', 'application/json'),
    extensions.http_header('Authorization', v_auth)
  ];
  if v_apikey is not null then
    v_headers := v_headers || extensions.http_header('apikey', v_apikey);
  end if;

  begin
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '8');
    perform extensions.http((
      'POST'::extensions.http_method,
      'https://oazwkwflgbthojvnclfc.supabase.co/functions/v1/notify-missing-ticket-url',
      v_headers,
      'application/json',
      left(p::text, 4000)
    )::extensions.http_request);
  exception when others then
    return;
  end;
end;
$$;

revoke all on function public.kos_notify_missing_ticket_url(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- C. Officer raffle picker (reuse raffle_events; price is officer-entered)
-- ---------------------------------------------------------------------------
create or replace function public.officer_list_event_raffles()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.can_manage_events() then
    return jsonb_build_object('ok', false, 'message', 'Not authorized.', 'raffles', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'ok', true,
    'raffles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'raffle_type', r.raffle_type,
        'ticket_price', r.ticket_price,
        'is_active', r.is_active,
        'event_date', r.event_date
      ) order by r.is_active desc, r.event_date desc nulls last, r.name)
      from public.raffle_events r
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.officer_list_event_raffles() from public;
grant execute on function public.officer_list_event_raffles() to authenticated;

create or replace function public.officer_list_events()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.can_manage_events() then
    return jsonb_build_object('ok', false, 'message', 'Not authorized.', 'events', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'ok', true,
    'events', coalesce((
      select jsonb_agg(
        to_jsonb(e) || jsonb_build_object(
          'raffle_ticket_price', r.ticket_price,
          'raffle_event_name', r.name
        )
        order by e.start_time desc
      )
      from public.events e
      left join public.raffle_events r on r.id = e.raffle_event_id
      where coalesce(e.source,'') <> 'ikc'
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.officer_list_events() from public;
grant execute on function public.officer_list_events() to authenticated;

-- ---------------------------------------------------------------------------
-- D. officer_upsert_event: unique Zeffy URL + optional raffle/meal/online
-- ---------------------------------------------------------------------------
create or replace function public.officer_upsert_event(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_row public.events%rowtype;
  v_name text;
  v_start timestamptz;
  v_featured boolean;
  v_raffle_opts text;
  v_reg_closes timestamptz;
  v_old_status text;
  v_old_url text;
  v_old_price integer;
  v_price integer;
  v_url text;
  v_status text;
  v_url_cleared boolean := false;
  v_became_published boolean := false;
  v_event_type text;
  v_is_online boolean;
  v_meeting_url text;
  v_collect_raffle boolean;
  v_raffle_event_id uuid;
  v_raffle_price numeric;
  v_collect_meals boolean;
  v_meal_options text;
  v_meals text[];
begin
  if not public.can_manage_events() then
    return jsonb_build_object('ok', false, 'message',
      'Only board members, officers, and committee chairs can manage events.');
  end if;

  v_name := nullif(btrim(coalesce(p->>'name','')), '');
  if v_name is null then
    return jsonb_build_object('ok', false, 'message', 'Event name is required.');
  end if;

  begin
    v_start := (p->>'start_time')::timestamptz;
  exception when others then
    return jsonb_build_object('ok', false, 'message', 'A valid start date/time is required.');
  end;
  if v_start is null then
    return jsonb_build_object('ok', false, 'message', 'A valid start date/time is required.');
  end if;

  v_featured := coalesce((p->>'is_featured')::boolean, false);
  v_id := nullif(p->>'id','')::uuid;
  v_raffle_opts := coalesce(nullif(btrim(coalesce(p->>'raffle_options','')), ''), '0,1,5,15');

  v_reg_closes := null;
  if p ? 'registration_closes_at' then
    begin
      v_reg_closes := nullif(p->>'registration_closes_at','')::timestamptz;
    exception when others then
      return jsonb_build_object('ok', false, 'message', 'Please check the registration close date/time.');
    end;
  end if;

  v_event_type := coalesce(nullif(btrim(coalesce(p->>'event_type','')), ''), 'social');
  v_is_online := coalesce((p->>'is_online')::boolean, false)
    or (p ? 'event_type' and lower(v_event_type) = 'online');
  v_meeting_url := public.kos_clean_meeting_url(p->>'meeting_url');
  if p ? 'meeting_url' and nullif(btrim(coalesce(p->>'meeting_url','')), '') is not null and v_meeting_url is null then
    return jsonb_build_object('ok', false, 'message',
      'Meeting join link must start with http:// or https://.');
  end if;
  if not v_is_online then
    v_meeting_url := null;
  end if;

  v_collect_raffle := coalesce((p->>'collect_raffle')::boolean, false);
  v_raffle_event_id := nullif(p->>'raffle_event_id','')::uuid;
  v_raffle_price := null;
  if p ? 'raffle_ticket_price' and nullif(btrim(coalesce(p->>'raffle_ticket_price','')), '') is not null then
    begin
      v_raffle_price := (p->>'raffle_ticket_price')::numeric;
    exception when others then
      return jsonb_build_object('ok', false, 'message', 'Raffle ticket price must be a number.');
    end;
    if v_raffle_price < 0 then
      return jsonb_build_object('ok', false, 'message', 'Raffle ticket price must be zero or more.');
    end if;
  end if;

  if not v_collect_raffle then
    v_raffle_event_id := null;
    v_raffle_price := null;
  else
    if v_raffle_event_id is not null then
      if not exists (select 1 from public.raffle_events r where r.id = v_raffle_event_id) then
        return jsonb_build_object('ok', false, 'message', 'That raffle was not found.');
      end if;
      if v_raffle_price is not null then
        update public.raffle_events
           set ticket_price = v_raffle_price, updated_at = now()
         where id = v_raffle_event_id;
      end if;
    elsif v_raffle_price is not null then
      insert into public.raffle_events (
        name, raffle_type, description, ticket_price, event_date,
        is_active, audience, created_by
      ) values (
        v_name || ' raffle',
        'fifty_fifty',
        'Raffle tickets attached from Event Studio.',
        v_raffle_price,
        v_start::date,
        true,
        'both',
        auth.uid()
      ) returning id into v_raffle_event_id;
    end if;
  end if;

  v_collect_meals := coalesce((p->>'collect_meals')::boolean, false);
  v_meal_options := nullif(btrim(coalesce(p->>'meal_options','')), '');
  if v_collect_meals then
    v_meals := public.kos_parse_meal_options(v_meal_options);
    if coalesce(array_length(v_meals, 1), 0) = 0 then
      return jsonb_build_object('ok', false, 'message',
        'Turn on meal choice and list at least one meal option, or turn meal choice off.');
    end if;
    v_meal_options := array_to_string(v_meals, E'\n');
  else
    v_meal_options := null;
  end if;

  v_old_status := null;
  v_old_url := null;
  v_old_price := null;
  if v_id is not null then
    select e.status, e.ticket_payment_url, e.ticket_price_cents
      into v_old_status, v_old_url, v_old_price
    from public.events e
    where e.id = v_id;
  end if;

  if p ? 'ticket_price_cents' then
    v_price := nullif(p->>'ticket_price_cents','')::integer;
  else
    v_price := v_old_price;
  end if;

  if p ? 'ticket_payment_url' then
    v_url := nullif(btrim(p->>'ticket_payment_url'), '');
  else
    v_url := nullif(btrim(coalesce(v_old_url, '')), '');
  end if;

  if coalesce(v_price, 0) > 0
     and public.kos_ticket_url_key(v_url) is not null
     and exists (
       select 1
       from public.events other
       where other.id is distinct from v_id
         and public.kos_ticket_url_key(other.ticket_payment_url)
             = public.kos_ticket_url_key(v_url)
     )
  then
    v_url := null;
    v_url_cleared := true;
  end if;

  v_status := nullif(btrim(coalesce(p->>'status', '')), '');
  if v_status is null then
    v_status := case when v_id is null then 'published' else v_old_status end;
  end if;
  v_became_published := lower(coalesce(v_status, '')) = 'published'
    and lower(coalesce(v_old_status, '')) <> 'published';

  if v_featured then
    update public.events set is_featured = false where is_featured = true and (v_id is null or id <> v_id);
  end if;

  if v_id is null then
    insert into public.events(
      name, description, event_type, start_time, end_time, location, capacity,
      is_mandatory, is_public, notes, source, ticket_price_cents, ticket_label,
      ticket_payment_url, flyer_url, status, created_by, is_featured,
      collect_guests, collect_guest_names, collect_raffle, raffle_options,
      registration_closes_at, raffle_event_id, collect_meals, meal_options,
      is_online, meeting_url
    ) values (
      v_name, nullif(p->>'description',''), v_event_type,
      v_start, nullif(p->>'end_time','')::timestamptz, nullif(p->>'location',''),
      nullif(p->>'capacity','')::integer,
      coalesce((p->>'is_mandatory')::boolean, false),
      coalesce((p->>'is_public')::boolean, true),
      nullif(p->>'notes',''), 'krewe',
      v_price,
      nullif(p->>'ticket_label',''),
      v_url,
      nullif(p->>'flyer_url',''),
      coalesce(v_status, 'published'),
      auth.uid(),
      v_featured,
      coalesce((p->>'collect_guests')::boolean, true),
      coalesce((p->>'collect_guest_names')::boolean, true),
      v_collect_raffle,
      v_raffle_opts,
      case when p ? 'registration_closes_at' then v_reg_closes else null end,
      v_raffle_event_id,
      v_collect_meals,
      v_meal_options,
      v_is_online,
      v_meeting_url
    ) returning * into v_row;
  else
    update public.events e set
      name = v_name,
      description = coalesce(nullif(p->>'description',''), e.description),
      event_type = case when p ? 'event_type' then v_event_type else e.event_type end,
      start_time = v_start,
      end_time = case when p ? 'end_time' then nullif(p->>'end_time','')::timestamptz else e.end_time end,
      location = case when p ? 'location' then nullif(p->>'location','') else e.location end,
      capacity = case when p ? 'capacity' then nullif(p->>'capacity','')::integer else e.capacity end,
      is_mandatory = coalesce((p->>'is_mandatory')::boolean, e.is_mandatory),
      is_public = coalesce((p->>'is_public')::boolean, e.is_public),
      notes = case when p ? 'notes' then nullif(p->>'notes','') else e.notes end,
      ticket_price_cents = case when p ? 'ticket_price_cents' then v_price else e.ticket_price_cents end,
      ticket_label = case when p ? 'ticket_label' then nullif(p->>'ticket_label','') else e.ticket_label end,
      ticket_payment_url = case
        when (p ? 'ticket_payment_url') or v_url_cleared then v_url
        else e.ticket_payment_url
      end,
      flyer_url = case when p ? 'flyer_url' then nullif(p->>'flyer_url','') else e.flyer_url end,
      status = coalesce(v_status, e.status),
      is_featured = case when p ? 'is_featured' then v_featured else e.is_featured end,
      collect_guests = case when p ? 'collect_guests' then coalesce((p->>'collect_guests')::boolean, true) else e.collect_guests end,
      collect_guest_names = case when p ? 'collect_guest_names' then coalesce((p->>'collect_guest_names')::boolean, true) else e.collect_guest_names end,
      collect_raffle = case when p ? 'collect_raffle' then v_collect_raffle else e.collect_raffle end,
      raffle_options = case when p ? 'raffle_options' then v_raffle_opts else e.raffle_options end,
      registration_closes_at = case when p ? 'registration_closes_at' then v_reg_closes else e.registration_closes_at end,
      raffle_event_id = case
        when (p ? 'raffle_event_id') or (p ? 'collect_raffle') or (p ? 'raffle_ticket_price')
        then v_raffle_event_id else e.raffle_event_id end,
      collect_meals = case when p ? 'collect_meals' then v_collect_meals else e.collect_meals end,
      meal_options = case when (p ? 'meal_options') or (p ? 'collect_meals') then v_meal_options else e.meal_options end,
      is_online = case when (p ? 'is_online') or (p ? 'event_type') then v_is_online else e.is_online end,
      meeting_url = case when (p ? 'meeting_url') or (p ? 'is_online') or (p ? 'event_type') then v_meeting_url else e.meeting_url end,
      updated_at = now()
    where e.id = v_id and coalesce(e.source,'') <> 'ikc'
    returning * into v_row;
    if not found then
      return jsonb_build_object('ok', false, 'message', 'Event not found or cannot be edited (IKC sync events are read-only).');
    end if;
  end if;

  if v_became_published
     and coalesce(v_price, 0) > 0
     and public.kos_ticket_url_key(v_row.ticket_payment_url) is null
  then
    perform public.kos_notify_missing_ticket_url(jsonb_build_object(
      'became_published', true,
      'status', 'published',
      'ticket_price_cents', v_price,
      'ticket_payment_url', '',
      'event_id', v_row.id,
      'name', v_row.name,
      'start_time', v_row.start_time,
      'location', v_row.location,
      'reason', 'needs_own_ticket_url'
    ));
  end if;

  return jsonb_build_object(
    'ok', true,
    'event', to_jsonb(v_row) || jsonb_build_object(
      'raffle_ticket_price', (
        select r.ticket_price from public.raffle_events r where r.id = v_row.raffle_event_id
      )
    ),
    'ticket_url_cleared', v_url_cleared
  );
end;
$function$;

revoke all on function public.officer_upsert_event(jsonb) from public;
grant execute on function public.officer_upsert_event(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- E. rsvp_to_event: meal choice + join-link email to that member only
-- ---------------------------------------------------------------------------
drop function if exists public.rsvp_to_event(uuid, text, text, text, integer, text, numeric);
drop function if exists public.rsvp_to_event(uuid, text, text, text, integer, text, numeric, text);
drop function if exists public.rsvp_to_event(uuid, text, text, text, integer, text, numeric, text, integer, text, text, text);

create or replace function public.rsvp_to_event(
  p_event_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_guests_count integer default 0,
  p_signup_role text default 'attendee'::text,
  p_volunteer_hours_planned numeric default null::numeric,
  p_note text default null,
  p_raffle_tickets integer default 0,
  p_guest_names text default null,
  p_ticket_type text default null,
  p_payment_status text default null,
  p_meal_choice text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_member_id uuid;
  v_capacity  int;
  v_current   int;
  v_status    text;
  v_signup_id uuid;
  v_event_name text;
  v_event_source text;
  v_ticket_url text;
  v_reg_closes timestamptz;
  v_subject   text;
  v_body      text;
  v_hours_planned numeric;
  v_note      text;
  v_clovers_awarded int := 0;
  v_raffle int := greatest(coalesce(p_raffle_tickets, 0), 0);
  v_guest_names text;
  v_ticket_type text;
  v_pay_status text;
  v_collect_meals boolean;
  v_meal_options text;
  v_meals text[];
  v_meal text;
  v_is_online boolean;
  v_meeting_url text;
  v_join_html text := '';
begin
  if p_email is null or position('@' in p_email) = 0 then
    return jsonb_build_object('ok', false, 'message', 'A valid email is required.');
  end if;
  if coalesce(btrim(p_first_name), '') = '' or coalesce(btrim(p_last_name), '') = '' then
    return jsonb_build_object('ok', false, 'message', 'First and last name are required.');
  end if;
  if p_signup_role not in ('attendee','volunteer','organizer') then
    p_signup_role := 'attendee';
  end if;
  if p_guests_count is null or p_guests_count < 0 then
    p_guests_count := 0;
  end if;

  v_hours_planned := null;
  if p_signup_role in ('volunteer','organizer') then
    v_hours_planned := p_volunteer_hours_planned;
    if v_hours_planned is not null and v_hours_planned <= 0 then
      v_hours_planned := null;
    end if;
  end if;

  v_note := nullif(left(btrim(coalesce(p_note, '')), 500), '');
  v_guest_names := nullif(left(btrim(coalesce(p_guest_names, '')), 1000), '');
  v_ticket_type := nullif(left(btrim(coalesce(p_ticket_type, '')), 120), '');
  v_meal := nullif(left(btrim(coalesce(p_meal_choice, '')), 160), '');

  v_pay_status := nullif(lower(btrim(coalesce(p_payment_status, ''))), '');
  if v_pay_status is not null and v_pay_status not in (
    'pending', 'paid', 'already_purchased', 'n/a', 'unpaid'
  ) then
    v_pay_status := null;
  end if;

  select name, capacity, source, ticket_payment_url, registration_closes_at,
         coalesce(collect_meals, false), meal_options,
         coalesce(is_online, false), meeting_url
    into v_event_name, v_capacity, v_event_source, v_ticket_url, v_reg_closes,
         v_collect_meals, v_meal_options, v_is_online, v_meeting_url
  from public.events
  where id = p_event_id and is_public = true and source <> 'ikc';
  if not found then
    return jsonb_build_object('ok', false, 'message', 'That event was not found or is not open for signups.');
  end if;

  if v_reg_closes is not null and now() >= v_reg_closes then
    return jsonb_build_object('ok', false, 'message', 'Registration closed for this event.', 'registration_closed', true);
  end if;

  v_meeting_url := public.kos_clean_meeting_url(v_meeting_url);

  if v_collect_meals then
    v_meals := public.kos_parse_meal_options(v_meal_options);
    if coalesce(array_length(v_meals, 1), 0) > 0 then
      if v_meal is null or not (v_meal = any (v_meals)) then
        return jsonb_build_object('ok', false, 'message', 'Please choose a meal for this event.');
      end if;
    else
      v_meal := null;
    end if;
  else
    v_meal := null;
  end if;

  if v_pay_status is null then
    if p_signup_role in ('volunteer', 'organizer') then
      v_pay_status := 'n/a';
    elsif v_note is not null and v_note ilike 'Ticket already purchased%' then
      v_pay_status := 'already_purchased';
    elsif coalesce(v_ticket_url, '') <> '' and p_signup_role = 'attendee' then
      v_pay_status := 'pending';
    else
      v_pay_status := 'n/a';
    end if;
  end if;

  select id into v_member_id from public.members where lower(email) = lower(p_email);
  if not found then
    insert into public.members (first_name, last_name, email, member_role, membership_status)
    values (btrim(p_first_name), btrim(p_last_name), lower(p_email), 'prospect', 'prospect')
    returning id into v_member_id;
  end if;

  select coalesce(sum(1 + guests_count), 0) into v_current
  from public.event_signups
  where event_id = p_event_id and status in ('registered','confirmed','attended');

  if v_capacity is not null and (v_current + 1 + p_guests_count) > v_capacity then
    v_status := 'waitlisted';
  else
    v_status := 'registered';
  end if;

  insert into public.event_signups (
    event_id, member_id, signup_role, status, guests_count,
    volunteer_hours_planned, notes,
    raffle_tickets, guest_names, ticket_type, payment_status, meal_choice
  ) values (
    p_event_id, v_member_id, p_signup_role, v_status, p_guests_count,
    v_hours_planned, v_note,
    v_raffle, v_guest_names, v_ticket_type, v_pay_status, v_meal
  )
  on conflict (event_id, member_id)
  do update set signup_role = excluded.signup_role,
                guests_count = excluded.guests_count,
                status = excluded.status,
                volunteer_hours_planned = excluded.volunteer_hours_planned,
                notes = coalesce(excluded.notes, public.event_signups.notes),
                raffle_tickets = excluded.raffle_tickets,
                guest_names = coalesce(excluded.guest_names, public.event_signups.guest_names),
                ticket_type = coalesce(excluded.ticket_type, public.event_signups.ticket_type),
                meal_choice = excluded.meal_choice,
                payment_status = case
                  when public.event_signups.payment_status = 'paid' then 'paid'
                  else excluded.payment_status
                end
  returning id into v_signup_id;

  if v_status <> 'waitlisted' and v_is_online and v_meeting_url is not null then
    v_join_html := '<p>Your join link for this event: <a href="'
      || public.kos_escape_html(v_meeting_url) || '">'
      || public.kos_escape_html(v_meeting_url) || '</a></p>';
  end if;

  if v_status = 'waitlisted' then
    v_subject := 'You''re on the waitlist: ' || v_event_name;
    v_body := '<p>Hi ' || public.kos_escape_html(btrim(p_first_name)) || ',</p>'
           || '<p>Thanks for signing up for <strong>' || public.kos_escape_html(v_event_name) || '</strong>. '
           || 'That event is currently full, so you''ve been added to the <strong>waitlist</strong>. '
           || 'We''ll be in touch if a spot opens up.</p><p>Slainte!<br/>Krewe of Shamrock</p>';
  elsif v_pay_status = 'pending' then
    v_subject := 'Almost there: ' || v_event_name;
    v_body := '<p>Hi ' || public.kos_escape_html(btrim(p_first_name)) || ',</p>'
           || '<p>We saved your spot for <strong>' || public.kos_escape_html(v_event_name) || '</strong>'
           || case when p_guests_count > 0 then ' with ' || p_guests_count || ' guest(s)' else '' end
           || case when v_raffle > 0 then ' and ' || v_raffle || ' raffle ticket(s)' else '' end
           || case when v_meal is not null then ' (meal: ' || public.kos_escape_html(v_meal) || ')' else '' end
           || '. Finish checkout on Zeffy to complete payment. If you already paid in another tab, you''re all set.</p>'
           || v_join_html
           || '<p>Slainte!<br/>Krewe of Shamrock</p>';
  else
    v_subject := 'You''re signed up: ' || v_event_name;
    v_body := '<p>Hi ' || public.kos_escape_html(btrim(p_first_name)) || ',</p>'
           || '<p>You''re confirmed for <strong>' || public.kos_escape_html(v_event_name) || '</strong>'
           || case when p_guests_count > 0 then ' with ' || p_guests_count || ' guest(s)' else '' end
           || case when v_meal is not null then ' (meal: ' || public.kos_escape_html(v_meal) || ')' else '' end
           || case when p_signup_role in ('volunteer','organizer') then ' as a <strong>volunteer</strong>' else '' end
           || '. We can''t wait to see you!</p>'
           || v_join_html
           || '<p>Slainte!<br/>Krewe of Shamrock</p>';
  end if;

  -- Same outbound_emails path as every other RSVP. Only this registrant.
  perform public.enqueue_email(lower(p_email), btrim(p_first_name) || ' ' || btrim(p_last_name),
                               v_subject, v_body, 'rsvp_confirmation', v_member_id);

  if v_status in ('registered', 'confirmed')
     and lower(coalesce(v_event_source, '')) = 'krewe' then
    if not exists (
      select 1 from public.clover_ledger cl
      where cl.member_id = v_member_id
        and cl.event_id = p_event_id
        and cl.reason = 'rsvp'
    ) then
      insert into public.clover_ledger (member_id, clovers, reason, event_id, event_name)
      values (v_member_id, 5, 'rsvp', p_event_id, v_event_name);
      v_clovers_awarded := 5;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'signup_id', v_signup_id,
    'status', v_status,
    'payment_status', v_pay_status,
    'volunteer_hours_planned', v_hours_planned,
    'meal_choice', v_meal,
    'meeting_url', case
      when v_status <> 'waitlisted' and v_is_online then v_meeting_url
      else null
    end,
    'clovers_awarded', v_clovers_awarded,
    'message', case
      when v_status = 'waitlisted'
        then 'This event is full - you have been added to the waitlist. We''ll be in touch.'
      when v_pay_status = 'pending'
        then 'Details saved. Opening ticket checkout next.'
      else 'You''re signed up! See you there.'
    end
  );
end;
$function$;

grant execute on function public.rsvp_to_event(uuid,text,text,text,integer,text,numeric,text,integer,text,text,text,text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- F. officer_event_report: include meal choice on Website RSVP rows
-- ---------------------------------------------------------------------------
create or replace function public.officer_event_report(p_key text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_event_id        uuid;
  v_wa              bigint;
  v_title           text;
  v_start           timestamptz;
  v_location        text;
  v_site_attendees  jsonb := '[]'::jsonb;
  v_legacy_attendees jsonb := '[]'::jsonb;
  v_site_headcount  bigint := 0;
  v_legacy_headcount bigint := 0;
  v_checked_in      bigint := 0;
  v_legacy_raised   bigint := 0;
  v_legacy_pending  bigint := 0;
  v_site_raised     bigint := 0;
  v_site_pending    bigint := 0;
begin
  if not public.can_manage_events() then
    return jsonb_build_object('ok', false, 'message', 'Not authorized.');
  end if;

  if p_key like 'site:%' then
    begin
      v_event_id := substring(p_key from 6)::uuid;
    exception when others then
      return jsonb_build_object('ok', false, 'message', 'Bad report key.');
    end;
    select e.name, e.start_time, e.location into v_title, v_start, v_location
      from public.events e where e.id = v_event_id;
    if not found then
      return jsonb_build_object('ok', false, 'message', 'Event not found.');
    end if;
  elsif p_key like 'wa:%' then
    begin
      v_wa := substring(p_key from 4)::bigint;
    exception when others then
      return jsonb_build_object('ok', false, 'message', 'Bad report key.');
    end;
    select min(l.event_title), min(l.event_start), min(l.event_location)
      into v_title, v_start, v_location
      from public.legacy_event_registrations l where l.wa_event_id = v_wa;
    if v_title is null then
      return jsonb_build_object('ok', false, 'message', 'Event not found.');
    end if;
  else
    return jsonb_build_object('ok', false, 'message', 'Bad report key.');
  end if;

  if v_event_id is not null then
    select
      coalesce(jsonb_agg(jsonb_build_object(
        'source', 'Website RSVP',
        'name', trim(coalesce(m.first_name,'') || ' ' || coalesce(m.last_name,'')),
        'email', m.email,
        'detail', trim(both ' ·' from
          coalesce(nullif(s.ticket_type, ''), s.signup_role, '')
          || case when coalesce(s.raffle_tickets, 0) > 0
                  then ' · raffle: ' || s.raffle_tickets::text || ' ticket(s)' else '' end
          || case when coalesce(s.meal_choice, '') <> ''
                  then ' · meal: ' || left(s.meal_choice, 80) else '' end
          || case when coalesce(s.guest_names, '') <> ''
                  then ' · guests: ' || left(s.guest_names, 120) else '' end
        ),
        'status', case
          when s.payment_status = 'paid' then 'Paid (Zeffy)'
          when s.payment_status = 'pending' then 'Pending Zeffy'
          when s.payment_status = 'already_purchased' then 'Already purchased'
          when s.payment_status = 'unpaid' then 'Unpaid'
          else s.status
        end,
        'guests', coalesce(s.guests_count, 0),
        'guest_names', s.guest_names,
        'raffle_tickets', coalesce(s.raffle_tickets, 0),
        'meal_choice', s.meal_choice,
        'payment_status', s.payment_status,
        'amount_cents', coalesce(
          s.amount_cents,
          case when s.payment_status = 'paid' then (
            select p.amount_cents from public.payments p
             where p.id = s.payment_id
          ) end
        ),
        'checked_in', s.status = 'attended'
      ) order by m.last_name, m.first_name), '[]'::jsonb),
      coalesce(sum(case when s.status in ('registered','confirmed','attended')
                        then 1 + coalesce(s.guests_count, 0) else 0 end), 0),
      coalesce(sum(case when s.payment_status = 'pending' then 1 else 0 end), 0)
      into v_site_attendees, v_site_headcount, v_site_pending
      from public.event_signups s
      join public.members m on m.id = s.member_id
     where s.event_id = v_event_id;

    select coalesce(sum(p.amount_cents), 0) into v_site_raised
      from public.payments p
     where p.event_id = v_event_id and p.status = 'succeeded';
  end if;

  select
    coalesce(jsonb_agg(jsonb_build_object(
      'source', 'Old site',
      'name', trim(coalesce(l.first_name,'') || ' ' || coalesce(l.last_name,'')),
      'email', l.email,
      'detail', trim(both ' ·' from
        coalesce(l.ticket_type, '')
        || case when coalesce(l.raffle_choice,'') <> ''
                then ' · raffle: ' || l.raffle_choice else '' end
        || case when coalesce(l.guest_of,'') <> ''
                then ' · guest of ' || l.guest_of else '' end),
      'status', l.payment_state,
      'guests', 0,
      'guest_names', null,
      'raffle_tickets', case
        when l.raffle_choice ~ '^[0-9]+' then (substring(l.raffle_choice from '^[0-9]+'))::int
        else 0
      end,
      'meal_choice', null,
      'payment_status', lower(coalesce(l.payment_state, '')),
      'amount_cents', l.total_fee_cents,
      'checked_in', l.checked_in
    ) order by l.registered_at), '[]'::jsonb),
    coalesce(count(*) filter (where coalesce(l.payment_state,'')
      not in ('Canceled','Probably abandoned (payment failed)')), 0),
    coalesce(count(*) filter (where l.checked_in), 0),
    coalesce(sum(l.total_fee_cents) filter (where l.payment_state = 'Paid'), 0),
    coalesce(sum(l.total_fee_cents) filter (where l.payment_state = 'Unpaid'), 0)
    into v_legacy_attendees, v_legacy_headcount, v_checked_in,
         v_legacy_raised, v_legacy_pending
    from public.legacy_event_registrations l
   where (v_event_id is not null and l.event_id = v_event_id)
      or (v_wa is not null and l.wa_event_id = v_wa);

  return jsonb_build_object(
    'ok', true,
    'event', jsonb_build_object(
      'title', v_title, 'start_time', v_start, 'location', v_location),
    'totals', jsonb_build_object(
      'expected_headcount', v_site_headcount + v_legacy_headcount,
      'website_rsvp_headcount', v_site_headcount,
      'legacy_headcount', v_legacy_headcount,
      'checked_in', v_checked_in,
      'raised_cents', v_legacy_raised + v_site_raised,
      'pending_cents', v_legacy_pending,
      'pending_zeffy_signups', v_site_pending),
    'attendees', v_site_attendees || v_legacy_attendees);
end;
$function$;

revoke all on function public.officer_event_report(text) from public, anon;
grant execute on function public.officer_event_report(text) to authenticated;
