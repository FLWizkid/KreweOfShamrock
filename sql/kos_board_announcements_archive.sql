-- ============================================================================
-- Announcements archive: let members browse EVERY all-krewe message.
--
-- Officers send information by email from Officer desk → All Krewe Messages,
-- and each send is saved in all_krewe_messages. The Hub Home tab already shows
-- the three most recent as "Word from the Board" (list_board_announcements,
-- added by kos_board_announcements_member_view.sql), but the function capped
-- p_limit at 10, so the older messages could never be read in the Hub.
--
-- This migration raises the cap to 100 so the "See all announcements" control
-- on the Hub Home tab can load the full archive. Same signature, same
-- authorization (any signed-in roster member), same payload shape — existing
-- callers that ask for 3 keep working unchanged. It also stops showing
-- messages whose segment is 'officers' (an officer-only broadcast queued via
-- queue_broadcast in SQL) to the general membership; the Officer desk UI
-- always sends 'active', so nothing officers send from the Hub is hidden.
--
-- Safe to run more than once. Apply in the Supabase SQL editor on project
-- oazwkwflgbthojvnclfc (or as migration kos_board_announcements_archive).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_board_announcements(p_limit integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_limit int := greatest(1, least(coalesce(p_limit, 3), 100));
BEGIN
  IF auth.uid() IS NULL OR public._clover_request_member_id() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Members only', 'messages', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'messages', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
          'id', x.id,
          'subject', x.subject,
          'body_html', x.body_html,
          'created_at', x.created_at,
          'sender_name', x.sender_name
        ) ORDER BY x.created_at DESC)
      FROM (
        SELECT m.id, m.subject, m.body_html, m.created_at,
          (SELECT nullif(trim(concat_ws(' ', mm.first_name, mm.last_name)), '')
             FROM public.profiles pr
             JOIN public.members mm ON mm.id = pr.member_id
            WHERE pr.id = m.sent_by
            LIMIT 1) AS sender_name
        FROM public.all_krewe_messages m
        WHERE coalesce(m.segment, 'active') <> 'officers'
        ORDER BY m.created_at DESC
        LIMIT v_limit
      ) x
    ), '[]'::jsonb)
  );
END;
$function$;
