-- Melissa (2026-09-16): Mandy Franklin and Dayna Olmsted are no longer in the
-- Krewe. Remove seed directory rows and do not list them as Social or
-- Technology chairs. Safe to run more than once. Does not invent replacements.
--
-- Applied to oazwkwflgbthojvnclfc as shamrock_leaders_remove_departed.

DELETE FROM public.possible_duplicates pd
 USING public.members m
 WHERE (pd.member_a = m.id OR pd.member_b = m.id)
   AND (
     (lower(m.first_name) = 'dayna' AND lower(m.last_name) = 'olmsted')
     OR (lower(m.first_name) = 'mandy' AND lower(m.last_name) = 'franklin')
   );

DELETE FROM public.members
 WHERE email IS NULL
   AND (
     (lower(first_name) = 'dayna' AND lower(last_name) = 'olmsted')
     OR (lower(first_name) = 'mandy' AND lower(last_name) = 'franklin')
   );
