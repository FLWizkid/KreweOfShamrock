-- ============================================================================
-- Krewe of Shamrock — Shamrock Leaders roster + title-based RBAC
--
-- Source of truth: Krewe website "Shamrock Leaders" page (officers, board,
-- committee chairs). Display titles match that page. Access still uses the
-- existing member_roles enums (officer / board / treasurer / secretary /
-- committee) and the roster member_role column. Highest role wins.
--
-- Safe to run more than once. Does not invent emails or phones: known leaders
-- are matched to existing Wild Apricot roster rows by email. Parade, Social,
-- and Technology chairs are left vacant unless another named roster person
-- already holds that chair. Do not invent replacements.
--
-- Melissa (2026-09-16): Mandy Franklin and Dayna Olmsted are no longer in the
-- Krewe — they are not seeded and any prior seed rows are removed.
--
-- Applied to project oazwkwflgbthojvnclfc as migration
-- shamrock_leaders_roster_and_rbac.
-- ============================================================================

-- Email is required for Member Hub login (hub_door_status), but directory
-- rows may exist before a contact address is known. Unique index still
-- allows multiple NULLs in Postgres.
ALTER TABLE public.members
  ALTER COLUMN email DROP NOT NULL;

COMMENT ON COLUMN public.members.officer_title IS
  'Display title(s) shown on the profile and directory, joined with · when a person holds more than one. Chair / treasurer / secretary phrases are also used by can_manage_* RBAC helpers.';

-- Parse "Committee Chair of X", "Co-Chair of X", "Chair of X",
-- "X Committee Chair", "X Chair". Used so Douglas Tully's existing
-- "Chair of Technology" and Tammy/Deb's "Co-Chair of Merchandise"
-- grant-sync without rewriting those display titles.
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

-- Canonical title → grant mapping used at signup, profile save, and seed.
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

  -- Roster access role
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

  -- Display titles: President / Treasurer / Secretary / Board Member|Board /
  -- "Committee Chair of X", "Co-Chair of X", and "Chair of X".
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

  -- Drop leftover treasurer/secretary grants when the display title no longer
  -- includes those offices (President must not keep a Treasurer grant).
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

-- Treasurer grant (not only the word in officer_title) can see payments.
CREATE OR REPLACE FUNCTION public.can_view_payments()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.members m ON m.id = p.member_id
    WHERE p.id = auth.uid()
      AND m.membership_status = 'active'
      AND (
        lower(coalesce(m.officer_title, '')) LIKE '%treasurer%'
        OR m.member_role = 'board'
        OR EXISTS (
          SELECT 1 FROM public.member_roles r
          WHERE r.user_id = auth.uid()
            AND r.role IN ('board', 'treasurer')
        )
      )
  );
$$;

-- First-login questionnaire may send canonical titles in answers.titles.
-- Map them onto existing role enums; set roster title + highest member_role.
CREATE OR REPLACE FUNCTION public.submit_role_request(
  p_claimed_member boolean,
  p_roles text[],
  p_answers jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_email  text := coalesce(auth.email(), '');
  v_name   text;
  v_roles  text[];
  v_id     uuid;
  v_linked boolean;
  v_title  text;
  v_extra  text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;

  SELECT coalesce(array_agg(DISTINCT r), '{}') INTO v_roles
  FROM unnest(coalesce(p_roles, '{}')) AS r
  WHERE r IN ('board','officer','treasurer','secretary','captain','committee');

  -- Titles from the questionnaire (President, Board Member, Committee Chair of X)
  FOR v_title IN
    SELECT btrim(x)
    FROM jsonb_array_elements_text(coalesce(p_answers->'titles', '[]'::jsonb)) AS x
  LOOP
    IF v_title ILIKE 'President' OR v_title ILIKE 'Vice President' THEN
      v_extra := array_append(v_extra, 'officer');
    ELSIF v_title ILIKE 'Treasurer' THEN
      v_extra := array_cat(v_extra, ARRAY['treasurer','officer']);
    ELSIF v_title ILIKE 'Secretary' THEN
      v_extra := array_cat(v_extra, ARRAY['secretary','officer']);
    ELSIF v_title ILIKE 'Board Member' OR v_title ILIKE 'Board' THEN
      v_extra := array_append(v_extra, 'board');
    ELSIF public.kos_committee_from_chair_title(v_title) IS NOT NULL THEN
      v_extra := array_append(v_extra, 'committee');
    END IF;
  END LOOP;

  SELECT coalesce(array_agg(DISTINCT r), v_roles) INTO v_roles
  FROM (
    SELECT unnest(v_roles) AS r
    UNION
    SELECT unnest(coalesce(v_extra, '{}')) AS r
  ) s
  WHERE r IN ('board','officer','treasurer','secretary','captain','committee');

  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_uid AND member_id IS NOT NULL
  ) INTO v_linked;

  IF coalesce(array_length(v_roles, 1), 0) = 0 THEN
    RETURN jsonb_build_object('needs_approval', false, 'linked', v_linked);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.role_requests
    WHERE user_id = v_uid AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('needs_approval', true, 'already_pending', true);
  END IF;

  SELECT coalesce(full_name, v_email) INTO v_name
  FROM public.profiles WHERE id = v_uid;

  INSERT INTO public.role_requests
    (user_id, email, full_name, claimed_member, requested_roles, answers)
  VALUES
    (v_uid, v_email, coalesce(v_name, v_email), coalesce(p_claimed_member, false),
     v_roles, coalesce(p_answers, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('needs_approval', true, 'request_id', v_id, 'linked', v_linked);
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_role_request(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user      uuid;
  v_roles     text[];
  v_committee text;
  v_member    uuid;
  v_titles    text;
  v_role      text;
BEGIN
  IF NOT public.is_krewe_officer() THEN RAISE EXCEPTION 'Officers only'; END IF;
  UPDATE public.role_requests
     SET status = 'approved', decided_by = auth.uid(), decided_at = now()
   WHERE id = p_id AND status = 'pending'
   RETURNING user_id, requested_roles,
             coalesce(nullif(answers->>'committee',''), answers->'committees'->>0)
    INTO v_user, v_roles, v_committee;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Request not found or already decided'; END IF;

  INSERT INTO public.member_roles (user_id, role, committee, granted_by)
  SELECT v_user, r, CASE WHEN r = 'committee' THEN v_committee END, auth.uid()
  FROM unnest(v_roles) AS r
  ON CONFLICT (user_id, role) DO UPDATE
    SET committee = coalesce(excluded.committee, public.member_roles.committee),
        granted_by = excluded.granted_by,
        granted_at = now();

  -- Treasurer / secretary claims also unlock the Officer desk.
  IF 'treasurer' = ANY (v_roles) OR 'secretary' = ANY (v_roles) OR 'officer' = ANY (v_roles) THEN
    INSERT INTO public.member_roles (user_id, role, granted_by)
    VALUES (v_user, 'officer', auth.uid())
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  SELECT member_id INTO v_member FROM public.profiles WHERE id = v_user;
  IF v_member IS NULL THEN
    RETURN;
  END IF;

  SELECT nullif(array_to_string(ARRAY(
           SELECT btrim(x) FROM jsonb_array_elements_text(
             coalesce((SELECT answers->'titles' FROM public.role_requests WHERE id = p_id), '[]'::jsonb)
           ) AS x
           WHERE btrim(x) <> ''
         ), ' · '), '')
    INTO v_titles;

  IF v_titles IS NULL THEN
    IF coalesce(v_committee,'') ~* '(merchandise|merch|shop|store)' THEN
      v_titles := 'Committee Chair of Merchandise';
    ELSIF coalesce(v_committee,'') ~* 'social' THEN
      v_titles := 'Committee Chair of Social';
    ELSIF coalesce(v_committee,'') ~* '(charity|charities|fundraising|raffle)' THEN
      v_titles := 'Committee Chair of Charity';
    ELSIF 'treasurer' = ANY (v_roles) THEN
      v_titles := 'Treasurer';
    ELSIF 'secretary' = ANY (v_roles) THEN
      v_titles := 'Secretary';
    ELSIF 'board' = ANY (v_roles) THEN
      v_titles := 'Board Member';
    END IF;
  END IF;

  v_role := CASE
    WHEN v_roles && ARRAY['officer','captain','treasurer','secretary'] THEN 'officer'
    WHEN 'board' = ANY (v_roles) THEN 'board'
    ELSE NULL
  END;

  UPDATE public.members
     SET officer_title = coalesce(v_titles, officer_title),
         member_role   = coalesce(v_role, member_role),
         updated_at    = now()
   WHERE id = v_member
     AND coalesce(membership_status, 'active') IN ('active', 'pending-renewal', 'prospect', 'pending-new');

  PERFORM public.kos_sync_roster_role_grants(v_member);
END;
$$;

-- Link grants when a roster-matched account is created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mid uuid;
BEGIN
  SELECT id INTO mid FROM public.members
  WHERE merged_into IS NULL
    AND email IS NOT NULL
    AND lower(email) = lower(new.email)
  LIMIT 1;
  INSERT INTO public.profiles (id, member_id, full_name)
  VALUES (new.id, mid, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  ON CONFLICT (id) DO UPDATE
    SET member_id = coalesce(public.profiles.member_id, excluded.member_id),
        updated_at = now();
  IF mid IS NOT NULL THEN
    PERFORM public.kos_flag_duplicates(mid);
    PERFORM public.kos_sync_roster_role_grants(mid);
  END IF;
  RETURN new;
END;
$$;

-- ============================================================================
-- Roster upsert (names + titles + highest member_role). Never writes email
-- or phone onto an existing row; inserts without contact fields when needed.
-- ============================================================================
DO $$
DECLARE
  r record;
  v_id uuid;
BEGIN
  CREATE TEMP TABLE kos_leaders (
    match_email   text,
    first_name    text,
    last_name     text,
    member_role   text,
    officer_title text
  ) ON COMMIT DROP;

  INSERT INTO kos_leaders (match_email, first_name, last_name, member_role, officer_title) VALUES
    -- Authoritative: Tim Fitzpatrick is President (not Treasurer).
    ('tim.fitzpatrick@lumen.com', 'Tim',     'Fitzpatrick', 'officer', 'President'),
    ('jimsugruemtm@gmail.com',    'Jim',     'Sugrue',      'officer', 'Vice President · Committee Chair of Bylaws'),
    -- Authoritative: Patrick Pustay is Treasurer + Finance chair.
    ('ppustay1@gmail.com',        'Patrick', 'Pustay',      'officer', 'Treasurer · Committee Chair of Finance'),
    ('dgfitzpa@gmail.com',        'Debbie',  'Fitzpatrick', 'officer', 'Secretary'),
    ('sharon83stevens@gmail.com', 'Sharon',  'Stevens',     'board',   'Board Member'),
    ('lscuseny@gmail.com',        'Leslie',  'Skrodzki',    'board',   'Board Member'),
    ('tahubbell@hotmail.com',     'Tim',     'Hubbell',     'board',   'Board Member'),
    ('chuckdavis9508@hotmail.com','Chuck',   'Davis',       'board',   'Board Member'),
    ('lsugrue99@gmail.com',       'Lisa',    'Sugrue',      'board',   'Board Member · Committee Chair of Membership'),
    ('bweinercrna@me.com',        'Bruce',   'Weiner',      'board',   'Board Member · Committee Chair of Float'),
    ('jcarney1218@gmail.com',     'Jeff',    'Carney',      'board',   'Board Member · Committee Chair of Charity'),
    ('debrski1@gmail.com',        'Deb',     'Rutkowski',   'member',  'Co-Chair of Merchandise'),
    ('tammymillerkos@gmail.com',  'Tammy',   'Miller',      'member',  'Co-Chair of Merchandise');

  FOR r IN SELECT * FROM kos_leaders LOOP
    v_id := NULL;
    IF r.match_email IS NOT NULL THEN
      SELECT id INTO v_id
      FROM public.members
      WHERE merged_into IS NULL
        AND lower(email) = lower(r.match_email)
      ORDER BY created_at
      LIMIT 1;
    END IF;
    IF v_id IS NULL THEN
      SELECT id INTO v_id
      FROM public.members
      WHERE merged_into IS NULL
        AND lower(last_name) = lower(r.last_name)
        AND lower(first_name) IN (
          lower(r.first_name),
          CASE lower(r.first_name)
            WHEN 'tim' THEN 'timothy'
            WHEN 'jim' THEN 'james'
            WHEN 'debbie' THEN 'debra'
            WHEN 'deb' THEN 'deborah'
            ELSE lower(r.first_name)
          END
        )
      ORDER BY CASE WHEN coalesce(membership_status,'') = 'active' THEN 0 ELSE 1 END,
               created_at
      LIMIT 1;
    END IF;

    IF v_id IS NULL THEN
      INSERT INTO public.members (
        first_name, last_name, email, phone,
        member_role, membership_status, officer_title, profile_visible, notes
      ) VALUES (
        r.first_name, r.last_name, NULL, NULL,
        r.member_role, 'active', r.officer_title, true,
        'Shamrock Leaders directory seed — contact left blank (no invented email/phone).'
      )
      RETURNING id INTO v_id;
    ELSE
      UPDATE public.members
         SET first_name        = r.first_name,
             last_name         = r.last_name,
             member_role       = r.member_role,
             officer_title     = r.officer_title,
             membership_status = CASE
               WHEN membership_status IN ('merged') THEN membership_status
               ELSE 'active'
             END,
             profile_visible   = true,
             updated_at        = now()
       WHERE id = v_id;
    END IF;

    PERFORM public.kos_sync_roster_role_grants(v_id);
  END LOOP;

  -- Authoritative officer split: Tim = President (drop leftover Treasurer
  -- grant). Patrick = Treasurer + Finance chair (ensure treasurer grant).
  -- Also grant-sync every other linked leader (including Douglas Tully,
  -- Chair of Technology) without rewriting their display titles.
  PERFORM public.kos_sync_roster_role_grants(m.id)
    FROM public.members m
   WHERE m.merged_into IS NULL
     AND coalesce(m.membership_status, 'active') IN ('active', 'pending-renewal')
     AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.member_id = m.id)
     AND (
       coalesce(m.officer_title, '') <> ''
       OR m.member_role IN ('officer', 'board', 'captain')
     );
END $$;

-- Melissa 2026-09-16: departed members must not remain in the directory.
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

REVOKE ALL ON FUNCTION public.submit_role_request(boolean, text[], jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_role_request(boolean, text[], jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.approve_role_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_role_request(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.can_view_payments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_payments() TO authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
