-- Scheduled krewe emails for events (Event Studio).
-- Applied to the Krewe of Shamrock project (oazwkwflgbthojvnclfc) on
-- 2026-09-19 as migration kos_event_scheduled_emails. Safe to re-run.
--
-- WHAT IT DOES: an officer creating or editing an event in Event Studio can
-- schedule up to three automatic emails to active members about that event:
--   1) announcement      — announces the event, sent at a chosen date/time
--   2) ticket_reminder   — reminds people to buy tickets, sent at a chosen
--                          date/time; skips members who already paid for
--                          this event
--   3) closing_warning   — warns that registration is closing, sent
--                          automatically TWO DAYS before the event's
--                          registration_closes_at; skips members who are
--                          already signed up
--
-- The Event Studio form saves the schedule with officer_set_event_scheduled_emails
-- and reads it back with officer_list_event_scheduled_emails. A pg_cron job
-- runs send_due_event_scheduled_emails() every 10 minutes; due emails are
-- rendered with wrap_all_krewe_email_html and queued through enqueue_email
-- into outbound_emails, which the existing flush-outbound-emails cron job
-- (process-outbound-emails edge function + Resend) actually delivers.
--
-- Nothing sends while the event is a draft: a due email waits and goes out on
-- the first worker run after the event is published. Cancelled events, events
-- that already started, and read-only IKC calendar copies never send. Each
-- email sends at most once (status flips scheduled -> sent).

-- 1. Schedule table (written only via security-definer functions; no client
--    policies on purpose, matching outbound_emails)
create table if not exists public.event_scheduled_emails (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  email_kind text not null,
  send_at timestamptz not null,
  subject text,
  status text not null default 'scheduled',
  sent_at timestamptz,
  recipient_count integer,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, email_kind)
);
alter table public.event_scheduled_emails enable row level security;

do $$ begin
  alter table public.event_scheduled_emails drop constraint if exists event_scheduled_emails_kind_check;
  alter table public.event_scheduled_emails add constraint event_scheduled_emails_kind_check
    check (email_kind in ('announcement','ticket_reminder','closing_warning'));
  alter table public.event_scheduled_emails drop constraint if exists event_scheduled_emails_status_check;
  alter table public.event_scheduled_emails add constraint event_scheduled_emails_status_check
    check (status in ('scheduled','sent','cancelled'));
exception when others then null;
end $$;

create index if not exists event_scheduled_emails_due_idx
  on public.event_scheduled_emails (send_at) where status = 'scheduled';

-- 2. Small HTML-escape helper for values interpolated into email bodies
create or replace function public.kos_email_html_escape(p text)
returns text language sql immutable set search_path to '' as
$$ select replace(replace(replace(replace(replace(coalesce(p, ''),
     '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;') $$;

-- 3. Read back the schedule for one event (Event Studio edit form)
create or replace function public.officer_list_event_scheduled_emails(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_emails jsonb;
begin
  if not public.can_manage_events() then
    return jsonb_build_object('ok', false, 'message', 'Not authorized.');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'email_kind', s.email_kind,
           'send_at', s.send_at,
           'subject', s.subject,
           'status', s.status,
           'sent_at', s.sent_at,
           'recipient_count', s.recipient_count)
         order by case s.email_kind
                    when 'announcement' then 1
                    when 'ticket_reminder' then 2
                    else 3 end), '[]'::jsonb)
    into v_emails
  from public.event_scheduled_emails s
  where s.event_id = p_event_id;
  return jsonb_build_object('ok', true, 'emails', v_emails);
end;
$$;

-- 4. Save the schedule for one event (Event Studio save)
-- p = { "event_id": "...",
--       "announcement":    { "enabled": bool, "send_at": iso, "subject": text|null },
--       "ticket_reminder": { "enabled": bool, "send_at": iso, "subject": text|null },
--       "closing_warning": { "enabled": bool, "subject": text|null } }
-- closing_warning's send time is always computed server-side as
-- registration_closes_at - 2 days. Disabling an email cancels its scheduled
-- row; a row that already sent is never re-sent or rescheduled.
create or replace function public.officer_set_event_scheduled_emails(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_event_id uuid;
  v_event public.events%rowtype;
  v_kind text;
  v_cfg jsonb;
  v_enabled boolean;
  v_send_at timestamptz;
  v_subject text;
  v_label text;
begin
  if not public.can_manage_events() then
    return jsonb_build_object('ok', false, 'message', 'Not authorized.');
  end if;
  begin
    v_event_id := (p->>'event_id')::uuid;
  exception when others then
    v_event_id := null;
  end;
  if v_event_id is null then
    return jsonb_build_object('ok', false, 'message', 'event_id is required.');
  end if;
  select * into v_event from public.events where id = v_event_id;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Event not found.');
  end if;
  if coalesce(v_event.source, 'krewe') = 'ikc' then
    return jsonb_build_object('ok', false, 'message', 'IKC calendar events are read-only.');
  end if;

  -- Validation pass first, so a bad config changes nothing at all.
  foreach v_kind in array array['announcement','ticket_reminder','closing_warning'] loop
    v_cfg := p->v_kind;
    v_enabled := coalesce((v_cfg->>'enabled')::boolean, false);
    if not v_enabled then
      continue;
    end if;
    v_label := replace(v_kind, '_', ' ');
    if v_event.start_time is not null and v_event.start_time <= now() then
      return jsonb_build_object('ok', false, 'message', 'This event already started; scheduled emails cannot be added.');
    end if;
    if v_kind = 'closing_warning' then
      if v_event.registration_closes_at is null then
        return jsonb_build_object('ok', false, 'message', 'Set "Close registrations on" before scheduling the registration-closing warning email.');
      end if;
      if v_event.registration_closes_at <= now() then
        return jsonb_build_object('ok', false, 'message', 'Registration already closed; the closing warning email cannot be scheduled.');
      end if;
    else
      begin
        v_send_at := (v_cfg->>'send_at')::timestamptz;
      exception when others then
        v_send_at := null;
      end;
      if v_send_at is null then
        return jsonb_build_object('ok', false, 'message', 'Pick a send date/time for the ' || v_label || ' email.');
      end if;
      if v_send_at < now() - interval '5 minutes' then
        return jsonb_build_object('ok', false, 'message', 'The ' || v_label || ' email send time is in the past. Pick a future date/time.');
      end if;
    end if;
  end loop;

  -- Apply pass.
  foreach v_kind in array array['announcement','ticket_reminder','closing_warning'] loop
    v_cfg := p->v_kind;
    v_enabled := coalesce((v_cfg->>'enabled')::boolean, false);
    if not v_enabled then
      update public.event_scheduled_emails
         set status = 'cancelled', updated_at = now()
       where event_id = v_event_id and email_kind = v_kind and status = 'scheduled';
      continue;
    end if;
    v_subject := nullif(btrim(coalesce(v_cfg->>'subject', '')), '');
    if v_kind = 'closing_warning' then
      v_send_at := v_event.registration_closes_at - interval '2 days';
    else
      v_send_at := (v_cfg->>'send_at')::timestamptz;
    end if;
    insert into public.event_scheduled_emails as t (event_id, email_kind, send_at, subject, created_by)
    values (v_event_id, v_kind, v_send_at, v_subject, auth.uid())
    on conflict (event_id, email_kind) do update
      set send_at = excluded.send_at,
          subject = excluded.subject,
          status = 'scheduled',
          updated_at = now()
      where t.status <> 'sent';  -- an already-sent email is never re-armed
  end loop;

  return public.officer_list_event_scheduled_emails(v_event_id);
end;
$$;

-- 5. The worker pg_cron runs: queue every due email exactly once
create or replace function public.send_due_event_scheduled_emails()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r record;
  rec record;
  v_signup_url text;
  v_when text;
  v_close text;
  v_subject text;
  v_body text;
  v_details text;
  v_wrapped text;
  v_count integer;
  v_sent integer := 0;
  v_cancelled integer := 0;
begin
  for r in
    select s.id as schedule_id, s.email_kind, s.subject as custom_subject,
           e.id as event_id, e.name, e.description, e.start_time, e.location,
           e.status as event_status, coalesce(e.source, 'krewe') as source,
           e.registration_closes_at, e.ticket_payment_url,
           e.ticket_price_cents, e.ticket_label
    from public.event_scheduled_emails s
    join public.events e on e.id = s.event_id
    where s.status = 'scheduled' and s.send_at <= now()
    order by s.send_at
    for update of s skip locked
  loop
    -- Never email about cancelled events, IKC calendar copies, events that
    -- already started, or a closing warning whose close date is gone or past.
    if r.event_status = 'cancelled'
       or r.source = 'ikc'
       or (r.start_time is not null and r.start_time <= now())
       or (r.email_kind = 'closing_warning'
           and (r.registration_closes_at is null or r.registration_closes_at <= now())) then
      update public.event_scheduled_emails
         set status = 'cancelled', updated_at = now()
       where id = r.schedule_id;
      v_cancelled := v_cancelled + 1;
      continue;
    end if;

    -- Drafts wait: the email fires on the first run after the event publishes.
    if r.event_status <> 'published' then
      continue;
    end if;

    v_signup_url := 'https://www.kreweofshamrock.com/event-signup.html?event=' || r.event_id;
    v_when := to_char(r.start_time at time zone 'America/New_York',
                      'FMDay, FMMonth FMDD, YYYY at FMHH12:MI PM');
    v_close := case when r.registration_closes_at is null then null
                    else to_char(r.registration_closes_at at time zone 'America/New_York',
                                 'FMDay, FMMonth FMDD, YYYY at FMHH12:MI PM') end;

    v_details :=
      '<h2 style="margin:0 0 12px;">' || public.kos_email_html_escape(r.name) || '</h2>' ||
      '<p style="margin:0 0 8px;"><b>When:</b> ' || public.kos_email_html_escape(v_when) || '</p>' ||
      case when nullif(btrim(coalesce(r.location, '')), '') is not null
           then '<p style="margin:0 0 8px;"><b>Where:</b> ' || public.kos_email_html_escape(r.location) || '</p>'
           else '' end ||
      case when r.ticket_price_cents is not null
           then '<p style="margin:0 0 8px;"><b>Tickets:</b> $' ||
                to_char(r.ticket_price_cents / 100.0, 'FM999,990.00') ||
                case when nullif(btrim(coalesce(r.ticket_label, '')), '') is not null
                     then ' (' || public.kos_email_html_escape(r.ticket_label) || ')' else '' end ||
                '</p>'
           else '' end ||
      case when nullif(btrim(coalesce(r.ticket_payment_url, '')), '') is not null
           then '<p style="margin:0 0 8px;"><a href="' || public.kos_email_html_escape(r.ticket_payment_url) ||
                '">Buy tickets</a></p>'
           else '' end ||
      '<p style="margin:0 0 8px;"><a href="' || v_signup_url || '">Sign me up / RSVP</a></p>' ||
      case when v_close is not null
           then '<p style="margin:0 0 8px;">Registration closes ' || public.kos_email_html_escape(v_close) || '.</p>'
           else '' end;

    if r.email_kind = 'announcement' then
      v_subject := coalesce(r.custom_subject, 'New Krewe event: ' || r.name);
      v_body :=
        '<p style="margin:0 0 12px;">The Krewe of Shamrock just added a new event to the calendar. Save the date!</p>' ||
        case when nullif(btrim(coalesce(r.description, '')), '') is not null
             then '<p style="margin:0 0 12px;">' || public.kos_email_html_escape(r.description) || '</p>'
             else '' end ||
        v_details;
    elsif r.email_kind = 'ticket_reminder' then
      v_subject := coalesce(r.custom_subject, 'Reminder: get your tickets for ' || r.name);
      v_body :=
        '<p style="margin:0 0 12px;">A friendly reminder to get your tickets for this Krewe event before it sneaks up on you.</p>' ||
        v_details;
    else
      v_subject := coalesce(r.custom_subject, 'Last call: registration for ' || r.name || ' closes soon');
      v_body :=
        '<p style="margin:0 0 12px;">Registration for this event closes on <b>' ||
        public.kos_email_html_escape(v_close) ||
        '</b>. Sign up now so you do not miss it.</p>' ||
        v_details;
    end if;

    v_wrapped := public.wrap_all_krewe_email_html(v_subject, v_body);

    v_count := 0;
    for rec in
      select v.member_id, v.first_name, v.last_name, v.email
      from public.v_active_member_emails v
      where (r.email_kind = 'announcement')
         or (r.email_kind = 'ticket_reminder' and not exists (
               select 1 from public.event_signups g
               where g.event_id = r.event_id and g.member_id = v.member_id
                 and g.payment_status = 'paid'))
         or (r.email_kind = 'closing_warning' and not exists (
               select 1 from public.event_signups g
               where g.event_id = r.event_id and g.member_id = v.member_id
                 and coalesce(g.status, '') in ('registered','confirmed','attended')))
    loop
      perform public.enqueue_email(
        rec.email,
        nullif(btrim(coalesce(rec.first_name, '') || ' ' || coalesce(rec.last_name, '')), ''),
        v_subject,
        v_wrapped,
        'event_' || r.email_kind,
        rec.member_id);
      v_count := v_count + 1;
    end loop;

    update public.event_scheduled_emails
       set status = 'sent', sent_at = now(), recipient_count = v_count, updated_at = now()
     where id = r.schedule_id;
    v_sent := v_sent + 1;
  end loop;

  return jsonb_build_object('ok', true, 'emails_sent', v_sent, 'emails_cancelled', v_cancelled);
end;
$$;

-- 6. Keep the closing warning in step with the event's close date.
-- If an officer moves "Close registrations on", the scheduled warning moves
-- with it; clearing the close date cancels a still-scheduled warning.
create or replace function public.sync_event_closing_warning()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.registration_closes_at is distinct from old.registration_closes_at then
    if new.registration_closes_at is null then
      update public.event_scheduled_emails
         set status = 'cancelled', updated_at = now()
       where event_id = new.id and email_kind = 'closing_warning' and status = 'scheduled';
    else
      update public.event_scheduled_emails
         set send_at = new.registration_closes_at - interval '2 days', updated_at = now()
       where event_id = new.id and email_kind = 'closing_warning' and status = 'scheduled';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_event_closing_warning on public.events;
create trigger trg_sync_event_closing_warning
  after update of registration_closes_at on public.events
  for each row execute function public.sync_event_closing_warning();

-- 7. Grants: officers save/read through the RPCs; the worker is cron-only.
revoke all on function public.officer_set_event_scheduled_emails(jsonb) from public, anon;
grant execute on function public.officer_set_event_scheduled_emails(jsonb) to authenticated;
revoke all on function public.officer_list_event_scheduled_emails(uuid) from public, anon;
grant execute on function public.officer_list_event_scheduled_emails(uuid) to authenticated;
revoke execute on function public.send_due_event_scheduled_emails() from public, anon, authenticated;
revoke execute on function public.kos_email_html_escape(text) from public, anon, authenticated;
revoke execute on function public.sync_event_closing_warning() from public, anon, authenticated;

-- 8. Check for due emails every 10 minutes. Run once by hand with:
--    select public.send_due_event_scheduled_emails();
create extension if not exists pg_cron;
select cron.schedule('send-event-scheduled-emails', '*/10 * * * *',
                     $$select public.send_due_event_scheduled_emails()$$);
