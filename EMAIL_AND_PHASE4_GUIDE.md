# Email Sending + Phase 4 (Member Communications) — Setup Guide

This finishes the email side of the forms **and** delivers Phase 4. Every email the
app sends — RSVP confirmations, dues reminders, welcome notes, lapsed-member outreach,
and broadcasts — now flows through one **outbound email queue**, sent by a single
**Edge Function** via **Resend**. It's all built and scheduled; you just add your
Resend key to switch sending on.

Project: Supabase **Tribe Test** (`njfzrnqwbnuhmopgpsud`).

---

## 1. The one thing you must do: connect Resend

Nothing sends until this is done. By design, the sender does nothing (and loses
nothing) until the key exists, so the rest is already wired and waiting.

1. **Create a free Resend account** at <https://resend.com>.
2. **Verify a sending identity** — either verify your domain (best; lets you send from
   e.g. `events@kreweofshamrock.com`) or use Resend's test sender for trials. Follow
   Resend's on-screen steps.
3. **Create an API key** in Resend (starts with `re_...`).
4. **Add it to Supabase** → open the **Tribe Test** project → **Edge Functions** →
   **Manage secrets** (or *Project Settings → Edge Functions → Secrets*) and add:
   - `RESEND_API_KEY` = your `re_...` key  *(required)*
   - `RESEND_FROM` = `Krewe of Shamrock <you@yourverifieddomain>`  *(recommended)*
   - `CRON_SECRET` = any random string  *(optional; see security note below)*

That's it. Within 5 minutes the scheduler picks up and sends anything queued.

---

## 2. What was built and deployed

| Piece | Type | Role |
|-------|------|------|
| `outbound_emails` | Table (queue) | Every outgoing email lands here first, with a `status` (`queued` → `sent`/`failed`). |
| `process-outbound-emails` | Edge Function | Reads queued emails and sends them via Resend. **Safe no-op when `RESEND_API_KEY` is unset.** |
| `flush-outbound-emails` | Cron job (every 5 min) | Calls the function to send whatever is queued. |
| `weekly-dues-reminders` | Cron job (Mon 9 AM) | Runs `send_dues_reminders()` to queue escalating dues reminders. |
| `rsvp_to_event` | Function (updated) | Now also queues a confirmation/waitlist email on each RSVP — **no change needed to the form**. |
| `on_member_status_change` | Trigger | Queues a **welcome** email when a member becomes active, and a **"we miss you"** email when one goes lapsed. |

### Verified working
A test member created as active queued a **welcome** email, and flipping them to lapsed
queued a **"we miss you"** email — both landed in `outbound_emails` as `queued`,
confirming the trigger → queue path end to end. (Test data was removed afterward.)

---

## 3. Phase 4 — Member communications features

### Always-current mailing lists (segment views)
No more stale address lists — these read live from the database:

- `v_active_member_emails` — all active members.
- `v_officer_emails` — officers, captains, board.
- `v_lapsed_member_emails` — lapsed members (win-back).
- `v_event_attendee_emails` — everyone signed up for an event (filter by `event_id`).

Example — export the current active-member list:
```sql
select first_name, last_name, email from public.v_active_member_emails;
```

### Automatic triggered emails
- **Welcome:** sent when a member's status becomes `active` (new or upgraded).
- **Lapsed / win-back:** sent when a member's status changes to `lapsed`.

These fire automatically from the `members` table — just change a status and the email
queues itself.

### Broadcasts (newsletters / announcements)
Queue a message to a whole segment with one call (run as a signed-in user):
```sql
-- segments: 'active', 'officers', or 'all'
select public.queue_broadcast(
  'Parade lineup is set! 🍀',
  '<p>Hi friends, here are the details for Saturday...</p>',
  'active'
);
```
It returns how many recipients were queued; the sender does the rest.
Bodies are wrapped in the Shamrock branded HTML frame (see All Krewe Messages below).


### Officer desk — All Krewe Messages
Officers can compose and send a message to **all current (active) members** from
**Member Hub → Officer desk → All Krewe Messages**. The UI calls
`send_all_krewe_message(subject, html, 'active')`, which:

1. Invokes `queue_broadcast(..., 'active')` so each recipient is enqueued in
   `outbound_emails` (same Resend / `process-outbound-emails` path — no parallel
   sender).
2. Saves a history row in `all_krewe_messages` (subject, body, sent_by,
   recipient_count, segment, created_at).

**Branded template:** `queue_broadcast` wraps every broadcast body with
`wrap_all_krewe_email_html(subject, body)` — deep-green header + emblem, gold
accents, paper content card, and muted footer linking to
[kreweofshamrock.com](https://www.kreweofshamrock.com/). The Officer desk stores
the officer-composed (unwrapped) HTML for history; only the queued outbound copy
is framed. Apply `sql/kos_all_krewe_messages.sql` first, then the delta
`sql/kos_all_krewe_email_template.sql` on Supabase. Already-wrapped bodies
(marker `<!-- kos-all-krewe-email -->` or class `kos-akm-wrap`) are not
double-wrapped.

RLS and the RPCs require `is_krewe_officer()`; non-officers see no UI and cannot
insert or list.

**Members can read every send in the Hub.** Each All Krewe Message also appears
on the Member Hub Home tab under **📜 Krewe Tidings** (latest in full,
full archive behind "See all announcements"), so information sent by email
also lives in the Members Hub. Details: `KREWE_ANNOUNCEMENTS.md`.

---

## 4. How each email type flows

| Email | Triggered by | Queued by |
|-------|--------------|-----------|
| RSVP confirmation / waitlist | Someone submits the sign-up form | `rsvp_to_event` |
| Dues reminder (1st/2nd/final) | Weekly cron (Mon 9 AM) | `send_dues_reminders()` |
| Welcome | Member becomes active | `on_member_status_change` trigger |
| Lapsed / win-back | Member becomes lapsed | `on_member_status_change` trigger |
| Broadcast | You call `queue_broadcast(...)` | `queue_broadcast` |

All of them land in `outbound_emails` and are sent by the same function on the
5-minute schedule.

---

## 5. Monitoring & control

**See the email queue / history:**
```sql
select created_at, purpose, to_email, subject, status, error
from public.outbound_emails
order by created_at desc
limit 50;
```
Statuses: `queued` (waiting), `sending` (in progress), `sent` (done), `failed` (gave
up after 3 tries — see `error`).

**Send right now instead of waiting 5 minutes:** in the dashboard, open **Edge
Functions → process-outbound-emails → Invoke**, or re-run the cron command manually.

**See scheduled jobs:**
```sql
select jobid, jobname, schedule, active from cron.job;
```

**Pause a schedule** (e.g., stop dues reminders while you finalize wording):
```sql
select cron.unschedule('weekly-dues-reminders');
-- re-create later with: select cron.schedule('weekly-dues-reminders','0 9 * * 1',
--   $$ select public.send_dues_reminders(); $$);
```

---

## 6. Before going live

- **Delete the sample data** (Maureen, Sean, Bridget, the sample events) so reminders
  and broadcasts don't go to `@example.com` test addresses.
- **Send yourself a test** first: add yourself as an active member (triggers a welcome)
  or RSVP through the form, then confirm the email arrives and looks right.
- **Verify your domain in Resend** for best deliverability (test sender only reaches
  your own address).

---

## 7. Security notes

- **Publishable key** in the form and the **anon key** in the cron job are both safe to
  expose. The **service role key** is never in any file — the Edge Function gets it
  automatically from Supabase's environment.
- **`CRON_SECRET` (optional):** the sender function has `verify_jwt` off so the
  scheduler can call it. If you set a `CRON_SECRET` secret, also add it as an
  `x-cron-secret` header in the cron job and the function will reject calls without it.
  For a krewe-sized setup this is optional.
- **Expected advisor warnings:** Supabase's linter flags the public `rsvp_to_event`
  function (intentional — it's the form's front door), the admin `queue_broadcast` /
  `send_dues_reminders` functions (intentional), the broad internal-tool RLS policies
  (intentional), the pre-existing `rls_auto_enable` function (not ours), and `pg_net`
  living in the public schema (a benign Supabase default). None require action.

---

## 8. What's next — Phase 5 (Onboarding)

The pieces are in place to finish the loop: a public **membership application form**
(like the event form), a **pending-applications** review view, and an **approval
action** that auto-creates the first-year dues row and sends the welcome email (already
wired). Say the word and I'll build Phase 5.
