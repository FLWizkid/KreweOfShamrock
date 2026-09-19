-- ============================================================================
-- Basket Social date change: October 17 → Saturday, October 3, 2026.
--
-- The Tartan Ball officers announced (September 2026 all-krewe email) that the
-- basket-prep social ahead of the ball moved to October 3 and now takes RSVPs
-- through Punchbowl:
--   https://www.punchbowl.com/parties/BasketFullofLaughs2026
--
-- This renames the seeded "Tartan Ball Basket-Making Happy Hour" (Oct 17) to
-- "Tartan Ball Basket Social", moves it to 2026-10-03 18:00 Eastern, and
-- attaches the Punchbowl link as the event's external_url (the public
-- calendar on event-signup.html links external_url directly). The name keeps
-- the word "Basket" so the Tartan Ball ticket-link special-casing on the
-- public pages continues to leave this event alone.
--
-- TO GO LIVE: run this file in the Supabase SQL editor on the Krewe project
-- oazwkwflgbthojvnclfc (same as the prior kos_* scripts). Safe to run more
-- than once. Officers can still adjust the date or details afterwards in
-- Event Studio. sql/kos_seed_fall_2026_events.sql was updated to match, so
-- re-running the seed cannot re-create the old October 17 row.
-- ============================================================================

UPDATE public.events
   SET name = 'Tartan Ball Basket Social',
       start_time = '2026-10-03 18:00:00-04',
       external_url = 'https://www.punchbowl.com/parties/BasketFullofLaughs2026',
       notes = 'NEW DATE: moved from October 17 to October 3. Socialize with fellow Krewe members while preparing raffle baskets for the Tartan Ball. RSVP and event details on Punchbowl.'
 WHERE name ILIKE '%Basket%'
   AND start_time::date IN (DATE '2026-10-17', DATE '2026-10-03')
   AND coalesce(source, 'krewe') = 'krewe';

-- The public pages read the "description" column where it exists; keep it in
-- step with notes without failing on databases that predate the column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'description'
  ) THEN
    UPDATE public.events
       SET description = 'Come help us put everything together! The Basket Social is a fun opportunity to socialize with fellow Krewe members while preparing baskets for the big night. NEW DATE: Saturday, October 3. RSVP on Punchbowl: https://www.punchbowl.com/parties/BasketFullofLaughs2026'
     WHERE name = 'Tartan Ball Basket Social'
       AND start_time::date = DATE '2026-10-03';
  END IF;
END $$;

-- If the seed was never applied (fresh database), create the event outright.
INSERT INTO public.events (name, event_type, start_time, location, is_public, external_url, notes)
SELECT
  'Tartan Ball Basket Social',
  'social',
  '2026-10-03 18:00:00-04',
  'TBA',
  true,
  'https://www.punchbowl.com/parties/BasketFullofLaughs2026',
  'Socialize with fellow Krewe members while preparing raffle baskets for the Tartan Ball. RSVP and event details on Punchbowl.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.events WHERE name ILIKE '%Basket%' AND start_time::date = DATE '2026-10-03'
);
