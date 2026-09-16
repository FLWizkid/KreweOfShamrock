-- Melissa 2026-09-16: Tammy Miller and Deb Rutkowski are both
-- Co-Chair of Merchandise. member_role stays member so Shop Studio
-- remains shopOnly. kos_sync maps Co-Chair of X → committee=X.
-- Does not change Tim (President) or Patrick (Treasurer).
-- Applied to oazwkwflgbthojvnclfc as shamrock_leaders_cochair_of_merchandise.

UPDATE public.members
   SET officer_title = 'Co-Chair of Merchandise',
       member_role   = 'member',
       membership_status = CASE
         WHEN membership_status IN ('merged') THEN membership_status
         ELSE 'active'
       END,
       profile_visible = true,
       updated_at = now()
 WHERE merged_into IS NULL
   AND lower(email) IN (lower('tammymillerkos@gmail.com'), lower('debrski1@gmail.com'));

SELECT public.kos_sync_roster_role_grants(id)
  FROM public.members
 WHERE merged_into IS NULL
   AND lower(email) IN (lower('tammymillerkos@gmail.com'), lower('debrski1@gmail.com'));
