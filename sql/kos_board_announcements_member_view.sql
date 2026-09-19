-- ============================================================================
-- Krewe Tidings: member-facing view of all-krewe announcements.
--
-- Officers already compose and send all-krewe messages from the Officer desk
-- (all_krewe_messages -> queue_broadcast -> outbound_emails), but until now
-- members could only see them in email. This function lets any signed-in
-- roster member read the most recent announcements so the Hub Home tab can
-- show a "Krewe Tidings" card (with the illuminated drop capital).
--
-- list_all_krewe_messages (officer-only, with recipient counts) is untouched;
-- this member view returns only subject, body, date, and the sender's name.
--
-- Applied to Supabase as migration kos_board_announcements_member_view.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_board_announcements(p_limit integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_limit int := greatest(1, least(coalesce(p_limit, 3), 10));
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
        ORDER BY m.created_at DESC
        LIMIT v_limit
      ) x
    ), '[]'::jsonb)
  );
END;
$function$;
