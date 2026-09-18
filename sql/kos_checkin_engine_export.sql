-- Krewe of Shamrock — check-in engine, reconstructed export.
-- The original migrations (kos_parade_ready_engine, kos_checkin_codes_private)
-- were applied to oazwkwflgbthojvnclfc but never committed to this repository.
-- This file re-homes what has been exported from the live database so the
-- backend can be rebuilt from the repo. Safe to run more than once; on the
-- live database every statement is a no-op or an identical redefinition.
--
-- STATUS OF THIS EXPORT
--   [exported ] meeting_check_in(text)  — verbatim from
--               pg_get_functiondef, 2026-09-18 (formatting normalized).
--   [inferred ] meeting_checkin_codes   — column names confirmed by the
--               function below (code, event_id); constraints and defaults are
--               a best-effort guess and yield to the live table (IF NOT EXISTS).
--   [still missing] officer_enable_checkin, officer_upsert_meeting,
--               officer_review_hours, kos_current_member_id, v_parade_ready,
--               waivers, volunteer_hours. Export each with
--               select pg_get_functiondef('<name>(<args>)'::regprocedure);
--               and, for tables, the Supabase table editor's definition tab.
--
-- KEY FACT this export settled: meeting attendance is stored in
-- public.event_signups (status = 'attended') — there is no separate
-- meeting-attendance table. v_parade_ready's meeting_attended derives from it.

-- ========== TABLE (inferred; the live table wins) ==========
create table if not exists public.meeting_checkin_codes (
  event_id uuid primary key references public.events(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);
alter table public.meeting_checkin_codes enable row level security;

-- ========== FUNCTION (verbatim export) ==========
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
