-- Parade season: Event Studio parades, linked mandatory meetings, Hub
-- eligibility, soft Door Check-In gate, and public marketing cards.
-- Safe to re-run. Apply in the Supabase SQL editor on project oazwkwflgbthojvnclfc
-- the same way as sql/kos_event_members_only_address.sql.
--
-- Design:
--   * Reuses events.event_type = 'parade' (already in the type check).
--   * linked_meeting_id points a parade at its mandatory briefing.
--   * Public pages keep using v_public_events (teaser location + description).
--     member_address / meeting_url stay off anon, same lockdown as
--     sql/kos_event_member_address_anon_lockdown.sql.
--   * Soft gate: parade Door Check-In warns and blocks if the linked meeting
--     was not attended. Parade RSVP is NOT hard-blocked.
--   * No Zeffy parade tickets and no public non-member march RSVP.

-- ---------------------------------------------------------------------------
-- A. Columns
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists linked_meeting_id uuid;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_linked_meeting_id_fkey'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_linked_meeting_id_fkey
      foreign key (linked_meeting_id) references public.events(id) on delete set null;
  end if;
end $$;

create index if not exists events_linked_meeting_id_idx
  on public.events (linked_meeting_id);

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_linked_meeting_not_self'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_linked_meeting_not_self
      check (linked_meeting_id is null or linked_meeting_id <> id);
  end if;
end $$;

comment on column public.events.linked_meeting_id is
  'Optional. For event_type = parade, the mandatory briefing/meeting members should attend before parade Door Check-In. Null means no meeting gate.';

-- ---------------------------------------------------------------------------
-- B. Anonymous clients still cannot read private fields
-- ---------------------------------------------------------------------------
revoke all on table public.events from public;
revoke all on table public.events from anon;
grant select (
  id, name, description, event_type, start_time, end_time, location,
  capacity, is_mandatory, created_at, is_public, source,
  external_uid, external_url, ticket_price_cents, ticket_label,
  ticket_payment_url, flyer_url, status, is_featured,
  collect_guests, collect_guest_names, collect_raffle, raffle_options,
  registration_closes_at, raffle_event_id, collect_meals, meal_options,
  is_online, members_only
) on table public.events to anon;
grant select on table public.events to authenticated;
grant select (member_address) on table public.events to authenticated;

drop view if exists public.v_public_events;
create view public.v_public_events
with (security_invoker = true) as
select
  id, name, description, event_type, start_time, end_time, location,
  capacity, is_public, source, external_url,
  ticket_price_cents, ticket_label, ticket_payment_url, flyer_url,
  status, is_featured, collect_guests, collect_guest_names,
  collect_raffle, raffle_options, raffle_event_id, collect_meals,
  meal_options, is_online, registration_closes_at, members_only
from public.events
where is_public = true;

grant select on public.v_public_events to anon, authenticated;

-- ---------------------------------------------------------------------------
-- C. Attendance helper (signup attended OR door log)
-- ---------------------------------------------------------------------------
create or replace function public.kos_member_attended_event(p_member uuid, p_event uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select p_member is not null and p_event is not null and (
    exists (
      select 1 from public.event_signups s
      where s.member_id = p_member
        and s.event_id = p_event
        and s.status = 'attended'
    )
    or exists (
      select 1 from public.door_checkins d
      where d.member_id = p_member
        and d.event_id = p_event
    )
  );
$$;

revoke all on function public.kos_member_attended_event(uuid, uuid) from public, anon, authenticated;

create or replace function public.kos_member_rsvpd_event(p_member uuid, p_event uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select p_member is not null and p_event is not null and exists (
    select 1 from public.event_signups s
    where s.member_id = p_member
      and s.event_id = p_event
      and s.status in ('registered', 'confirmed', 'attended', 'waitlisted')
  );
$$;

revoke all on function public.kos_member_rsvpd_event(uuid, uuid) from public, anon, authenticated;

create or replace function public.kos_parade_soft_gate_block(p_event public.events, p_member uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_meet public.events%rowtype;
begin
  if p_event.id is null then
    return null;
  end if;
  if lower(coalesce(p_event.event_type, '')) <> 'parade' then
    return null;
  end if;
  if p_event.linked_meeting_id is null then
    return null;
  end if;
  if public.kos_member_attended_event(p_member, p_event.linked_meeting_id) then
    return null;
  end if;

  select * into v_meet from public.events where id = p_event.linked_meeting_id;
  return jsonb_build_object(
    'ok', false,
    'soft_gated', true,
    'meeting_required', true,
    'event', p_event.name,
    'event_id', p_event.id,
    'meeting_id', p_event.linked_meeting_id,
    'meeting_name', coalesce(v_meet.name, 'the mandatory meeting'),
    'error', 'Parade Door Check-In is waiting on the mandatory meeting'
      || case when v_meet.name is not null then ' (' || v_meet.name || ')' else '' end
      || '. RSVP is still open. Check in at that meeting first, or ask an officer to confirm attendance.'
  );
end;
$$;

revoke all on function public.kos_parade_soft_gate_block(public.events, uuid) from public;

-- ---------------------------------------------------------------------------
-- D. officer_upsert_event: persist linked_meeting_id + optional create-pair
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
  v_members_only boolean;
  v_member_address text;
  v_linked_meeting uuid;
  v_create_meet_name text;
  v_create_meet_start timestamptz;
  v_create_meet_mandatory boolean;
  v_meet public.events%rowtype;
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

  v_members_only := coalesce((p->>'members_only')::boolean, false);
  v_member_address := nullif(btrim(coalesce(p->>'member_address','')), '');

  v_linked_meeting := null;
  if p ? 'linked_meeting_id' then
    begin
      v_linked_meeting := nullif(p->>'linked_meeting_id','')::uuid;
    exception when others then
      return jsonb_build_object('ok', false, 'message', 'Linked meeting is not valid.');
    end;
  end if;

  v_create_meet_name := nullif(btrim(coalesce(p->>'create_meeting_name','')), '');
  v_create_meet_start := null;
  if p ? 'create_meeting_start' and nullif(btrim(coalesce(p->>'create_meeting_start','')), '') is not null then
    begin
      v_create_meet_start := (p->>'create_meeting_start')::timestamptz;
    exception when others then
      return jsonb_build_object('ok', false, 'message', 'A valid mandatory-meeting date/time is required.');
    end;
  end if;
  v_create_meet_mandatory := coalesce((p->>'create_meeting_mandatory')::boolean, true);

  if v_create_meet_name is not null then
    if v_create_meet_start is null then
      return jsonb_build_object('ok', false, 'message',
        'Give the new mandatory meeting a start date and time.');
    end if;
    insert into public.events (
      name, event_type, start_time, is_mandatory, is_public, members_only,
      status, source, created_by, location
    ) values (
      v_create_meet_name,
      'meeting',
      v_create_meet_start,
      v_create_meet_mandatory,
      false,
      true,
      'published',
      'krewe',
      auth.uid(),
      'Members meeting'
    ) returning * into v_meet;
    v_linked_meeting := v_meet.id;
  elsif v_linked_meeting is not null then
    select * into v_meet from public.events where id = v_linked_meeting;
    if not found then
      return jsonb_build_object('ok', false, 'message', 'That linked meeting was not found.');
    end if;
    if coalesce(v_meet.source, '') = 'ikc' then
      return jsonb_build_object('ok', false, 'message', 'IKC events cannot be used as a parade meeting.');
    end if;
    if lower(coalesce(v_meet.event_type, '')) <> 'meeting' then
      return jsonb_build_object('ok', false, 'message', 'Link a meeting event, not another parade or social.');
    end if;
    if v_id is not null and v_linked_meeting = v_id then
      return jsonb_build_object('ok', false, 'message', 'A parade cannot be its own mandatory meeting.');
    end if;
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
      is_online, meeting_url, members_only, member_address, linked_meeting_id
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
      v_meeting_url,
      v_members_only,
      v_member_address,
      v_linked_meeting
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
      members_only = case when p ? 'members_only' then v_members_only else e.members_only end,
      member_address = case when p ? 'member_address' then v_member_address else e.member_address end,
      linked_meeting_id = case
        when (p ? 'linked_meeting_id') or (p ? 'create_meeting_name') then v_linked_meeting
        else e.linked_meeting_id
      end,
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
    'ticket_url_cleared', v_url_cleared,
    'created_meeting_id', v_meet.id
  );
end;
$function$;

revoke all on function public.officer_upsert_event(jsonb) from public;
grant execute on function public.officer_upsert_event(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- E. Soft gate on Door Check-In (not on RSVP)
-- ---------------------------------------------------------------------------
create or replace function public.meeting_check_in(p_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_member uuid;
  v_event public.events%rowtype;
  v_signup_id uuid;
  v_prior text;
  v_window_end timestamptz;
  v_gate jsonb;
begin
  v_member := public.kos_current_member_id();
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Sign in with your member account to check in.');
  end if;
  if v_member is null then
    return jsonb_build_object('ok', false, 'error', 'Your login is not linked to a krewe member record yet.');
  end if;
  if p_code is null or btrim(p_code) = '' then
    return jsonb_build_object('ok', false, 'error', 'Missing check-in code.');
  end if;

  select e.* into v_event
  from public.meeting_checkin_codes c
  join public.events e on e.id = c.event_id
  where c.code = btrim(p_code);

  if not found then
    return jsonb_build_object('ok', false, 'error', 'That check-in code was not found.');
  end if;

  if v_event.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'error', 'That event is cancelled.');
  end if;

  v_gate := public.kos_parade_soft_gate_block(v_event, v_member);
  if v_gate is not null then
    return v_gate;
  end if;

  v_window_end := coalesce(v_event.end_time, v_event.start_time) + interval '12 hours';
  if v_window_end is not null and now() > v_window_end then
    return jsonb_build_object('ok', false, 'error', 'Check-in for this event has closed.');
  end if;

  select s.id, s.status into v_signup_id, v_prior
  from public.event_signups s
  where s.event_id = v_event.id and s.member_id = v_member;

  if v_signup_id is null then
    insert into public.event_signups (event_id, member_id, signup_role, status)
    values (v_event.id, v_member, 'attendee', 'attended')
    on conflict (event_id, member_id) do update set status = 'attended'
    returning id into v_signup_id;
  elsif v_prior is distinct from 'attended' then
    update public.event_signups set status = 'attended' where id = v_signup_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'event', v_event.name,
    'event_id', v_event.id,
    'already', v_prior = 'attended'
  );
end;
$function$;
grant execute on function public.meeting_check_in(text) to authenticated;

create or replace function public.door_check_in(p_code text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_base jsonb;
  v_event_id uuid;
  v_mid uuid := public.kos_current_member_id();
  v_e public.events%rowtype;
  v_hours numeric;
  v_planned numeric;
  v_inserted boolean := false;
  v_gate jsonb;
begin
  -- Soft-gate parade Door Check-In before the Parade Ready engine marks attendance.
  v_event_id := public.kos_checkin_event_for_code(p_code);
  if v_event_id is not null then
    select * into v_e from public.events where id = v_event_id;
    if found then
      v_gate := public.kos_parade_soft_gate_block(v_e, v_mid);
      if v_gate is not null then
        return v_gate;
      end if;
    end if;
  end if;

  v_base := public.meeting_check_in(p_code);
  if coalesce(v_base->>'ok','false') <> 'true' then
    return v_base;
  end if;

  v_event_id := nullif(v_base->>'event_id','')::uuid;
  if v_event_id is null then
    v_event_id := public.kos_checkin_event_for_code(p_code);
  end if;
  if v_event_id is null or v_mid is null then
    return v_base;
  end if;
  insert into public.door_checkins(event_id, member_id)
  values (v_event_id, v_mid)
  on conflict (event_id, member_id) do nothing;
  v_inserted := found;
  if not v_inserted then
    return v_base || jsonb_build_object('already_checked_in', true);
  end if;

  select * into v_e from public.events where id = v_event_id;
  if not found then
    return v_base;
  end if;
  select s.volunteer_hours_planned into v_planned
  from public.event_signups s
  where s.event_id = v_event_id and s.member_id = v_mid
    and s.signup_role = 'volunteer'
    and s.status in ('registered','confirmed','attended')
  order by s.created_at desc nulls last
  limit 1;
  if not found and v_e.event_type <> 'volunteer' then
    return v_base;
  end if;
  v_hours := v_planned;
  if v_hours is null and v_e.start_time is not null and v_e.end_time is not null then
    v_hours := round(extract(epoch from (v_e.end_time - v_e.start_time)) / 3600.0, 1);
  end if;
  v_hours := least(greatest(coalesce(v_hours, 2), 0.5), 24);

  insert into public.volunteer_hours(member_id, season_year, activity, hours, worked_on)
  values (
    v_mid,
    public.kos_volunteer_season_year(),
    'Door check-in: ' || coalesce(v_e.name, 'volunteer event'),
    v_hours,
    coalesce(v_e.start_time, now())::date
  );
  update public.door_checkins set hours_awarded = v_hours
  where event_id = v_event_id and member_id = v_mid;

  return v_base || jsonb_build_object('hours_pending', v_hours);
end;
$$;
revoke all on function public.door_check_in(text) from public;
grant execute on function public.door_check_in(text) to authenticated;

-- ---------------------------------------------------------------------------
-- F. Member Hub parade-season status
-- ---------------------------------------------------------------------------
create or replace function public.member_parade_season()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_mid uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'message', 'Sign in to see parade status.', 'parades', '[]'::jsonb);
  end if;
  v_mid := public.kos_current_member_id();
  if v_mid is null then
    return jsonb_build_object('ok', false, 'message', 'Your login is not linked to a krewe member record yet.', 'parades', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'ok', true,
    'parades', coalesce((
      select jsonb_agg(row_to_json(x) order by x.start_time nulls last)
      from (
        select
          e.id,
          e.name,
          e.description,
          e.start_time,
          e.end_time,
          e.location,
          e.member_address,
          e.flyer_url,
          e.members_only,
          e.is_public,
          e.status,
          e.external_url,
          e.notes,
          e.linked_meeting_id,
          public.kos_member_rsvpd_event(v_mid, e.id) as parade_rsvpd,
          public.kos_member_attended_event(v_mid, e.id) as parade_checked_in,
          (
            select s.status from public.event_signups s
            where s.member_id = v_mid and s.event_id = e.id
            order by s.created_at desc nulls last
            limit 1
          ) as parade_rsvp_status,
          (e.linked_meeting_id is null
            or public.kos_member_attended_event(v_mid, e.linked_meeting_id)) as eligible,
          (e.linked_meeting_id is not null
            and not public.kos_member_attended_event(v_mid, e.linked_meeting_id)) as soft_gate_checkin,
          case when m.id is null then null else jsonb_build_object(
            'id', m.id,
            'name', m.name,
            'start_time', m.start_time,
            'end_time', m.end_time,
            'location', m.location,
            'member_address', m.member_address,
            'is_mandatory', m.is_mandatory,
            'status', m.status,
            'rsvpd', public.kos_member_rsvpd_event(v_mid, m.id),
            'checked_in', public.kos_member_attended_event(v_mid, m.id),
            'rsvp_status', (
              select s.status from public.event_signups s
              where s.member_id = v_mid and s.event_id = m.id
              order by s.created_at desc nulls last
              limit 1
            )
          ) end as meeting
        from public.events e
        left join public.events m on m.id = e.linked_meeting_id
        where e.event_type = 'parade'
          and coalesce(e.source, 'krewe') = 'krewe'
          and lower(coalesce(e.status, 'published')) in ('published', 'live')
          and e.start_time is not null
          and e.start_time >= now() - interval '14 days'
          and e.start_time < now() + interval '400 days'
      ) x
    ), '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.member_parade_season() from public;
grant execute on function public.member_parade_season() to authenticated;

-- ---------------------------------------------------------------------------
-- G. Seed dated Shamrock marches (marketing cards). Skip if already present.
--    Staging streets are intentionally omitted.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select * from (values
      (
        'SantaFest',
        'Tampa''s downtown holiday kickoff parade, a festive start to the krewe''s marching season.',
        timestamp '2026-12-05 10:00:00',
        'Downtown Tampa',
        'https://www.friendsoftamparec.org/santa-fest--tree-lighting.html',
        'assets/img/parades/santafest.webp',
        false
      ),
      (
        'Children''s Gasparilla',
        'The family-friendly, alcohol-free daytime parade along Bayshore: beads, pirates, and big smiles for the little ones.',
        timestamp '2027-01-23 10:00:00',
        'Bayshore Boulevard, Tampa',
        'https://gasparillapiratefest.com/childrens-schedule-of-events/',
        'assets/img/parades/childrens-gasparilla.webp',
        false
      ),
      (
        'Gasparilla Parade of Pirates',
        'The crown jewel: the legendary invasion and grand pirate parade down Bayshore Boulevard.',
        timestamp '2027-01-30 14:00:00',
        'Bayshore Boulevard, Tampa',
        'https://gasparillapiratefest.com/pirate-fest-schedule-of-events/',
        'assets/img/parades/gasparilla-pirates.webp',
        false
      ),
      (
        'Sant''Yago Knight Parade',
        'The dazzling night parade through historic Ybor City: lights, floats, and Latin-quarter energy.',
        timestamp '2027-02-13 19:00:00',
        'Ybor City, Tampa',
        'https://krewesantyago.org/knight-parade',
        'assets/img/parades/santyago-knight.webp',
        false
      )
    ) as t(name, description, start_local, location, external_url, flyer_url, is_featured)
  loop
    if exists (
      select 1 from public.events e
      where e.event_type = 'parade'
        and coalesce(e.source, 'krewe') = 'krewe'
        and lower(e.name) = lower(r.name)
        and e.start_time::date = (r.start_local at time zone 'America/New_York')::date
    ) then
      continue;
    end if;

    insert into public.events (
      name, description, event_type, start_time, location,
      is_public, members_only, status, source, is_featured, external_url, flyer_url, notes
    ) values (
      r.name,
      r.description,
      'parade',
      r.start_local at time zone 'America/New_York',
      r.location,
      true,
      true,
      'published',
      'krewe',
      r.is_featured,
      r.external_url,
      r.flyer_url,
      'Seeded parade-season marketing card. Add the private staging address in Event Studio. Never put a street address in the public teaser.'
    );
  end loop;

  -- Attach castle-float card art to existing Shamrock marches that have no flyer yet.
  update public.events e
  set flyer_url = v.flyer_url
  from (values
    ('SantaFest', 'assets/img/parades/santafest.webp'),
    ('Children''s Gasparilla', 'assets/img/parades/childrens-gasparilla.webp'),
    ('Gasparilla Parade of Pirates', 'assets/img/parades/gasparilla-pirates.webp'),
    ('Sant''Yago Knight Parade', 'assets/img/parades/santyago-knight.webp'),
    ('Tampa Pride', 'assets/img/parades/tampa-pride.webp'),
    ('Rough Riders'' St. Patrick''s Day', 'assets/img/parades/st-patricks.webp'),
    ('Rough Riders'' St. Patrick''s Day Parade', 'assets/img/parades/st-patricks.webp')
  ) as v(name, flyer_url)
  where e.event_type = 'parade'
    and coalesce(e.source, 'krewe') = 'krewe'
    and lower(e.name) = lower(v.name)
    and (e.flyer_url is null or e.flyer_url = '');
end $$;
