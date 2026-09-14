-- Media officer approval for photos and videos
-- Adds approval fields, append-only log, pending submit RPCs, officer decide RPCs,
-- gallery-photos storage bucket, and backfills existing live media as approved.

-- 1) Columns on content_items
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by_name text,
  ADD COLUMN IF NOT EXISTS denial_note text;

ALTER TABLE public.content_items
  DROP CONSTRAINT IF EXISTS content_items_approval_status_check;

ALTER TABLE public.content_items
  ADD CONSTRAINT content_items_approval_status_check
  CHECK (approval_status IS NULL OR approval_status IN ('pending', 'approved', 'denied'));

CREATE INDEX IF NOT EXISTS content_items_pending_media_idx
  ON public.content_items (created_at DESC)
  WHERE type IN ('photo', 'video') AND approval_status = 'pending';

CREATE INDEX IF NOT EXISTS content_items_type_published_idx
  ON public.content_items (type, is_published, created_at DESC);

-- 2) Backfill: already-live photos/videos count as approved (do not hide them)
UPDATE public.content_items
   SET approval_status = 'approved',
       approved_at = coalesce(approved_at, created_at),
       approved_by_name = coalesce(approved_by_name, 'Backfilled (already live)')
 WHERE type IN ('photo', 'video')
   AND coalesce(is_published, false) = true
   AND (approval_status IS NULL OR approval_status = '');

-- Non-media stays immediate; leave approval_status null

-- 3) Append-only approval log
CREATE TABLE IF NOT EXISTS public.content_approval_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('approve', 'deny', 'submit')),
  officer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  officer_email text,
  officer_name text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_approval_log_created_idx
  ON public.content_approval_log (created_at DESC);

CREATE INDEX IF NOT EXISTS content_approval_log_content_idx
  ON public.content_approval_log (content_id, created_at DESC);

ALTER TABLE public.content_approval_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_approval_log_officer_select ON public.content_approval_log;
CREATE POLICY content_approval_log_officer_select ON public.content_approval_log
  FOR SELECT TO authenticated
  USING (public.is_krewe_officer());

-- inserts only via security definer RPCs
DROP POLICY IF EXISTS content_approval_log_no_direct_write ON public.content_approval_log;
-- no insert/update/delete policies for authenticated/anon

GRANT SELECT ON public.content_approval_log TO authenticated;

-- 4) Tighten public read: published media must also be approved
DROP POLICY IF EXISTS content_public_read ON public.content_items;
CREATE POLICY content_public_read ON public.content_items
  FOR SELECT TO public
  USING (
    public.is_krewe_officer()
    OR (
      is_published = true
      AND (
        type NOT IN ('photo', 'video')
        OR coalesce(approval_status, 'approved') = 'approved'
      )
    )
  );

-- Members may still insert; photos/videos should land unpublished (enforced in RPCs + insertItem)

-- 5) Helper: resolve current officer display name / email
CREATE OR REPLACE FUNCTION public._officer_actor()
RETURNS TABLE (uid uuid, email text, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    auth.uid(),
    coalesce(
      (SELECT m.email FROM public.profiles p JOIN public.members m ON m.id = p.member_id WHERE p.id = auth.uid()),
      (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
    ),
    coalesce(
      nullif(trim(coalesce(
        (SELECT trim(coalesce(m.first_name,'') || ' ' || coalesce(m.last_name,''))
           FROM public.profiles p JOIN public.members m ON m.id = p.member_id WHERE p.id = auth.uid()),
        ''
      )), ''),
      nullif(trim(coalesce(
        (SELECT coalesce(p.full_name, trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')))
           FROM public.profiles p WHERE p.id = auth.uid()),
        ''
      )), ''),
      (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public._submitter_label(p_user uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce(
    nullif(trim(coalesce(
      (SELECT trim(coalesce(m.first_name,'') || ' ' || coalesce(m.last_name,''))
         FROM public.profiles p JOIN public.members m ON m.id = p.member_id WHERE p.id = p_user),
      ''
    )), ''),
    nullif(trim(coalesce(
      (SELECT coalesce(p.full_name, trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')))
         FROM public.profiles p WHERE p.id = p_user),
      ''
    )), ''),
    (SELECT u.email FROM auth.users u WHERE u.id = p_user),
    'Member'
  );
$$;

-- 6) Rotate published videos (used on approve, not on pending submit)
CREATE OR REPLACE FUNCTION public._rotate_published_videos(p_keep_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $$
DECLARE
  v_count int;
  v_rotated int := 0;
  v_removed_titles text[] := array[]::text[];
  v_old record;
  v_path text;
  v_prefix text := 'https://oazwkwflgbthojvnclfc.supabase.co/storage/v1/object/public/krewe-videos/';
BEGIN
  LOOP
    SELECT count(*)::int INTO v_count
    FROM public.content_items
    WHERE type = 'video'
      AND coalesce(is_published, false) = true
      AND coalesce(is_demo, false) = false
      AND coalesce(approval_status, 'approved') = 'approved';

    EXIT WHEN v_count <= 15;

    SELECT id, title, url INTO v_old
    FROM public.content_items
    WHERE type = 'video'
      AND coalesce(is_published, false) = true
      AND coalesce(is_demo, false) = false
      AND coalesce(approval_status, 'approved') = 'approved'
      AND id <> p_keep_id
    ORDER BY created_at ASC NULLS FIRST, id ASC
    LIMIT 1;

    EXIT WHEN NOT FOUND;

    IF v_old.url IS NOT NULL AND position(v_prefix IN v_old.url) = 1 THEN
      v_path := substring(v_old.url FROM length(v_prefix) + 1);
      v_path := replace(v_path, '%20', ' ');
      DELETE FROM storage.objects
      WHERE bucket_id = 'krewe-videos' AND name = v_path;
    END IF;

    DELETE FROM public.content_items WHERE id = v_old.id;
    v_rotated := v_rotated + 1;
    v_removed_titles := array_append(v_removed_titles, v_old.title);
  END LOOP;

  SELECT count(*)::int INTO v_count
  FROM public.content_items
  WHERE type = 'video'
    AND coalesce(is_published, false) = true
    AND coalesce(is_demo, false) = false
    AND coalesce(approval_status, 'approved') = 'approved';

  RETURN jsonb_build_object(
    'count', v_count,
    'rotated', v_rotated > 0,
    'rotated_count', v_rotated,
    'removed_titles', to_jsonb(v_removed_titles),
    'limit', 15
  );
END;
$$;

-- 7) Submit video: pending, not public, no rotation yet
CREATE OR REPLACE FUNCTION public.publish_krewe_video(p_title text, p_url text, p_notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_new_id uuid;
  v_pending int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required to submit a video';
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Video title is required';
  END IF;
  IF p_url IS NULL OR length(trim(p_url)) = 0 THEN
    RAISE EXCEPTION 'Video URL is required';
  END IF;
  IF NOT public.has_media_consent() THEN
    RAISE EXCEPTION 'Media consent required before submitting videos';
  END IF;

  INSERT INTO public.content_items (
    type, title, url, notes, is_published, is_demo,
    submitted_by, approval_status
  ) VALUES (
    'video', trim(p_title), trim(p_url), nullif(trim(coalesce(p_notes, '')), ''),
    false, false, v_uid, 'pending'
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.content_approval_log (content_id, action, officer_id, officer_email, officer_name, note)
  VALUES (v_new_id, 'submit', v_uid, NULL, public._submitter_label(v_uid), 'Member video submission');

  SELECT count(*)::int INTO v_pending
  FROM public.content_items
  WHERE type = 'video' AND approval_status = 'pending';

  RETURN jsonb_build_object(
    'id', v_new_id,
    'status', 'pending',
    'pending_count', v_pending,
    'limit', 15
  );
END;
$$;

-- 8) Submit photo RPC (preferred path; also safe for direct insert)
CREATE OR REPLACE FUNCTION public.submit_krewe_photo(p_title text, p_url text, p_notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_new_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required to submit a photo';
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Photo title is required';
  END IF;
  IF p_url IS NULL OR length(trim(p_url)) = 0 THEN
    RAISE EXCEPTION 'Photo URL is required';
  END IF;
  IF NOT public.has_media_consent() THEN
    RAISE EXCEPTION 'Media consent required before submitting photos';
  END IF;

  INSERT INTO public.content_items (
    type, title, url, notes, is_published, is_demo,
    submitted_by, approval_status
  ) VALUES (
    'photo', trim(p_title), trim(p_url), nullif(trim(coalesce(p_notes, '')), ''),
    false, false, v_uid, 'pending'
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.content_approval_log (content_id, action, officer_id, officer_email, officer_name, note)
  VALUES (v_new_id, 'submit', v_uid, NULL, public._submitter_label(v_uid), 'Member photo submission');

  RETURN jsonb_build_object('id', v_new_id, 'status', 'pending');
END;
$$;

-- 9) Officer: list pending media
CREATE OR REPLACE FUNCTION public.list_pending_media_approvals()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_krewe_officer() THEN RETURN NULL; END IF;

  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id,
      'type', c.type,
      'title', c.title,
      'url', c.url,
      'notes', c.notes,
      'created_at', c.created_at,
      'submitted_by', c.submitted_by,
      'submitter_name', public._submitter_label(c.submitted_by)
    ) ORDER BY c.created_at)
    FROM public.content_items c
    WHERE c.type IN ('photo', 'video')
      AND c.approval_status = 'pending'
  ), '[]'::jsonb);
END;
$$;

-- 10) Officer: approve
CREATE OR REPLACE FUNCTION public.approve_content_item(p_id uuid, p_note text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.content_items%ROWTYPE;
  v_actor record;
  v_rot jsonb := '{}'::jsonb;
BEGIN
  IF NOT public.is_krewe_officer() THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Officers only');
  END IF;

  SELECT * INTO v_row FROM public.content_items
   WHERE id = p_id AND type IN ('photo', 'video') AND approval_status = 'pending'
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Item not found or already decided');
  END IF;

  SELECT * INTO v_actor FROM public._officer_actor();

  UPDATE public.content_items
     SET is_published = true,
         approval_status = 'approved',
         approved_at = now(),
         approved_by = v_actor.uid,
         approved_by_name = v_actor.display_name,
         denial_note = NULL
   WHERE id = p_id;

  INSERT INTO public.content_approval_log (content_id, action, officer_id, officer_email, officer_name, note)
  VALUES (p_id, 'approve', v_actor.uid, v_actor.email, v_actor.display_name, nullif(trim(coalesce(p_note, '')), ''));

  IF v_row.type = 'video' THEN
    v_rot := public._rotate_published_videos(p_id);
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', p_id, 'type', v_row.type, 'rotation', v_rot);
END;
$$;

-- 11) Officer: deny
CREATE OR REPLACE FUNCTION public.deny_content_item(p_id uuid, p_note text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.content_items%ROWTYPE;
  v_actor record;
BEGIN
  IF NOT public.is_krewe_officer() THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Officers only');
  END IF;

  SELECT * INTO v_row FROM public.content_items
   WHERE id = p_id AND type IN ('photo', 'video') AND approval_status = 'pending'
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Item not found or already decided');
  END IF;

  SELECT * INTO v_actor FROM public._officer_actor();

  UPDATE public.content_items
     SET is_published = false,
         approval_status = 'denied',
         approved_at = now(),
         approved_by = v_actor.uid,
         approved_by_name = v_actor.display_name,
         denial_note = nullif(trim(coalesce(p_note, '')), '')
   WHERE id = p_id;

  INSERT INTO public.content_approval_log (content_id, action, officer_id, officer_email, officer_name, note)
  VALUES (p_id, 'deny', v_actor.uid, v_actor.email, v_actor.display_name, nullif(trim(coalesce(p_note, '')), ''));

  RETURN jsonb_build_object('ok', true, 'id', p_id, 'type', v_row.type);
END;
$$;

-- 12) Officer: recent approval log (approve/deny only)
CREATE OR REPLACE FUNCTION public.list_content_approval_log(p_limit integer DEFAULT 40)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limit int := greatest(1, least(coalesce(p_limit, 40), 100));
BEGIN
  IF NOT public.is_krewe_officer() THEN RETURN NULL; END IF;

  RETURN coalesce((
    SELECT jsonb_agg(row_to_json(q)::jsonb)
    FROM (
      SELECT
        l.id,
        l.content_id,
        l.action,
        l.officer_id,
        l.officer_email,
        l.officer_name,
        l.note,
        l.created_at,
        c.type AS content_type,
        c.title AS content_title,
        c.url AS content_url,
        public._submitter_label(c.submitted_by) AS submitter_name
      FROM public.content_approval_log l
      JOIN public.content_items c ON c.id = l.content_id
      WHERE l.action IN ('approve', 'deny')
      ORDER BY l.created_at DESC
      LIMIT v_limit
    ) q
  ), '[]'::jsonb);
END;
$$;

-- 13) Include media pending in officer_pending_counts
CREATE OR REPLACE FUNCTION public.officer_pending_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN public.is_krewe_officer() THEN jsonb_build_object(
    'role_requests', (SELECT count(*) FROM public.role_requests WHERE status = 'pending'),
    'duplicates',    (SELECT count(*) FROM public.possible_duplicates WHERE status = 'open'),
    'unlinked',      (SELECT count(*) FROM auth.users u
                       LEFT JOIN public.profiles p ON p.id = u.id
                       WHERE p.member_id IS NULL),
    'media',         (SELECT count(*) FROM public.content_items
                       WHERE type IN ('photo','video') AND approval_status = 'pending')
  ) ELSE jsonb_build_object('role_requests', 0, 'duplicates', 0, 'unlinked', 0, 'media', 0) END;
$$;

-- 14) gallery-photos storage bucket + policies (mirror krewe-videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery-photos',
  'gallery-photos',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS gallery_photos_public_read ON storage.objects;
CREATE POLICY gallery_photos_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'gallery-photos');

DROP POLICY IF EXISTS gallery_photos_member_insert ON storage.objects;
CREATE POLICY gallery_photos_member_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'gallery-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS gallery_photos_member_update ON storage.objects;
CREATE POLICY gallery_photos_member_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'gallery-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'gallery-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS gallery_photos_member_delete ON storage.objects;
CREATE POLICY gallery_photos_member_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'gallery-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS gallery_photos_officer_delete ON storage.objects;
CREATE POLICY gallery_photos_officer_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'gallery-photos' AND public.is_krewe_officer());

GRANT EXECUTE ON FUNCTION public.submit_krewe_photo(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_pending_media_approvals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_content_item(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deny_content_item(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_content_approval_log(integer) TO authenticated;
