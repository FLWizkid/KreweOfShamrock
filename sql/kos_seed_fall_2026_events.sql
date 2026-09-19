-- Fall 2026 dates from the 26 August 2026 general meeting summary.
-- Safe to run more than once.
-- Applied to the Krewe of Shamrock project (oazwkwflgbthojvnclfc) on 2026-09-03.
-- Requires the 'social' and 'ball' event types plus the is_public/notes
-- columns from sql/kos_public_events_and_rsvp.sql.

INSERT INTO public.events (name, event_type, start_time, location, is_public, notes)
SELECT
  'Mini Golf and Lunch',
  'social',
  '2026-09-19 10:00:00-04',
  'The Grove Mini-Golf, 6202 Wesley Chapel Blvd, Wesley Chapel, FL',
  true,
  'Golf $20 or golf plus lunch $40. Supports No More Umbrellas and New Life Warehouse. 50/50 raffle.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.events
  WHERE name = 'Mini Golf and Lunch' AND start_time::date = DATE '2026-09-19'
);

-- Basket Social (formerly "Basket-Making Happy Hour", Oct 17): moved to
-- October 3 — see sql/kos_basket_social_oct3.sql.
-- The guard matches ANY basket-prep event so re-running this seed can never
-- re-create the retired October 17 row alongside the moved one.
INSERT INTO public.events (name, event_type, start_time, location, is_public, notes)
SELECT
  'Tartan Ball Basket Social',
  'social',
  '2026-10-03 18:00:00-04',
  'TBA',
  true,
  'Socialize with fellow Krewe members while preparing raffle baskets for the Tartan Ball.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.events
  WHERE name ILIKE '%Basket%'
    AND start_time::date IN (DATE '2026-10-03', DATE '2026-10-17')
);

INSERT INTO public.events (name, event_type, start_time, location, is_public, notes)
SELECT
  'Tartan Ball',
  'ball',
  '2026-10-24 18:00:00-04',
  'Higgins Hall, Tampa, FL',
  true,
  'Season ball. Crowning of the new King and Queen. 6-10 PM per the published program.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.events
  WHERE name = 'Tartan Ball' AND start_time::date = DATE '2026-10-24'
);

INSERT INTO public.events (name, event_type, start_time, location, is_public, notes)
SELECT
  'King and Queen Breakfast',
  'social',
  NULL,
  'TBA',
  false,
  'Date announced at the August meeting as forthcoming. Keep off the public RSVP list until a date exists.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.events WHERE name = 'King and Queen Breakfast'
);
