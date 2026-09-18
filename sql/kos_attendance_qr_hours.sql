-- Krewe of Shamrock — Phase 4 of QR_LIBRARY_BUILD_PLAN.md:
-- hours-on-scan + live door count for the door check-in QR.
-- Applied to oazwkwflgbthojvnclfc. Safe to run more than once.
--
-- Design notes for future readers:
-- * The original check-in engine (meeting_check_in, meeting_checkin_codes,
--   from migrations kos_parade_ready_engine / kos_checkin_codes_private) is
--   NOT in this repository. This migration therefore never rewrites it: the
--   new door_check_in() calls the existing meeting_check_in() unchanged, so
--   Parade Ready attendance keeps working exactly as before, and records the
--   scan in a new, fully-committed door_checkins table that the live door
--   count and hours-on-scan are built on.
-- * Hours-on-scan: when the scanned event is a volunteer event (or the member
--   signed up as a volunteer for it), the same scan logs a PENDING
--   volunteer_hours row with the same columns members.html uses for manual
--   logging. Officers still approve it through the existing review flow.
--   First scan per member per event only (door_checkins is unique on both).

-- ========== TABLE ==========
create table if not exists public.door_checkins (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  checked_at timestamptz not null default now(),
  hours_awarded numeric(5,2)
);
do $$ begin
  alter table public.door_checkins drop constraint if exists door_checkins_event_member_key;
  alter table public.door_checkins add constraint door_checkins_event_member_key unique (event_id, member_id);
exception when others then null; end $$;
create index if not exists door_checkins_event_time_idx on public.door_checkins(event_id, checked_at);

-- Locked down; all access goes through the RPCs below.
alter table public.door_checkins enable row level security;

-- ========== HELPERS ==========
-- Season year matches kreweVolunteerSeasonYear() in members.html:
-- June or later belongs to the season ending NEXT year.
create or replace function public.kos_volunteer_season_year() returns int
language sql stable set search_path to 'public' as $$
  select case when extract(month from now()) >= 6
              then extract(year from now())::int + 1
              else extract(year from now())::int end;
$$;

-- Map a check-in code to its event via the (uncommitted) meeting_checkin_codes
-- table. Looked up dynamically and guarded, so if that table's columns differ
-- the check-in itself still succeeds and only hours-on-scan quietly no-ops.
create or replace function public.kos_checkin_event_for_code(p_code text) returns uuid
language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_event uuid;
begin
  begin
    execute 'select event_id from public.meeting_checkin_codes where code = $1 limit 1'
      into v_event using p_code;
  exception when undefined_table or undefined_column then
    v_event := null;
  end;
  return v_event;
end;
$$;
revoke all on function public.kos_checkin_event_for_code(text) from public;

-- Tell whoever runs this migration if the column guess above is wrong.
do $$
declare v_cols text;
begin
  if to_regclass('public.meeting_checkin_codes') is null then
    raise warning 'meeting_checkin_codes not found: hours-on-scan will no-op until the check-in engine exists.';
  elsif not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'meeting_checkin_codes'
      and column_name in ('event_id')
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'meeting_checkin_codes'
      and column_name in ('code')
  ) then
    select string_agg(column_name, ', ' order by ordinal_position) into v_cols
    from information_schema.columns
    where table_schema = 'public' and table_name = 'meeting_checkin_codes';
    raise warning 'meeting_checkin_codes has columns (%) — kos_checkin_event_for_code expects event_id and code; adjust it and re-run.', v_cols;
  end if;
end $$;

-- ========== MEMBER RPC: door check-in with hours-on-scan ==========
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
begin
  -- 1) The existing Parade Ready engine does the actual attendance marking.
  v_base := public.meeting_check_in(p_code);
  if coalesce(v_base->>'ok','false') <> 'true' then
    return v_base;
  end if;

  -- 2) Record the scan in the committed door log (first scan per event only).
  -- meeting_check_in returns event_id (confirmed by the exported source in
  -- sql/kos_checkin_engine_export.sql); the guarded lookup stays as fallback.
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

  -- 3) Hours-on-scan, volunteer events only.
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
    return v_base; -- not a volunteer event and no volunteer signup: attendance only
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

-- ========== OFFICER RPC: live door count ==========
create or replace function public.officer_door_count(p_event uuid) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if auth.uid() is null or not public.is_krewe_officer() then
    raise exception 'Officers only.';
  end if;
  return jsonb_build_object(
    'count', coalesce((select count(*)::int from public.door_checkins d where d.event_id = p_event), 0),
    'hours_pending', coalesce((select round(sum(d.hours_awarded),1) from public.door_checkins d where d.event_id = p_event), 0),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', trim(both ' ' from coalesce(m.first_name,'') || ' ' || coalesce(m.last_name,'')),
        'at', d.checked_at,
        'hours', d.hours_awarded
      ) order by d.checked_at desc)
      from (
        select * from public.door_checkins
        where event_id = p_event
        order by checked_at desc
        limit 12
      ) d
      join public.members m on m.id = d.member_id
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.officer_door_count(uuid) from public;
grant execute on function public.officer_door_count(uuid) to authenticated;
