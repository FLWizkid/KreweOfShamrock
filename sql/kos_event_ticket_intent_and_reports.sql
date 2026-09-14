-- Unify WA-style event ticket data onto the Krewe site + Zeffy.
-- Capture guests / guest names / raffle qty / ticket type before Zeffy,
-- mark Website RSVP paid when Zeffy webhook succeeds, and surface those
-- fields on officer_event_report (legacy Old site rows unchanged).

-- ---------------------------------------------------------------------------
-- A. events: officer toggles for what the public RSVP form collects
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists collect_guests boolean not null default true,
  add column if not exists collect_guest_names boolean not null default true,
  add column if not exists collect_raffle boolean not null default true,
  add column if not exists raffle_options text not null default '0,1,5,15';

comment on column public.events.collect_guests is
  'When true, public RSVP asks for guest count (WA-style).';
comment on column public.events.collect_guest_names is
  'When true and guests > 0, public RSVP asks for guest names.';
comment on column public.events.collect_raffle is
  'When true, public RSVP asks for raffle ticket quantity before Zeffy.';
comment on column public.events.raffle_options is
  'Comma-separated raffle qty choices shown on RSVP (e.g. 0,1,5,15).';

-- ---------------------------------------------------------------------------
-- B. event_signups: persist intent + Zeffy paid link
-- ---------------------------------------------------------------------------
alter table public.event_signups
  add column if not exists raffle_tickets integer not null default 0,
  add column if not exists guest_names text,
  add column if not exists ticket_type text,
  add column if not exists payment_status text,
  add column if not exists payment_id uuid references public.payments(id) on delete set null,
  add column if not exists amount_cents integer;

alter table public.event_signups
  drop constraint if exists event_signups_payment_status_check;
alter table public.event_signups
  add constraint event_signups_payment_status_check
  check (payment_status is null or payment_status in (
    'pending', 'paid', 'already_purchased', 'n/a', 'unpaid'
  ));

comment on column public.event_signups.raffle_tickets is
  'Raffle ticket quantity chosen on site before Zeffy (WA raffle_choice).';
comment on column public.event_signups.guest_names is
  'Optional guest names (newline or comma separated), mirroring WA guest rows.';
comment on column public.event_signups.ticket_type is
  'Optional ticket/role label (WA ticket_type), else signup_role is used.';
comment on column public.event_signups.payment_status is
  'pending before Zeffy, paid after webhook, already_purchased for covered RSVPs.';
comment on column public.event_signups.payment_id is
  'Linked Zeffy/Stripe payments row when paid via webhook.';
comment on column public.event_signups.amount_cents is
  'Amount attributed to this signup when matched to a payment.';

create index if not exists event_signups_payment_id_idx
  on public.event_signups (payment_id)
  where payment_id is not null;

-- ---------------------------------------------------------------------------
-- C. rsvp_to_event: accept WA-mirrored fields; set payment_status
-- ---------------------------------------------------------------------------
drop function if exists public.rsvp_to_event(uuid, text, text, text, integer, text, numeric);
drop function if exists public.rsvp_to_event(uuid, text, text, text, integer, text, numeric, text);

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
  p_payment_status text default null
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
  v_subject   text;
  v_body      text;
  v_hours_planned numeric;
  v_note      text;
  v_clovers_awarded int := 0;
  v_raffle int := greatest(coalesce(p_raffle_tickets, 0), 0);
  v_guest_names text;
  v_ticket_type text;
  v_pay_status text;
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

  v_pay_status := nullif(lower(btrim(coalesce(p_payment_status, ''))), '');
  if v_pay_status is not null and v_pay_status not in (
    'pending', 'paid', 'already_purchased', 'n/a', 'unpaid'
  ) then
    v_pay_status := null;
  end if;

  select name, capacity, source, ticket_payment_url
    into v_event_name, v_capacity, v_event_source, v_ticket_url
  from public.events
  where id = p_event_id and is_public = true and source <> 'ikc';
  if not found then
    return jsonb_build_object('ok', false, 'message', 'That event was not found or is not open for signups.');
  end if;

  -- Default payment_status when caller omitted it
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
    raffle_tickets, guest_names, ticket_type, payment_status
  ) values (
    p_event_id, v_member_id, p_signup_role, v_status, p_guests_count,
    v_hours_planned, v_note,
    v_raffle, v_guest_names, v_ticket_type, v_pay_status
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
                payment_status = case
                  when public.event_signups.payment_status = 'paid' then 'paid'
                  else excluded.payment_status
                end
  returning id into v_signup_id;

  if v_status = 'waitlisted' then
    v_subject := 'You''re on the waitlist: ' || v_event_name;
    v_body := '<p>Hi ' || btrim(p_first_name) || ',</p>'
           || '<p>Thanks for signing up for <strong>' || v_event_name || '</strong>. '
           || 'That event is currently full, so you''ve been added to the <strong>waitlist</strong>. '
           || 'We''ll be in touch if a spot opens up.</p><p>Slainte!<br/>Krewe of Shamrock</p>';
  elsif v_pay_status = 'pending' then
    v_subject := 'Almost there: ' || v_event_name;
    v_body := '<p>Hi ' || btrim(p_first_name) || ',</p>'
           || '<p>We saved your spot for <strong>' || v_event_name || '</strong>'
           || case when p_guests_count > 0 then ' with ' || p_guests_count || ' guest(s)' else '' end
           || case when v_raffle > 0 then ' and ' || v_raffle || ' raffle ticket(s)' else '' end
           || '. Finish checkout on Zeffy to complete payment. If you already paid in another tab, you''re all set.</p>'
           || '<p>Slainte!<br/>Krewe of Shamrock</p>';
  else
    v_subject := 'You''re signed up: ' || v_event_name;
    v_body := '<p>Hi ' || btrim(p_first_name) || ',</p>'
           || '<p>You''re confirmed for <strong>' || v_event_name || '</strong>'
           || case when p_guests_count > 0 then ' with ' || p_guests_count || ' guest(s)' else '' end
           || case when p_signup_role in ('volunteer','organizer') then ' as a <strong>volunteer</strong>' else '' end
           || '. We can''t wait to see you!</p><p>Slainte!<br/>Krewe of Shamrock</p>';
  end if;

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

grant execute on function public.rsvp_to_event(uuid,text,text,text,integer,text,numeric,text,integer,text,text,text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- D. kos_auto_rsvp_from_payment: mark signup paid + attach payment
-- ---------------------------------------------------------------------------
create or replace function public.kos_auto_rsvp_from_payment(
  p_event_id uuid,
  p_member_id uuid,
  p_guests integer default 0,
  p_note text default 'Tickets purchased via Zeffy'::text,
  p_payment_id uuid default null,
  p_amount_cents integer default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    event_id, member_id, signup_role, status, guests_count, notes,
    payment_status, payment_id, amount_cents
  ) values (
    p_event_id, p_member_id, 'attendee', v_status, v_guests, v_note,
    'paid', p_payment_id, p_amount_cents
  )
  on conflict (event_id, member_id) do update
    set status = case
          when public.event_signups.status in ('attended', 'confirmed') then public.event_signups.status
          else excluded.status
        end,
        guests_count = greatest(public.event_signups.guests_count, excluded.guests_count),
        notes = coalesce(public.event_signups.notes, excluded.notes),
        payment_status = 'paid',
        payment_id = coalesce(excluded.payment_id, public.event_signups.payment_id),
        amount_cents = coalesce(excluded.amount_cents, public.event_signups.amount_cents)
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
    'payment_status', 'paid',
    'clovers_awarded', v_clovers
  );
end;
$function$;

-- ---------------------------------------------------------------------------
-- E. kos_record_payment: pass payment id + amount into auto-RSVP
-- ---------------------------------------------------------------------------
create or replace function public.kos_record_payment(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
  v_amount int;
  v_share int;
begin
  v_kind := coalesce(p->>'product_kind', 'other');
  if v_kind not in ('store', 'event', 'dues', 'donation', 'raffle', 'other') then
    v_kind := 'other';
  end if;
  v_year := coalesce(
    nullif(p->>'membership_year', '')::integer,
    extract(year from current_date)::integer
  );
  v_amount := coalesce((p->>'amount_cents')::integer, 0);

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
    v_amount,
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

  if v_kind = 'event' and v_event is not null and coalesce(array_length(v_matched, 1), 0) > 0 then
    for v_i in 1 .. array_length(v_matched, 1) loop
      v_guests := case
        when v_i = 1 and array_length(v_matched, 1) = 1
          then greatest(v_ticket_count - 1, 0)
        else 0
      end;
      -- Attribute full amount to sole match; otherwise put dollars on first only
      v_share := case when v_i = 1 then v_amount else null end;
      v_rsvp := public.kos_auto_rsvp_from_payment(
        v_event,
        v_matched[v_i],
        v_guests,
        'Tickets purchased via Zeffy',
        v_id,
        v_share
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
$function$;

-- ---------------------------------------------------------------------------
-- F. officer_upsert_event: persist collect_* toggles
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

  if v_featured then
    update public.events set is_featured = false where is_featured = true and (v_id is null or id <> v_id);
  end if;

  if v_id is null then
    insert into public.events(
      name, description, event_type, start_time, end_time, location, capacity,
      is_mandatory, is_public, notes, source, ticket_price_cents, ticket_label,
      ticket_payment_url, flyer_url, status, created_by, is_featured,
      collect_guests, collect_guest_names, collect_raffle, raffle_options
    ) values (
      v_name, nullif(p->>'description',''), coalesce(nullif(p->>'event_type',''),'social'),
      v_start, nullif(p->>'end_time','')::timestamptz, nullif(p->>'location',''),
      nullif(p->>'capacity','')::integer,
      coalesce((p->>'is_mandatory')::boolean, false),
      coalesce((p->>'is_public')::boolean, true),
      nullif(p->>'notes',''), 'krewe',
      nullif(p->>'ticket_price_cents','')::integer,
      nullif(p->>'ticket_label',''),
      nullif(p->>'ticket_payment_url',''),
      nullif(p->>'flyer_url',''),
      coalesce(nullif(p->>'status',''),'published'),
      auth.uid(),
      v_featured,
      coalesce((p->>'collect_guests')::boolean, true),
      coalesce((p->>'collect_guest_names')::boolean, true),
      coalesce((p->>'collect_raffle')::boolean, true),
      v_raffle_opts
    ) returning * into v_row;
  else
    update public.events e set
      name = v_name,
      description = coalesce(nullif(p->>'description',''), e.description),
      event_type = coalesce(nullif(p->>'event_type',''), e.event_type),
      start_time = v_start,
      end_time = case when p ? 'end_time' then nullif(p->>'end_time','')::timestamptz else e.end_time end,
      location = case when p ? 'location' then nullif(p->>'location','') else e.location end,
      capacity = case when p ? 'capacity' then nullif(p->>'capacity','')::integer else e.capacity end,
      is_mandatory = coalesce((p->>'is_mandatory')::boolean, e.is_mandatory),
      is_public = coalesce((p->>'is_public')::boolean, e.is_public),
      notes = case when p ? 'notes' then nullif(p->>'notes','') else e.notes end,
      ticket_price_cents = case when p ? 'ticket_price_cents' then nullif(p->>'ticket_price_cents','')::integer else e.ticket_price_cents end,
      ticket_label = case when p ? 'ticket_label' then nullif(p->>'ticket_label','') else e.ticket_label end,
      ticket_payment_url = case when p ? 'ticket_payment_url' then nullif(p->>'ticket_payment_url','') else e.ticket_payment_url end,
      flyer_url = case when p ? 'flyer_url' then nullif(p->>'flyer_url','') else e.flyer_url end,
      status = coalesce(nullif(p->>'status',''), e.status),
      is_featured = case when p ? 'is_featured' then v_featured else e.is_featured end,
      collect_guests = case when p ? 'collect_guests' then coalesce((p->>'collect_guests')::boolean, true) else e.collect_guests end,
      collect_guest_names = case when p ? 'collect_guest_names' then coalesce((p->>'collect_guest_names')::boolean, true) else e.collect_guest_names end,
      collect_raffle = case when p ? 'collect_raffle' then coalesce((p->>'collect_raffle')::boolean, true) else e.collect_raffle end,
      raffle_options = case when p ? 'raffle_options' then v_raffle_opts else e.raffle_options end,
      updated_at = now()
    where e.id = v_id and coalesce(e.source,'') <> 'ikc'
    returning * into v_row;
    if not found then
      return jsonb_build_object('ok', false, 'message', 'Event not found or cannot be edited (IKC sync events are read-only).');
    end if;
  end if;

  return jsonb_build_object('ok', true, 'event', to_jsonb(v_row));
end;
$function$;

-- ---------------------------------------------------------------------------
-- G. officer_event_report: Website RSVP shows guests, raffle, Zeffy paid
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
