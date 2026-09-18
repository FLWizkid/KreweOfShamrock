-- Lock private event fields so anonymous PostgREST cannot read them.
-- Safe to re-run. Complements sql/kos_event_members_only_address.sql.
--
-- Why: GRANT SELECT/ALL on public.events to anon makes a later
-- REVOKE SELECT (member_address) FROM anon a no-op. Live check
-- has_column_privilege('anon','public.events','member_address','SELECT')
-- was true, so GET /events?select=member_address succeeded with the
-- publishable key. Public pages do not request the column, but anyone
-- can. meeting_url had the same hole.
--
-- Also drop leftover events_select_auth (USING true). That policy OR'd
-- with events_select_authenticated and let every signed-in account
-- read every event row, including draft house addresses.

revoke all on table public.events from public;
revoke all on table public.events from anon;

-- Public/fallback pages may still select events if v_public_events
-- is missing. Grant only columns that are safe for anonymous clients.
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

grant select on public.v_public_events to anon, authenticated;
