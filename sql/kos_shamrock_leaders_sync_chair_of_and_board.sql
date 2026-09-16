-- kos_sync_roster_role_grants: match "Committee Chair of X", "Co-Chair of X",
-- and "Chair of X" (Doug’s live title), and treat "Board" like "Board Member".
-- Does not rewrite display titles. Does not invent people. Does not reintroduce
-- Mandy Franklin or Dayna Olmsted. Tim stays President; Patrick stays Treasurer.
-- Applied to oazwkwflgbthojvnclfc as shamrock_leaders_sync_chair_of_and_board.

CREATE OR REPLACE FUNCTION public.kos_committee_from_chair_title(p_title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN btrim(coalesce(p_title, '')) ~* '^Committee Chair of\s+\S' THEN
      btrim(substring(btrim(p_title) from '(?i)^Committee Chair of\s+(.*)$'))
    WHEN btrim(coalesce(p_title, '')) ~* '^(Committee\s+)?Co[- ]?Chair of\s+\S' THEN
      btrim(substring(btrim(p_title) from '(?i)^(?:Committee\s+)?Co[- ]?Chair of\s+(.*)$'))
    WHEN btrim(coalesce(p_title, '')) ~* '^Chair of\s+\S' THEN
      btrim(substring(btrim(p_title) from '(?i)^Chair of\s+(.*)$'))
    WHEN btrim(coalesce(p_title, '')) ~* '\S.+\s+Committee Chair$' THEN
      btrim(substring(btrim(p_title) from '(?i)^(.*)\s+Committee Chair$'))
    WHEN btrim(coalesce(p_title, '')) ~* '\S.+\s+Chair$'
         AND btrim(p_title) !~* '^(President|Vice President|Treasurer|Secretary|Board Member|Board)$' THEN
      btrim(substring(btrim(p_title) from '(?i)^(.*)\s+Chair$'))
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.kos_committee_from_chair_title(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.kos_sync_roster_role_grants(p_member uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec record;
  t text;
  v_committee text;
BEGIN
  IF p_member IS NULL THEN
    RETURN;
  END IF;

  SELECT m.member_role, m.officer_title, m.membership_status
    INTO rec
  FROM public.members m
  WHERE m.id = p_member AND m.merged_into IS NULL;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF coalesce(rec.membership_status, 'active') NOT IN ('active', 'pending-renewal') THEN
    RETURN;
  END IF;

  IF rec.member_role IN ('officer', 'captain') THEN
    INSERT INTO public.member_roles (user_id, role)
    SELECT p.id, rec.member_role
    FROM public.profiles p
    WHERE p.member_id = p_member
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF rec.member_role = 'board' THEN
    INSERT INTO public.member_roles (user_id, role)
    SELECT p.id, 'board'
    FROM public.profiles p
    WHERE p.member_id = p_member
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  FOREACH t IN ARRAY regexp_split_to_array(coalesce(rec.officer_title, ''), '\s*·\s*')
  LOOP
    t := btrim(t);
    IF t = '' THEN
      CONTINUE;
    ELSIF t ILIKE 'President' OR t ILIKE 'Vice President' THEN
      INSERT INTO public.member_roles (user_id, role)
      SELECT p.id, 'officer' FROM public.profiles p WHERE p.member_id = p_member
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSIF t ILIKE 'Treasurer' THEN
      INSERT INTO public.member_roles (user_id, role)
      SELECT p.id, r FROM public.profiles p
      CROSS JOIN (VALUES ('treasurer'), ('officer')) AS x(r)
      WHERE p.member_id = p_member
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSIF t ILIKE 'Secretary' THEN
      INSERT INTO public.member_roles (user_id, role)
      SELECT p.id, r FROM public.profiles p
      CROSS JOIN (VALUES ('secretary'), ('officer')) AS x(r)
      WHERE p.member_id = p_member
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSIF t ILIKE 'Board Member' OR t ILIKE 'Board' THEN
      INSERT INTO public.member_roles (user_id, role)
      SELECT p.id, 'board' FROM public.profiles p WHERE p.member_id = p_member
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSIF t ~* '^(Committee\s+)?(Co[- ]?)?Chair of\s+\S' THEN
      v_committee := coalesce(
        nullif(public.kos_committee_from_chair_title(t), ''),
        btrim(substring(t from '(?i)^(?:Committee\s+)?(?:Co[- ]?)?Chair of\s+(.*)$'))
      );
      IF v_committee IS NOT NULL AND v_committee <> '' THEN
        INSERT INTO public.member_roles (user_id, role, committee)
        SELECT p.id, 'committee', v_committee
        FROM public.profiles p
        WHERE p.member_id = p_member
        ON CONFLICT (user_id, role) DO UPDATE
          SET committee = coalesce(excluded.committee, public.member_roles.committee),
              granted_at = now();
      END IF;
    ELSE
      v_committee := public.kos_committee_from_chair_title(t);
      IF v_committee IS NOT NULL AND v_committee <> '' THEN
        INSERT INTO public.member_roles (user_id, role, committee)
        SELECT p.id, 'committee', v_committee
        FROM public.profiles p
        WHERE p.member_id = p_member
        ON CONFLICT (user_id, role) DO UPDATE
          SET committee = coalesce(excluded.committee, public.member_roles.committee),
              granted_at = now();
      END IF;
    END IF;
  END LOOP;

  IF coalesce(rec.officer_title, '') !~* 'treasurer' THEN
    DELETE FROM public.member_roles r
     USING public.profiles p
     WHERE r.user_id = p.id
       AND p.member_id = p_member
       AND r.role = 'treasurer';
  END IF;
  IF coalesce(rec.officer_title, '') !~* 'secretary' THEN
    DELETE FROM public.member_roles r
     USING public.profiles p
     WHERE r.user_id = p.id
       AND p.member_id = p_member
       AND r.role = 'secretary';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.kos_sync_roster_role_grants(uuid) FROM PUBLIC, anon, authenticated;

SELECT public.kos_sync_roster_role_grants(m.id)
  FROM public.members m
 WHERE m.merged_into IS NULL
   AND coalesce(m.membership_status, 'active') IN ('active', 'pending-renewal')
   AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.member_id = m.id)
   AND (
     coalesce(m.officer_title, '') <> ''
     OR m.member_role IN ('officer', 'board', 'captain')
   );
