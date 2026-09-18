-- Unique Zeffy ticket link per krewe event.
-- Apply after the live officer_upsert_event (this version also keeps
-- registration_closes_at). Does not rewrite ticket prices.
-- Existing rows are not bulk-rewritten except one rule: if two priced
-- events already share a ticket URL, the later one loses the copy.
-- The earlier row keeps its URL, so the September 17 book club link stays.
-- No raffle, meal, or online-meeting columns are added.

create or replace function public.kos_ticket_url_key(p_url text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      regexp_replace(lower(btrim(coalesce(p_url, ''))), '[?#].*$', ''),
      '/+$',
      ''
    ),
    ''
  );
$$;

revoke all on function public.kos_ticket_url_key(text) from public, anon, authenticated;

-- Optional notice. The webhook URL and token live only in the Edge Function
-- environment (TICKET_URL_NOTIFY_URL, TICKET_URL_NOTIFY_TOKEN). This function
-- never embeds them. Missing headers, a missing function, or any HTTP error
-- is swallowed so the event save still succeeds. Draft saves do not call it.
create or replace function public.kos_notify_missing_ticket_url(p jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_req jsonb;
  v_host text;
  v_auth text;
  v_apikey text;
  v_headers extensions.http_header[];
begin
  begin
    v_req := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    return;
  end;
  if v_req is null or jsonb_typeof(v_req) <> 'object' then
    return;
  end if;

  v_host := lower(split_part(btrim(coalesce(v_req->>'host', v_req->>'Host', '')), ':', 1));
  -- Allow only this project's API host (already public in the site). Never
  -- post the session to a Host header an outsider supplied.
  if v_host is distinct from 'oazwkwflgbthojvnclfc.supabase.co' then
    return;
  end if;

  v_auth := nullif(btrim(coalesce(v_req->>'authorization', v_req->>'Authorization', '')), '');
  v_apikey := nullif(btrim(coalesce(v_req->>'apikey', v_req->>'Apikey', '')), '');
  if v_auth is null then
    return;
  end if;

  v_headers := array[
    extensions.http_header('Content-Type', 'application/json'),
    extensions.http_header('Authorization', v_auth)
  ];
  if v_apikey is not null then
    v_headers := v_headers || extensions.http_header('apikey', v_apikey);
  end if;

  begin
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '8');
    perform extensions.http((
      'POST'::extensions.http_method,
      'https://oazwkwflgbthojvnclfc.supabase.co/functions/v1/notify-missing-ticket-url',
      v_headers,
      'application/json',
      left(p::text, 4000)
    )::extensions.http_request);
  exception when others then
    return;
  end;
end;
$$;

revoke all on function public.kos_notify_missing_ticket_url(jsonb) from public, anon, authenticated;

create or replace function public.officer_upsert_event(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_row public.events%rowtype;
  v_name text;
  v_start timestamptz;
  v_featured boolean;
  v_raffle_opts text;
  v_reg_closes timestamptz;
  v_old_status text;
  v_old_url text;
  v_old_price integer;
  v_price integer;
  v_url text;
  v_status text;
  v_url_cleared boolean := false;
  v_became_published boolean := false;
begin
  if not public.can_manage_events() then
    return jsonb_build_object('ok', false, 'message',
      'Only board members, officers, and committee chairs can manage events.');
  end if;

  v_name := nullif(btrim(coalesce(p->>'name','')), '');
  if v_name is null then
    return jsonb_build_object('ok', false, 'message', 'Event name is required.');
  end if;

  begin
    v_start := (p->>'start_time')::timestamptz;
  exception when others then
    return jsonb_build_object('ok', false, 'message', 'A valid start date/time is required.');
  end;
  if v_start is null then
    return jsonb_build_object('ok', false, 'message', 'A valid start date/time is required.');
  end if;

  v_featured := coalesce((p->>'is_featured')::boolean, false);
  v_id := nullif(p->>'id','')::uuid;
  v_raffle_opts := coalesce(nullif(btrim(coalesce(p->>'raffle_options','')), ''), '0,1,5,15');

  v_reg_closes := null;
  if p ? 'registration_closes_at' then
    begin
      v_reg_closes := nullif(p->>'registration_closes_at','')::timestamptz;
    exception when others then
      return jsonb_build_object('ok', false, 'message', 'Please check the registration close date/time.');
    end;
  end if;

  v_old_status := null;
  v_old_url := null;
  v_old_price := null;
  if v_id is not null then
    select e.status, e.ticket_payment_url, e.ticket_price_cents
      into v_old_status, v_old_url, v_old_price
    from public.events e
    where e.id = v_id;
  end if;

  if p ? 'ticket_price_cents' then
    v_price := nullif(p->>'ticket_price_cents','')::integer;
  else
    v_price := v_old_price;
  end if;

  -- Blank stays blank. Never look up a sibling and copy its URL in.
  if p ? 'ticket_payment_url' then
    v_url := nullif(btrim(p->>'ticket_payment_url'), '');
  else
    v_url := nullif(btrim(coalesce(v_old_url, '')), '');
  end if;

  if coalesce(v_price, 0) > 0
     and public.kos_ticket_url_key(v_url) is not null
     and exists (
       select 1
       from public.events other
       where other.id is distinct from v_id
         and public.kos_ticket_url_key(other.ticket_payment_url)
             = public.kos_ticket_url_key(v_url)
     )
  then
    v_url := null;
    v_url_cleared := true;
  end if;

  v_status := nullif(btrim(coalesce(p->>'status', '')), '');
  if v_status is null then
    v_status := case when v_id is null then 'published' else v_old_status end;
  end if;
  v_became_published := lower(coalesce(v_status, '')) = 'published'
    and lower(coalesce(v_old_status, '')) <> 'published';

  if v_featured then
    update public.events set is_featured = false where is_featured = true and (v_id is null or id <> v_id);
  end if;

  if v_id is null then
    insert into public.events(
      name, description, event_type, start_time, end_time, location, capacity,
      is_mandatory, is_public, notes, source, ticket_price_cents, ticket_label,
      ticket_payment_url, flyer_url, status, created_by, is_featured,
      collect_guests, collect_guest_names, collect_raffle, raffle_options,
      registration_closes_at
    ) values (
      v_name, nullif(p->>'description',''), coalesce(nullif(p->>'event_type',''),'social'),
      v_start, nullif(p->>'end_time','')::timestamptz, nullif(p->>'location',''),
      nullif(p->>'capacity','')::integer,
      coalesce((p->>'is_mandatory')::boolean, false),
      coalesce((p->>'is_public')::boolean, true),
      nullif(p->>'notes',''), 'krewe',
      v_price,
      nullif(p->>'ticket_label',''),
      v_url,
      nullif(p->>'flyer_url',''),
      coalesce(v_status, 'published'),
      auth.uid(),
      v_featured,
      coalesce((p->>'collect_guests')::boolean, true),
      coalesce((p->>'collect_guest_names')::boolean, true),
      coalesce((p->>'collect_raffle')::boolean, true),
      v_raffle_opts,
      case when p ? 'registration_closes_at' then v_reg_closes else null end
    ) returning * into v_row;
  else
    update public.events e set
      name = v_name,
      description = coalesce(nullif(p->>'description',''), e.description),
      event_type = coalesce(nullif(p->>'event_type',''), e.event_type),
      start_time = v_start,
      end_time = case when p ? 'end_time' then nullif(p->>'end_time','')::timestamptz else e.end_time end,
      location = case when p ? 'location' then nullif(p->>'location','') else e.location end,
      capacity = case when p ? 'capacity' then nullif(p->>'capacity','')::integer else e.capacity end,
      is_mandatory = coalesce((p->>'is_mandatory')::boolean, e.is_mandatory),
      is_public = coalesce((p->>'is_public')::boolean, e.is_public),
      notes = case when p ? 'notes' then nullif(p->>'notes','') else e.notes end,
      ticket_price_cents = case when p ? 'ticket_price_cents' then v_price else e.ticket_price_cents end,
      ticket_label = case when p ? 'ticket_label' then nullif(p->>'ticket_label','') else e.ticket_label end,
      ticket_payment_url = case
        when (p ? 'ticket_payment_url') or v_url_cleared then v_url
        else e.ticket_payment_url
      end,
      flyer_url = case when p ? 'flyer_url' then nullif(p->>'flyer_url','') else e.flyer_url end,
      status = coalesce(v_status, e.status),
      is_featured = case when p ? 'is_featured' then v_featured else e.is_featured end,
      collect_guests = case when p ? 'collect_guests' then coalesce((p->>'collect_guests')::boolean, true) else e.collect_guests end,
      collect_guest_names = case when p ? 'collect_guest_names' then coalesce((p->>'collect_guest_names')::boolean, true) else e.collect_guest_names end,
      collect_raffle = case when p ? 'collect_raffle' then coalesce((p->>'collect_raffle')::boolean, true) else e.collect_raffle end,
      raffle_options = case when p ? 'raffle_options' then v_raffle_opts else e.raffle_options end,
      registration_closes_at = case when p ? 'registration_closes_at' then v_reg_closes else e.registration_closes_at end,
      updated_at = now()
    where e.id = v_id and coalesce(e.source,'') <> 'ikc'
    returning * into v_row;
    if not found then
      return jsonb_build_object('ok', false, 'message', 'Event not found or cannot be edited (IKC sync events are read-only).');
    end if;
  end if;

  -- Notice only when a priced event becomes published and still has no
  -- ticket URL of its own (blank, or cleared because another event had it).
  if v_became_published
     and coalesce(v_price, 0) > 0
     and public.kos_ticket_url_key(v_row.ticket_payment_url) is null
  then
    perform public.kos_notify_missing_ticket_url(jsonb_build_object(
      'became_published', true,
      'status', 'published',
      'ticket_price_cents', v_price,
      'ticket_payment_url', '',
      'event_id', v_row.id,
      'name', v_row.name,
      'start_time', v_row.start_time,
      'location', v_row.location,
      'reason', 'needs_own_ticket_url'
    ));
  end if;

  return jsonb_build_object(
    'ok', true,
    'event', to_jsonb(v_row),
    'ticket_url_cleared', v_url_cleared
  );
end;
$function$;

-- One-time: drop a copied Zeffy link from a later priced event.
-- The earlier event keeps its URL. Unique links, free events, and prices
-- are not touched. No notify.
update public.events e
   set ticket_payment_url = null,
       updated_at = now()
 where coalesce(e.source, '') <> 'ikc'
   and coalesce(e.ticket_price_cents, 0) > 0
   and public.kos_ticket_url_key(e.ticket_payment_url) is not null
   and exists (
     select 1
     from public.events earlier
     where earlier.id <> e.id
       and coalesce(earlier.source, '') <> 'ikc'
       and public.kos_ticket_url_key(earlier.ticket_payment_url)
           = public.kos_ticket_url_key(e.ticket_payment_url)
       and earlier.start_time < e.start_time
   );
