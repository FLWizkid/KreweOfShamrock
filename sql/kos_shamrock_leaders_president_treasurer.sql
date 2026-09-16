-- Authoritative officer split (Melissa / Shamrock Leaders):
--   Tim Fitzpatrick  = President (NOT Treasurer). member_role officer.
--   Patrick Pustay   = Treasurer · Committee Chair of Finance. member_role officer.
-- Does not reintroduce Mandy Franklin or Dayna Olmsted.
-- Does not replace kos_sync_roster_role_grants — that lives in
-- kos_shamrock_leaders_roster_and_rbac.sql (Chair of X parsing included).
-- Safe to run more than once.
-- Applied to oazwkwflgbthojvnclfc as shamrock_leaders_president_treasurer.

UPDATE public.members
   SET first_name        = 'Tim',
       last_name         = 'Fitzpatrick',
       member_role       = 'officer',
       officer_title     = 'President',
       membership_status = 'active',
       profile_visible   = true,
       updated_at        = now()
 WHERE merged_into IS NULL
   AND lower(email) = 'tim.fitzpatrick@lumen.com';

UPDATE public.members
   SET first_name        = 'Patrick',
       last_name         = 'Pustay',
       member_role       = 'officer',
       officer_title     = 'Treasurer · Committee Chair of Finance',
       membership_status = 'active',
       profile_visible   = true,
       updated_at        = now()
 WHERE merged_into IS NULL
   AND lower(email) = 'ppustay1@gmail.com';

SELECT public.kos_sync_roster_role_grants(id)
  FROM public.members
 WHERE merged_into IS NULL
   AND lower(email) IN ('tim.fitzpatrick@lumen.com', 'ppustay1@gmail.com');
