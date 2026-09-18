-- Event Studio: members-only events with a private member address.
-- Applied the same way as sql/kos_event_studio_raffle_meal_online.sql.
-- Safe to re-run.
--
-- Public pages use location as a safe teaser. member_address is the full
-- street address: Member Hub + RSVP confirmation email only. Anonymous
-- PostgREST cannot select that column.

-- ---------------------------------------------------------------------------
-- A. Columns
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists members_only boolean not null default false,
  add column if not exists member_address text;

comment on column public.events.members_only is
  'When true, this is a members-only event. Public pages may show title, date, and location teaser only.';
comment on column public.events.member_address is
  'Full member / host street address. Never exposed on public pages or to anon. Shown in Member Hub and RSVP confirmation email.';
comment on column public.events.location is
  'Public location teaser (venue name, city, or vague line). Safe for anonymous pages. Use member_address for the street address.';

-- ---------------------------------------------------------------------------
-- B. Anonymous clients cannot read the private address
-- ---------------------------------------------------------------------------
-- Do not GRANT SELECT ON TABLE to anon. Table-level SELECT/ALL makes
-- REVOKE SELECT (member_address) a no-op (see kos_event_member_address_anon_lockdown.sql).
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

drop policy if exists events_select_auth on public.events;
drop policy if exists events_select_authenticated on public.events;
create policy events_select_authenticated on public.events
  for select to authenticated
  using (
    is_public = true
    or (
      members_only = true
      and lower(coalesce(status, 'published')) = 'published'
    )
    or public.can_manage_events()
  );

-- Public-safe projection: no member_address, no meeting_url.
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
-- C. officer_upsert_event: persist members_only + member_address
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
      is_online, meeting_url, members_only, member_address
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
      v_member_address
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
-- D. rsvp_to_event: members-only gate + private address in confirmation email
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
  v_member_status text;
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
  v_addr_html text := '';
  v_members_only boolean;
  v_member_address text;
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
         coalesce(is_online, false), meeting_url,
         coalesce(members_only, false), member_address
    into v_event_name, v_capacity, v_event_source, v_ticket_url, v_reg_closes,
         v_collect_meals, v_meal_options, v_is_online, v_meeting_url,
         v_members_only, v_member_address
  from public.events
  where id = p_event_id
    and source <> 'ikc'
    and (
      is_public = true
      or coalesce(members_only, false) = true
    );
  if not found then
    return jsonb_build_object('ok', false, 'message', 'That event was not found or is not open for signups.');
  end if;

  if v_reg_closes is not null and now() >= v_reg_closes then
    return jsonb_build_object('ok', false, 'message', 'Registration closed for this event.', 'registration_closed', true);
  end if;

  v_meeting_url := public.kos_clean_meeting_url(v_meeting_url);
  v_member_address := nullif(btrim(coalesce(v_member_address, '')), '');

  select id, membership_status into v_member_id, v_member_status
    from public.members where lower(email) = lower(p_email);

  if v_members_only then
    if v_member_id is null
       or lower(coalesce(v_member_status, '')) in ('prospect', 'pending-new', 'pending') then
      return jsonb_build_object(
        'ok', false,
        'members_only', true,
        'message', 'This event is for Krewe members. Sign in on the Member Hub, or RSVP with the email on your member record.'
      );
    end if;
  elsif v_member_id is null then
    insert into public.members (first_name, last_name, email, member_role, membership_status)
    values (btrim(p_first_name), btrim(p_last_name), lower(p_email), 'prospect', 'prospect')
    returning id into v_member_id;
  end if;

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

  -- Private street address: confirmation email only, and only after a real seat.
  if v_status <> 'waitlisted' and v_member_address is not null then
    v_addr_html := '<p>Member address: '
      || public.kos_escape_html(v_member_address)
      || '</p>';
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
           || v_addr_html
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
           || v_addr_html
           || '<p>Slainte!<br/>Krewe of Shamrock</p>';
  end if;

  -- Same outbound_emails / Resend path as online join links.
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
    'members_only', v_members_only,
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
