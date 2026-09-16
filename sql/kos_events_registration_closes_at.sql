-- registration_closes_at: officers can close public RSVP/signup on a chosen datetime.
-- Null = stay open until event / other existing rules.
-- Applied on project oazwkwflgbthojvnclfc (also via Supabase migrations).

alter table public.events
  add column if not exists registration_closes_at timestamptz null;

comment on column public.events.registration_closes_at is
  'When set, new public RSVPs/signups are blocked at or after this instant. Null means stay open until event or other rules.';

-- officer_upsert_event and rsvp_to_event updates live in DB migrations:
--   add_events_registration_closes_at
--   enforce_registration_closes_on_rsvp
-- Create/update of published events (name, location/address, start/end, close date) remains allowed for managers.

-- Mini Golf and Lunch closes Thu Sep 17, 2026 11:59 PM America/New_York
-- (= 2026-09-18 03:59:00+00)
-- update public.events
-- set registration_closes_at = '2026-09-18 03:59:00+00'
-- where name = 'Mini Golf and Lunch';
