-- Shamrock Leaders titles + RBAC (screenshot + live ops conflict policy)
-- Live wins: Tim Fitzpatrick = Treasurer, Debbie Fitzpatrick = Secretary,
-- Douglas Tully = Chair of Technology. Patrick is Finance chair (not Treasurer).
-- Project: oazwkwflgbthojvnclfc

-- 1) Directory-facing titles + access roles on matched roster rows ---------------
UPDATE public.members SET
  member_role = 'officer',
  officer_title = 'Treasurer',
  updated_at = now()
WHERE id = 'f552c5a0-c1dc-48c3-942f-cfbb99d95dbc'
  AND email ILIKE 'tim.fitzpatrick@lumen.com';

UPDATE public.members SET
  member_role = 'officer',
  officer_title = 'Secretary',
  updated_at = now()
WHERE id = 'c117372e-6328-4bbb-a1cb-2c58926f1055'
  AND email ILIKE 'dgfitzpa@gmail.com';

UPDATE public.members SET
  member_role = 'officer',
  officer_title = 'Vice President · Committee Chair of Bylaws',
  updated_at = now()
WHERE id = '48a50129-c235-42e0-95ab-e5dd31f61bb9'
  AND email ILIKE 'jimsugruemtm@gmail.com';

-- Patrick: screenshot Treasurer conflicts with live Tim Treasurer → Finance chair only
UPDATE public.members SET
  member_role = 'officer',
  officer_title = 'Committee Chair of Finance',
  updated_at = now()
WHERE id = 'b5450ba2-89e9-4e2f-bfec-4d6669a4c315'
  AND email ILIKE 'ppustay1@gmail.com';

UPDATE public.members SET
  member_role = 'officer',
  officer_title = 'Chair of Technology',
  updated_at = now()
WHERE id = '11fd6285-7ead-4790-b573-db2744742ecd'
  AND email ILIKE 'Dougtully@protonmail.com';

UPDATE public.members SET member_role = 'board', officer_title = 'Board Member', updated_at = now()
WHERE id IN (
  '284c3eac-223d-40b6-99df-62e493d3f983', -- Sharon Stevens
  '67b587d2-1b5e-4984-b1e1-17bcfc3a0a2c', -- Leslie Skrodzki
  '593fa645-7892-45cb-bf4a-2f4145ffa282', -- Tim Hubbell
  'aa6220b4-42a4-46cc-a316-29c3eb35928e'  -- Chuck Davis
);

UPDATE public.members SET
  member_role = 'board',
  officer_title = 'Board Member · Committee Chair of Charity',
  updated_at = now()
WHERE id = 'ee265166-14e7-4319-89fb-7be19f37f23b'; -- Jeff Carney

UPDATE public.members SET
  member_role = 'board',
  officer_title = 'Board Member · Committee Chair of Membership',
  updated_at = now()
WHERE id = '7bfcdedf-e0af-407f-abf1-f46fb2445722'; -- Lisa Sugrue

UPDATE public.members SET
  member_role = 'board',
  officer_title = 'Board Member · Committee Chair of Float',
  updated_at = now()
WHERE id = '1e449202-b472-43b1-93b9-18c4f55b36cc'; -- Bruce Weiner

-- Merchandise chairs: keep member_role member so Shop Studio stays scoped (shopOnly)
UPDATE public.members SET
  officer_title = 'Committee Chair of Merchandise',
  updated_at = now()
WHERE id IN (
  '2a2355ce-44e7-46fa-a064-bbc39c584483', -- Tammy Miller
  '02e85f52-7a8e-4cb9-b8ed-675d6f6e40e6'  -- Deb Rutkowski
);

-- 2) Explicit grants: Tim gets treasurer; Patrick loses treasurer grant ---------
INSERT INTO public.member_roles (user_id, role, granted_by)
SELECT p.id, 'treasurer', NULL
FROM public.profiles p
WHERE p.member_id = 'f552c5a0-c1dc-48c3-942f-cfbb99d95dbc'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.member_roles (user_id, role, granted_by)
SELECT p.id, 'officer', NULL
FROM public.profiles p
WHERE p.member_id = 'f552c5a0-c1dc-48c3-942f-cfbb99d95dbc'
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.member_roles r
USING public.profiles p
WHERE r.user_id = p.id
  AND p.member_id = 'b5450ba2-89e9-4e2f-bfec-4d6669a4c315'
  AND r.role = 'treasurer';

-- Ensure Finance chair keeps committee grant labeled Finance
INSERT INTO public.member_roles (user_id, role, committee, granted_by)
SELECT p.id, 'committee', 'Finance', NULL
FROM public.profiles p
WHERE p.member_id = 'b5450ba2-89e9-4e2f-bfec-4d6669a4c315'
  AND NOT EXISTS (
    SELECT 1 FROM public.member_roles x
    WHERE x.user_id = p.id AND x.role = 'committee'
      AND coalesce(x.committee,'') ILIKE 'Finance'
  );

-- Merchandise committee grants for chairs who have Auth profiles
INSERT INTO public.member_roles (user_id, role, committee, granted_by)
SELECT p.id, 'committee', 'Merchandise', NULL
FROM public.profiles p
WHERE p.member_id IN (
  '2a2355ce-44e7-46fa-a064-bbc39c584483',
  '02e85f52-7a8e-4cb9-b8ed-675d6f6e40e6'
)
AND NOT EXISTS (
  SELECT 1 FROM public.member_roles x
  WHERE x.user_id = p.id AND x.role = 'committee'
    AND coalesce(x.committee,'') ILIKE 'Merchandise'
);

-- 3) Officer desk: Officers + Board + non-merchandise chairs -------------------
-- Merchandise stays on can_manage_shop → shopOnly scoped desk in Hub JS.
CREATE OR REPLACE FUNCTION public.is_krewe_officer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.member_roles r
    WHERE r.user_id = auth.uid()
      AND r.role IN ('board', 'officer', 'captain', 'treasurer', 'secretary')
  )
  OR EXISTS (
    SELECT 1
    FROM public.members m
    JOIN public.profiles p ON p.member_id = m.id
    WHERE p.id = auth.uid()
      AND m.membership_status = 'active'
      AND m.merged_into IS NULL
      AND (
        m.member_role IN ('officer', 'captain', 'board')
        OR (
          coalesce(m.officer_title, '') ~* '(president|vice president|treasurer|secretary|board member|(^|·) ?board($| ·)|committee chair|chair of)'
          AND coalesce(m.officer_title, '') !~* 'merchandise'
        )
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.member_roles r
    WHERE r.user_id = auth.uid()
      AND r.role = 'committee'
      AND coalesce(r.committee, '') !~* '(merchandise|merch|shop|store)'
      AND coalesce(r.committee, '') <> ''
  );
$function$;

COMMENT ON FUNCTION public.is_krewe_officer() IS
  'True for board/officers/captains and non-merchandise committee chairs. Merch chairs use can_manage_shop for scoped Shop Studio.';
