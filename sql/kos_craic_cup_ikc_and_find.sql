-- ============================================================================
-- Craic Cup upgrade: July 1 season rule, IKC sister-krewe attendance claims,
-- and Find My Clovers by member name with this season's event history.
--
-- What this changes (also applied to Supabase as migration
-- kos_craic_cup_ikc_and_find):
--
--  1. THE SEASON RULE: the Craic Cup season runs July 1 - June 30.
--     public.craic_season_year() returns the year the current season STARTED
--     (September 2026 -> 2026, March 2027 -> still 2026). Season Clovers,
--     both leaderboards, and the claim forms all use it, so everything
--     "starts as of July 1". Existing ledger rows (all written since
--     September 2026 with season_year 2026) already carry the right label;
--     the relabel UPDATE below is a safety no-op that would fix any row
--     whose created_at fell January-June.
--
--  2. submit_clover_request() learns a new activity code:
--       'attend_ikc_event'  ->  +25 Clovers
--     "Attend another IKC krewe's event" - rewards showing up for the wider
--     Irish Krewe family. Officer-approved like every other claim.
--
--  3. search_craic_members(p_name) - signed-in members type a NAME (not an
--     email) and get matching roster members with Clover totals and rank.
--
--  4. get_craic_member_card(p_member_id) - the full Craic Cup card for one
--     member: rank, lifetime/season Clovers, badges, recent ledger AND their
--     event history SINCE JULY 1 of the current season - every RSVP with its
--     status, signup role, guests, ticket type, payment status and amount,
--     plus any Wild Apricot-imported registrations in the same window.
--
-- Both new lookup functions require a signed-in Hub user (auth.uid()), so
-- nothing here is readable anonymously.
-- ============================================================================

-- 1) The season clock: July 1 starts a new Craic Cup season, labeled by the
--    year it started in (America/New_York, same clock the Hub already uses).
CREATE OR REPLACE FUNCTION public.craic_season_year(p_at timestamptz DEFAULT now())
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN EXTRACT(month FROM timezone('America/New_York', p_at)) >= 7
      THEN EXTRACT(year FROM timezone('America/New_York', p_at))::int
    ELSE EXTRACT(year FROM timezone('America/New_York', p_at))::int - 1
  END;
$function$;

-- First day of the current season - history in Find My Clovers starts here.
CREATE OR REPLACE FUNCTION public.craic_season_start(p_at timestamptz DEFAULT now())
RETURNS date
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT make_date(public.craic_season_year(p_at), 7, 1);
$function$;

-- Auto-awarded rows (RSVP +5, etc.) stamp season_year via the column default.
ALTER TABLE public.clover_ledger
  ALTER COLUMN season_year SET DEFAULT public.craic_season_year();
ALTER TABLE public.clover_requests
  ALTER COLUMN season_year SET DEFAULT public.craic_season_year();

-- Safety relabel: put every existing row in the July-start season its
-- created_at belongs to (no-op for rows written July-December).
UPDATE public.clover_ledger  SET season_year = public.craic_season_year(created_at)
  WHERE season_year IS DISTINCT FROM public.craic_season_year(created_at);
UPDATE public.clover_requests SET season_year = public.craic_season_year(created_at)
  WHERE season_year IS DISTINCT FROM public.craic_season_year(created_at);

-- Leaderboards count the July-start season.
CREATE OR REPLACE VIEW public.v_season_leaderboard AS
WITH season AS (
  SELECT public.craic_season_year() AS yr
), aggs AS (
  SELECT c.member_id,
    COALESCE(sum(c.clovers) FILTER (WHERE c.season_year = (SELECT yr FROM season)), 0)::int AS season_clovers,
    COALESCE(sum(c.clovers), 0)::int AS lifetime_clovers
  FROM public.clover_ledger c
  GROUP BY c.member_id
), badges AS (
  SELECT member_id, count(*)::int AS badge_count
  FROM public.member_badges
  GROUP BY member_id
)
SELECT
  row_number() OVER (ORDER BY a.season_clovers DESC, a.lifetime_clovers DESC, m.last_name, m.first_name)::int AS place,
  m.id AS member_id,
  m.first_name,
  m.last_name,
  a.season_clovers,
  a.lifetime_clovers,
  COALESCE(b.badge_count, 0) AS badge_count,
  r.rank_name,
  r.rank_icon
FROM aggs a
JOIN public.members m ON m.id = a.member_id
LEFT JOIN badges b ON b.member_id = m.id
CROSS JOIN LATERAL public.craic_rank(a.lifetime_clovers) r
WHERE m.merged_into IS NULL AND a.season_clovers > 0
ORDER BY place;

CREATE OR REPLACE VIEW public.v_volunteer_leaderboard AS
WITH season AS (
  SELECT public.craic_season_year() AS yr
)
SELECT m.id AS member_id,
  m.first_name,
  m.last_name,
  count(*) FILTER (WHERE c.reason IN ('volunteer_bonus','volunteer_priority_bonus'))::int AS volunteer_events,
  COALESCE(sum(c.clovers) FILTER (WHERE c.reason IN ('volunteer_bonus','volunteer_priority_bonus')), 0)::int AS volunteer_clovers
FROM public.clover_ledger c
JOIN public.members m ON m.id = c.member_id
WHERE c.season_year = (SELECT yr FROM season) AND m.merged_into IS NULL
GROUP BY m.id, m.first_name, m.last_name
HAVING COALESCE(sum(c.clovers) FILTER (WHERE c.reason IN ('volunteer_bonus','volunteer_priority_bonus')), 0) > 0
ORDER BY volunteer_clovers DESC, volunteer_events DESC;

-- 2) Claimable activities now include attending another IKC krewe's event,
--    and claims stamp the July-start season.
CREATE OR REPLACE FUNCTION public.submit_clover_request(
  p_activity_code text,
  p_guest_count integer DEFAULT NULL::integer,
  p_event_name text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_member uuid;
  v_code text := lower(trim(coalesce(p_activity_code, '')));
  v_label text;
  v_clovers int;
  v_guests int;
  v_id uuid;
  v_year int := public.craic_season_year();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Not signed in');
  END IF;

  v_member := public._clover_request_member_id();
  IF v_member IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'You are not on the krewe roster yet');
  END IF;

  CASE v_code
    WHEN 'attend_event' THEN v_label := 'Attend an event (verified)'; v_clovers := 20;
    WHEN 'attend_meeting' THEN v_label := 'Attend a members'' meeting'; v_clovers := 15;
    WHEN 'attend_ikc_event' THEN v_label := 'Attend another IKC krewe''s event'; v_clovers := 25;
    WHEN 'volunteer_event' THEN v_label := 'Volunteer at an event'; v_clovers := 30;
    WHEN 'volunteer_priority' THEN v_label := 'Volunteer for a priority shift (setup / teardown / parade day)'; v_clovers := 60;
    WHEN 'organize_event' THEN v_label := 'Organize an event'; v_clovers := 50;
    WHEN 'bring_guest' THEN
      v_label := 'Bring a guest';
      v_guests := coalesce(p_guest_count, 0);
      IF v_guests < 1 OR v_guests > 3 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Guest count must be 1 to 3');
      END IF;
      v_clovers := v_guests * 5;
    WHEN 'dues_on_time' THEN v_label := 'Pay your dues on time'; v_clovers := 25;
    WHEN 'dues_early' THEN v_label := 'Pay your dues early (by St. Paddy''s)'; v_clovers := 15;
    WHEN 'refer_member' THEN v_label := 'Refer a member who joins'; v_clovers := 40;
    ELSE
      RETURN jsonb_build_object('ok', false, 'message', 'Unknown activity');
  END CASE;

  INSERT INTO public.clover_requests (
    member_id, activity_code, activity_label, clovers, guest_count,
    event_name, notes, season_year
  ) VALUES (
    v_member, v_code, v_label, v_clovers,
    CASE WHEN v_code = 'bring_guest' THEN v_guests ELSE NULL END,
    nullif(trim(coalesce(p_event_name, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    v_year
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$function$;

-- Season totals inside the member's own game card follow the July clock too.
CREATE OR REPLACE FUNCTION public.get_member_game_card(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  m public.members%rowtype;
  lifetime int := 0;
  season int := 0;
  yr int := public.craic_season_year();
  r record;
  badges jsonb := '[]'::jsonb;
  recent jsonb := '[]'::jsonb;
begin
  select * into m from public.members
  where lower(email) = lower(trim(p_email)) and merged_into is null
  limit 1;
  if not found then
    return jsonb_build_object('found', false);
  end if;

  select coalesce(sum(clovers),0)::int into lifetime from public.clover_ledger where member_id = m.id;
  select coalesce(sum(clovers),0)::int into season from public.clover_ledger where member_id = m.id and season_year = yr;
  select * into r from public.craic_rank(lifetime);

  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'icon', d.icon) order by d.sort), '[]'::jsonb)
  into badges
  from public.member_badges mb
  join public.badge_defs d on d.id = mb.badge_id
  where mb.member_id = m.id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'clovers', c.clovers, 'reason', c.reason, 'event', coalesce(c.event_name, e.name)
    ) order by c.created_at desc), '[]'::jsonb)
  into recent
  from (select * from public.clover_ledger where member_id = m.id order by created_at desc limit 12) c
  left join public.events e on e.id = c.event_id;

  return jsonb_build_object(
    'found', true,
    'first_name', m.first_name,
    'last_name', m.last_name,
    'lifetime', lifetime,
    'season', season,
    'season_year', yr,
    'rank_name', r.rank_name,
    'rank_icon', r.rank_icon,
    'next_rank_name', r.next_rank_name,
    'clovers_to_next', r.clovers_to_next,
    'badges', badges,
    'recent', recent
  );
end;
$function$;

-- 3) Find My Clovers by NAME. Signed-in members only.
CREATE OR REPLACE FUNCTION public.search_craic_members(p_name text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_q text := trim(coalesce(p_name, ''));
  v_yr int := public.craic_season_year();
  v_matches jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Sign in to the Hub to search the Craic Cup');
  END IF;
  IF length(v_q) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Type at least two letters of a name');
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'member_id', s.id,
      'first_name', s.first_name,
      'last_name', s.last_name,
      'lifetime', s.lifetime,
      'season', s.season,
      'rank_name', r.rank_name,
      'rank_icon', r.rank_icon
    ) ORDER BY s.last_name, s.first_name), '[]'::jsonb)
  INTO v_matches
  FROM (
    SELECT m.id, m.first_name, m.last_name,
      coalesce((SELECT sum(cl.clovers) FROM public.clover_ledger cl
                WHERE cl.member_id = m.id), 0)::int AS lifetime,
      coalesce((SELECT sum(cl.clovers) FROM public.clover_ledger cl
                WHERE cl.member_id = m.id AND cl.season_year = v_yr), 0)::int AS season
    FROM public.members m
    WHERE m.merged_into IS NULL
      AND (
        (coalesce(m.first_name,'') || ' ' || coalesce(m.last_name,'')) ILIKE '%' || v_q || '%'
        OR m.first_name ILIKE '%' || v_q || '%'
        OR m.last_name ILIKE '%' || v_q || '%'
      )
    ORDER BY m.last_name, m.first_name
    LIMIT 12
  ) s
  CROSS JOIN LATERAL public.craic_rank(s.lifetime) r;

  RETURN jsonb_build_object('ok', true, 'matches', coalesce(v_matches, '[]'::jsonb));
END;
$function$;

-- 4) Full Craic Cup card for one member, with event + ticket history
--    from July 1 of the current season onward.
CREATE OR REPLACE FUNCTION public.get_craic_member_card(p_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  m public.members%rowtype;
  lifetime int := 0;
  season int := 0;
  yr int := public.craic_season_year();
  since date := public.craic_season_start();
  r record;
  badges jsonb := '[]'::jsonb;
  recent jsonb := '[]'::jsonb;
  history jsonb := '[]'::jsonb;
  legacy jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('found', false, 'message', 'Sign in to the Hub to view Craic Cup cards');
  END IF;

  SELECT * INTO m FROM public.members
  WHERE id = p_member_id AND merged_into IS NULL
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT coalesce(sum(clovers),0)::int INTO lifetime
    FROM public.clover_ledger WHERE member_id = m.id;
  SELECT coalesce(sum(clovers),0)::int INTO season
    FROM public.clover_ledger WHERE member_id = m.id AND season_year = yr;
  SELECT * INTO r FROM public.craic_rank(lifetime);

  SELECT coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'icon', d.icon) ORDER BY d.sort), '[]'::jsonb)
  INTO badges
  FROM public.member_badges mb
  JOIN public.badge_defs d ON d.id = mb.badge_id
  WHERE mb.member_id = m.id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'clovers', c.clovers, 'reason', c.reason, 'event', coalesce(c.event_name, e.name),
      'created_at', c.created_at
    ) ORDER BY c.created_at DESC), '[]'::jsonb)
  INTO recent
  FROM (SELECT * FROM public.clover_ledger WHERE member_id = m.id ORDER BY created_at DESC LIMIT 12) c
  LEFT JOIN public.events e ON e.id = c.event_id;

  -- Every RSVP this season (since July 1), with ticket + payment details.
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'event_name', coalesce(e.name, 'Krewe event'),
      'start_time', e.start_time,
      'location', e.location,
      'status', s.status,
      'signup_role', s.signup_role,
      'guests', s.guests_count,
      'ticket_type', s.ticket_type,
      'payment_status', s.payment_status,
      'amount_cents', s.amount_cents,
      'rsvp_at', s.created_at
    ) ORDER BY coalesce(e.start_time, s.created_at) DESC), '[]'::jsonb)
  INTO history
  FROM (SELECT * FROM public.event_signups WHERE member_id = m.id ORDER BY created_at DESC LIMIT 120) s
  LEFT JOIN public.events e ON e.id = s.event_id
  WHERE coalesce(e.start_time, s.created_at) >= since;

  -- Wild Apricot-imported registrations in the same July 1 window (rare, but
  -- covers this season's events that were sold on the old site).
  IF m.email IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'event_name', l.event_title,
        'start_time', l.event_start,
        'location', l.event_location,
        'ticket_type', l.ticket_type,
        'amount_cents', l.total_fee_cents,
        'payment_state', l.payment_state,
        'checked_in', l.checked_in,
        'registered_at', l.registered_at
      ) ORDER BY l.event_start DESC NULLS LAST), '[]'::jsonb)
    INTO legacy
    FROM (SELECT * FROM public.legacy_event_registrations
          WHERE lower(email) = lower(m.email)
            AND event_start >= since
          ORDER BY event_start DESC NULLS LAST LIMIT 80) l;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'member_id', m.id,
    'first_name', m.first_name,
    'last_name', m.last_name,
    'lifetime', lifetime,
    'season', season,
    'season_year', yr,
    'season_start', since,
    'rank_name', r.rank_name,
    'rank_icon', r.rank_icon,
    'next_rank_name', r.next_rank_name,
    'clovers_to_next', r.clovers_to_next,
    'badges', badges,
    'recent', recent,
    'history', history,
    'legacy', legacy
  );
END;
$function$;
