-- Krewe of Shamrock — check-in / Parade Ready engine, COMPLETE export.
-- The original migrations (kos_parade_ready_engine, kos_checkin_codes_private)
-- were applied to oazwkwflgbthojvnclfc but never committed to this repository.
-- This file re-homes the whole engine, exported verbatim from the live
-- database on 2026-09-19 via pg_get_functiondef / pg_get_viewdef and the
-- system catalogs (columns, constraints, indexes, row-level-security
-- policies, grants). Safe to run more than once; on the live database every
-- statement is a no-op or an identical redefinition.
--
-- Depends on objects defined elsewhere in this repository:
--   events, event_signups (kos_public_events_and_rsvp.sql, kos_event_studio.sql),
--   members, profiles, member_roles (kos_shamrock_leaders_roster_and_rbac.sql),
--   can_manage_social_charity (kos_social_charity_rbac.sql),
--   extensions.gen_random_bytes (pgcrypto, enabled by Supabase).
--
-- Two observations for future maintainers (facts of the live schema, kept
-- verbatim, not opinions to "fix" silently):
--   * volunteer_hours.season_year DEFAULTS to the calendar year, while the
--     hours math in v_parade_ready groups by krewe_volunteer_season_year()
--     (June rolls into the next season). Inserters set season_year explicitly
--     (members.html and door_check_in both do), so the default rarely matters.
--   * waiver_signed in v_parade_ready checks season_year = calendar year,
--     not krewe_volunteer_season_year().

-- ========== TABLES ==========

create table if not exists public.waivers (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  season_year integer not null,
  signed_name text not null,
  signed_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (member_id, season_year)
);

create table if not exists public.volunteer_hours (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  season_year integer not null default (extract(year from current_date))::integer,
  activity text not null,
  hours numeric(7,2) not null check (hours > 0),
  worked_on date default current_date,
  approved boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  event_id uuid references public.events(id) on delete set null,
  signup_id uuid references public.event_signups(id) on delete set null
);
create index if not exists volunteer_hours_event_idx on public.volunteer_hours(event_id);
create unique index if not exists volunteer_hours_signup_uidx
  on public.volunteer_hours(signup_id) where (signup_id is not null);

create table if not exists public.dues_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  membership_year integer not null default (extract(year from current_date))::integer,
  amount numeric not null default 0 check (amount >= 0),
  due_date date,
  paid boolean not null default false,
  paid_date date,
  payment_method text check (payment_method is null or payment_method in ('cash','check','card','paypal','square','other')),
  notes text,
  created_at timestamptz not null default now()
);
create unique index if not exists dues_payments_member_year_uidx
  on public.dues_payments(member_id, membership_year);

create table if not exists public.meeting_checkin_codes (
  event_id uuid primary key references public.events(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create unique index if not exists meeting_checkin_codes_code_key
  on public.meeting_checkin_codes(code);

-- ========== RLS ==========
alter table public.waivers enable row level security;
alter table public.volunteer_hours enable row level security;
alter table public.dues_payments enable row level security;
alter table public.meeting_checkin_codes enable row level security;
-- meeting_checkin_codes has NO policies on purpose: codes are secrets, read
-- and written only through the security-definer functions below.

drop policy if exists "waivers_self_or_officer" on public.waivers;
create policy "waivers_self_or_officer" on public.waivers
  for all to authenticated
  using (member_id = public.kos_current_member_id() or public.is_krewe_officer())
  with check (member_id = public.kos_current_member_id() or public.is_krewe_officer());

drop policy if exists "volunteer_hours_self_or_officer" on public.volunteer_hours;
create policy "volunteer_hours_self_or_officer" on public.volunteer_hours
  for all to authenticated
  using (member_id = public.kos_current_member_id() or public.is_krewe_officer())
  with check (member_id = public.kos_current_member_id() or public.is_krewe_officer());

drop policy if exists "dues_select_self_or_officer" on public.dues_payments;
create policy "dues_select_self_or_officer" on public.dues_payments
  for select to authenticated
  using (member_id = public.kos_current_member_id() or public.is_krewe_officer());

drop policy if exists "dues_officer_write" on public.dues_payments;
create policy "dues_officer_write" on public.dues_payments
  for all to authenticated
  using (public.is_krewe_officer())
  with check (public.is_krewe_officer());

-- ========== HELPER FUNCTIONS (verbatim exports) ==========

CREATE OR REPLACE FUNCTION public.kos_current_member_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.member_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
$function$;
grant execute on function public.kos_current_member_id() to authenticated;

CREATE OR REPLACE FUNCTION public.krewe_volunteer_season_year(p_on date DEFAULT CURRENT_DATE)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when extract(month from p_on) >= 6 then extract(year from p_on)::int + 1
    else extract(year from p_on)::int
  end;
$function$;

CREATE OR REPLACE FUNCTION public.is_krewe_officer()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.member_roles r
    WHERE r.user_id = auth.uid()
      AND r.role IN ('board', 'officer', 'captain', 'treasurer', 'secretary')
  )
  OR EXISTS (
    SELECT 1 FROM public.members m
    JOIN public.profiles p ON p.member_id = m.id
    WHERE p.id = auth.uid()
      AND m.membership_status = 'active'
      AND m.merged_into IS NULL
      AND (
        m.member_role IN ('officer', 'captain', 'board')
        OR (
          coalesce(m.officer_title, '') ~* '(president|vice president|treasurer|secretary|board member|(^|·) ?board($| ·)|committee chair|chair of)'
          AND coalesce(m.officer_title, '') !~* 'merchandise'
        )
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.member_roles r
    WHERE r.user_id = auth.uid()
      AND r.role = 'committee'
      AND coalesce(r.committee, '') !~* '(merchandise|merch|shop|store)'
      AND coalesce(r.committee, '') <> ''
  );
$function$;
grant execute on function public.is_krewe_officer() to authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_events()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.is_krewe_officer()
    or public.can_manage_social_charity()
    or exists (
      select 1 from public.member_roles r
      where r.user_id = auth.uid()
        and (
          r.role in ('board','officer','captain','committee_chair')
          or (
            r.role in ('committee','committee_chair')
            and coalesce(r.committee,'') ~* '(social|charity|charities|events|event)'
          )
        )
    )
    or exists (
      select 1
      from public.members m
      join public.profiles p on p.member_id = m.id
      where p.id = auth.uid()
        and m.membership_status = 'active'
        and (
          m.member_role in ('officer','captain','board')
          or coalesce(m.officer_title,'') ~* '(social|charity|charities|events?\\s+chair|event\\s+committee)'
          or (
            coalesce(m.officer_title,'') ~* '(chair|committee)'
            and coalesce(m.officer_title,'') !~* '(merchandise|merch|shop|store)'
          )
        )
    );
$function$;
grant execute on function public.can_manage_events() to authenticated;

-- ========== ENGINE FUNCTIONS (verbatim exports) ==========

CREATE OR REPLACE FUNCTION public.meeting_check_in(p_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare
  v_member uuid;
  v_event public.events%rowtype;
  v_signup_id uuid;
  v_prior text;
  v_window_end timestamptz;
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

CREATE OR REPLACE FUNCTION public.officer_enable_checkin(p_event uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare
  v_code text;
  v_status text;
  v_tries int := 0;
begin
  if not public.can_manage_events() then
    raise exception 'Only officers and event chairs can make a door check-in QR.';
  end if;
  if p_event is null then
    raise exception 'Event is required.';
  end if;

  select status into v_status from public.events where id = p_event;
  if not found then
    raise exception 'Event not found.';
  end if;
  if v_status = 'cancelled' then
    raise exception 'That event is cancelled.';
  end if;

  select c.code into v_code
  from public.meeting_checkin_codes c
  where c.event_id = p_event;
  if v_code is not null then
    return v_code;
  end if;

  loop
    v_tries := v_tries + 1;
    v_code := encode(extensions.gen_random_bytes(12), 'hex');
    begin
      insert into public.meeting_checkin_codes (event_id, code, created_by)
      values (p_event, v_code, auth.uid())
      on conflict (event_id) do nothing;
    exception when unique_violation then
      v_code := null;
    end;

    select c.code into v_code
    from public.meeting_checkin_codes c
    where c.event_id = p_event;
    if v_code is not null then
      return v_code;
    end if;
    if v_tries >= 5 then
      raise exception 'Could not create a check-in code. Try again.';
    end if;
  end loop;
end;
$function$;
grant execute on function public.officer_enable_checkin(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.officer_upsert_meeting(p_name text, p_start timestamp with time zone, p_mandatory boolean DEFAULT true) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare
  v_id uuid;
  v_name text;
begin
  if not public.can_manage_events() then
    raise exception 'Only officers and event chairs can schedule meetings.';
  end if;

  v_name := nullif(btrim(coalesce(p_name, '')), '');
  if v_name is null or char_length(v_name) < 3 then
    raise exception 'Give the meeting a name.';
  end if;
  if p_start is null then
    raise exception 'Give the meeting a date and time.';
  end if;

  insert into public.events (
    name, event_type, start_time, is_mandatory, is_public, status, source
  ) values (
    v_name,
    'meeting',
    p_start,
    coalesce(p_mandatory, true),
    false,
    'published',
    'krewe'
  )
  returning id into v_id;

  return v_id;
end;
$function$;
grant execute on function public.officer_upsert_meeting(text, timestamptz, boolean) to authenticated;

CREATE OR REPLACE FUNCTION public.officer_review_hours(p_id uuid, p_approved boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
begin
  if not public.is_krewe_officer() then
    raise exception 'Only officers can review volunteer hours';
  end if;
  update public.volunteer_hours
  set approved = p_approved,
      status = case when p_approved then 'approved' else 'pending' end
  where id = p_id;
end;
$function$;
grant execute on function public.officer_review_hours(uuid, boolean) to authenticated;

-- ========== VIEW (verbatim export; rows self-filter to the caller ==========
-- ========== or, for officers, the whole roster)                    ==========

create or replace view public.v_parade_ready as
 SELECT id AS member_id,
    first_name,
    last_name,
    membership_status,
    (EXISTS ( SELECT 1
           FROM dues_payments d
          WHERE d.member_id = m.id AND d.membership_year = EXTRACT(year FROM CURRENT_DATE)::integer AND d.paid)) AS dues_paid,
    (EXISTS ( SELECT 1
           FROM waivers w
          WHERE w.member_id = m.id AND w.season_year = EXTRACT(year FROM CURRENT_DATE)::integer)) AS waiver_signed,
    (EXISTS ( SELECT 1
           FROM event_signups s
             JOIN events e ON e.id = s.event_id
          WHERE s.member_id = m.id AND s.status = 'attended'::text AND e.event_type = 'meeting'::text AND e.is_mandatory AND e.start_time >= date_trunc('year'::text, now()))) AS meeting_attended,
    COALESCE(( SELECT sum(v.hours) AS sum
           FROM volunteer_hours v
          WHERE v.member_id = m.id AND v.season_year = krewe_volunteer_season_year(CURRENT_DATE) AND v.approved AND COALESCE(v.is_demo, false) = false), 0::numeric) AS hours_approved,
    COALESCE(( SELECT sum(v.hours) AS sum
           FROM volunteer_hours v
          WHERE v.member_id = m.id AND v.season_year = krewe_volunteer_season_year(CURRENT_DATE) AND COALESCE(v.is_demo, false) = false), 0::numeric) AS hours_logged,
    COALESCE(( SELECT sum(v.hours) AS sum
           FROM volunteer_hours v
          WHERE v.member_id = m.id AND v.season_year = krewe_volunteer_season_year(CURRENT_DATE) AND v.approved AND COALESCE(v.is_demo, false) = false), 0::numeric) AS volunteer_hours_approved,
    COALESCE(( SELECT sum(v.hours) AS sum
           FROM volunteer_hours v
          WHERE v.member_id = m.id AND v.season_year = krewe_volunteer_season_year(CURRENT_DATE) AND COALESCE(v.is_demo, false) = false), 0::numeric) AS volunteer_hours_logged
   FROM members m
  WHERE COALESCE(membership_status, ''::text) <> 'merged'::text AND merged_into IS NULL AND (id = kos_current_member_id() OR is_krewe_officer());

grant select on public.v_parade_ready to anon, authenticated;
