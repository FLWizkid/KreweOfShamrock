# Scheduled krewe emails for events

Officers creating an event in **Event Studio** can queue up to three automatic
emails to active members about that event:

| # | Email | When it sends | Who receives it |
|---|-------|---------------|-----------------|
| 1 | **Announcement** | At a date/time the officer picks | Every active member (`v_active_member_emails`) |
| 2 | **Buy-your-tickets reminder** | At a date/time the officer picks | Active members who have **not** already paid for this event (`event_signups.payment_status = 'paid'` is skipped) |
| 3 | **Registration-closing warning** | Automatically **two days before** the event's "Close registrations on" date | Active members who have **not** already signed up (a `registered` / `confirmed` / `attended` signup is skipped) |

All three use the branded All-Krewe template (`wrap_all_krewe_email_html`) and
go out through the existing pipeline: rows are queued into `outbound_emails`
by `enqueue_email`, and the `flush-outbound-emails` cron job delivers them via
the `process-outbound-emails` edge function and Resend. If `RESEND_API_KEY` is
not configured yet, queued emails simply wait (see `EMAIL_AND_PHASE4_GUIDE.md`).

## How officers use it

1. Open `members.html` → **Officer desk** → **Event Studio**.
2. Create or edit an event. In the form, find **Scheduled krewe emails
   (optional)** and check **Schedule krewe emails for this event**.
3. Turn on any of the three emails:
   - **Announcement** and **Buy-your-tickets reminder** each need a send
     date/time. The subject line is optional; a sensible default is generated
     ("New Krewe event: …", "Reminder: get your tickets for …").
   - **Registration-closing warning** has no date picker: it always sends two
     days before the **Close registrations on** date at the top of the form,
     so that date must be set first. The form shows the computed send time.
4. Press **☘ Save event**. The schedule is stored with the event. The status
   line under the checkboxes confirms what is scheduled or already sent.
5. Publish the event when ready. **Nothing sends while the event is a
   draft** — an email whose send time passes while the event is still a draft
   goes out shortly after you publish (within about ten minutes).

Other behavior worth knowing:

- Unchecking an email (or the whole block) and saving cancels the scheduled
  send. An email that already went out is never sent twice and never re-armed.
- Moving the "Close registrations on" date automatically moves the scheduled
  closing warning with it (a database trigger keeps them in step). Clearing
  the close date cancels the warning.
- Cancelled events, events whose start time has passed, and read-only IKC
  calendar events never send.
- Email bodies are generated from the event: name, date/time (Eastern time),
  location teaser, description (announcement only), ticket price/label, the
  Zeffy **Buy tickets** link when set, the public **Sign me up / RSVP** link
  (`event-signup.html?event=<id>`), and the registration close date.

## Deploying (one-time)

The schema, RPCs, worker, trigger, and cron job all live in
**`sql/kos_event_scheduled_emails.sql`**. It was applied to the live project
`oazwkwflgbthojvnclfc` on 2026-09-19 as migration
`kos_event_scheduled_emails` (cron job id 3, running as `postgres`). Safe to
re-run from the Supabase SQL editor if it ever needs to be reapplied. If the
SQL were ever missing, the rest of Event Studio keeps working; only the
email-schedule panel would report that its save failed.

What the script creates:

- Table `event_scheduled_emails` (one row per event per email kind; RLS on,
  no client policies — all access is through security-definer RPCs).
- `officer_set_event_scheduled_emails(p jsonb)` and
  `officer_list_event_scheduled_emails(p_event_id uuid)` — both gated by
  `can_manage_events()`, callable by `authenticated` only.
- `send_due_event_scheduled_emails()` — the worker; execute is revoked from
  clients so only cron can run it.
- Trigger `trg_sync_event_closing_warning` on `events` — keeps the closing
  warning aligned with `registration_closes_at`.
- pg_cron job `send-event-scheduled-emails`, every 10 minutes.

## Monitoring

```sql
-- What is scheduled, sent, or cancelled
select e.name, s.email_kind, s.send_at, s.status, s.sent_at, s.recipient_count
from event_scheduled_emails s join events e on e.id = s.event_id
order by s.send_at desc;

-- Is the cron job registered and active?
select jobid, jobname, schedule, active from cron.job
where jobname = 'send-event-scheduled-emails';

-- Run the worker once by hand
select public.send_due_event_scheduled_emails();

-- Queued/sent deliveries produced by this feature
select to_email, subject, purpose, status, created_at, sent_at
from outbound_emails
where purpose in ('event_announcement','event_ticket_reminder','event_closing_warning')
order by created_at desc limit 50;
```

To pause the whole feature: `select cron.unschedule('send-event-scheduled-emails');`
(re-running the SQL file re-schedules it).

## Files

- `sql/kos_event_scheduled_emails.sql` — schema, RPCs, worker, trigger, cron.
- `assets/members-desk.js` — the Event Studio form panel, validation, and the
  save/load calls (`officer_set_event_scheduled_emails` /
  `officer_list_event_scheduled_emails`).
- `tests/specs/event-scheduled-emails.spec.js` — Playwright coverage for the
  panel and its client-side validation.
