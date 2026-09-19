# Krewe of Shamrock — Database Backend Guide

This document explains the database backend that powers the Krewe of Shamrock app.
It is written for a beginner: every section tells you *what* something is, *why* it
exists, and *how* to use it.

---

## 1. What was set up

Your backend runs on **Supabase**, which is a hosted **PostgreSQL** database plus an
automatic web **API**. In plain terms:

- **PostgreSQL** is the database — the place your data lives, in tables.
- **Supabase** wraps that database and automatically gives you a secure web address
  (an "API") so a website or app can read and write data without you writing any
  server code.

The backend lives in the dedicated **Krewe of Shamrock** Supabase project.
(It originally started inside the old "Tribe Test" project; everything moved to
the dedicated project on 2026-09-03. Any reference to Tribe Test is stale —
ignore that project.)

### Connection details (updated 2026-09-19)

| Item | Value |
|------|-------|
| Project | Krewe of Shamrock |
| Project ref / ID | `oazwkwflgbthojvnclfc` |
| API URL | `https://oazwkwflgbthojvnclfc.supabase.co` |
| Publishable (client) key | `sb_publishable_aMCyVxkiolMuBt9_R990CA_xQmXLaaS` |
| Region | us-east-1 |
| Postgres version | 17 |

> The "four tables" below are the original core from the first setup. The
> backend has grown far beyond them — see the dated sections at the end of
> this document and the migrations in `sql/` for everything added since.

> **About keys.** The *publishable key* above is safe to put in a website or mobile
> app — it can only do what your security rules (below) allow. There is also a
> separate **service role key** (found in your Supabase dashboard under
> *Project Settings → API*) that bypasses all security. **Never** put the service
> role key in a website, app, or anything a user could see. Keep it only on a
> trusted server.

---

## 2. The four tables

The database has four tables. Think of each table as a spreadsheet: columns define
what facts you store, and each row is one record.

### `members` — the roster

One row per person in the krewe.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Unique ID, generated automatically. |
| `first_name` | text | Required. |
| `last_name` | text | Required. |
| `email` | text | Must be unique (no two members share one). |
| `phone` | text | Optional. |
| `member_role` | text | One of: `member`, `officer`, `captain`, `board`, `prospect`. Defaults to `member`. |
| `membership_status` | text | One of: `active`, `inactive`, `lapsed`, `prospect`. Defaults to `active`. |
| `join_date` | date | Defaults to today. |
| `notes` | text | Free-form. |
| `created_at` | timestamp | Set automatically when the row is created. |
| `updated_at` | timestamp | Updated automatically whenever the row changes. |

### `dues_payments` — membership dues

One row per dues charge. A member can have several rows over the years.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Unique ID. |
| `member_id` | uuid | **Links to** `members.id`. If a member is deleted, their dues rows are removed too. |
| `membership_year` | int | The year the dues cover. Defaults to the current year. |
| `amount` | numeric | Dollar amount. Must be 0 or more. |
| `due_date` | date | When payment is due. |
| `paid` | boolean | `true` / `false`. Defaults to `false`. |
| `paid_date` | date | When it was actually paid. |
| `payment_method` | text | One of: `cash`, `check`, `card`, `paypal`, `square`, `other`. |
| `notes` | text | Free-form. |

### `events` — parades, parties, meetings, fundraisers

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Unique ID. |
| `name` | text | Required. |
| `description` | text | Optional. |
| `event_type` | text | One of: `parade`, `party`, `meeting`, `fundraiser`, `volunteer`, `other`. |
| `start_time` | timestamp | Date and time it starts. |
| `end_time` | timestamp | Date and time it ends. |
| `location` | text | Where it happens. |
| `capacity` | int | Max headcount (optional). |

### `event_signups` — who is attending or volunteering

This is a **join table**: each row links one member to one event. It answers
"who signed up for what."

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Unique ID. |
| `event_id` | uuid | **Links to** `events.id`. |
| `member_id` | uuid | **Links to** `members.id`. |
| `signup_role` | text | One of: `attendee`, `volunteer`, `organizer`. |
| `status` | text | One of: `registered`, `confirmed`, `attended`, `cancelled`, `waitlisted`. |
| `guests_count` | int | How many guests they're bringing. Defaults to 0. |
| `notes` | text | Free-form. |

A member can only sign up for a given event **once** (enforced by the database).

---

## 3. How the tables relate

```
        members
        /      \
       /        \
 dues_payments   event_signups ----- events
 (one member,    (one member signs    (one event has
  many dues)      up for one event)    many signups)
```

- A **member** can have many **dues_payments**.
- A **member** can have many **event_signups**.
- An **event** can have many **event_signups**.
- `event_signups` sits between members and events, connecting them.

These links are called **foreign keys**. They keep your data honest — you can't, for
example, record a dues payment for a member who doesn't exist.

---

## 4. Security (Row Level Security)

Every table has **Row Level Security (RLS)** turned on. With RLS on, a table is
locked by default and only the rules ("policies") you create allow access.

**Current rule:** any **signed-in** user can read and write all four tables.
Anonymous (not-signed-in) visitors get **no** access at all.

This is a sensible default for an **internal management tool** where everyone with a
login is a trusted krewe officer. When you build the front end, you'll add Supabase
**Authentication** so officers log in, and they'll automatically be able to use the
data.

> **Note for later:** Supabase's automated linter flags these "any signed-in user can
> do anything" rules as broad. That is expected and intentional here. If you later
> want finer control — for example, only officers can delete members, or members can
> only see their own dues — those rules can be tightened. Just ask.

---

## 5. Trying it out

### Easiest: the Supabase Table Editor (no code)

1. Go to <https://supabase.com> and open the **Krewe of Shamrock** project.
2. Click **Table Editor** in the left sidebar.
3. You'll see `members`, `dues_payments`, `events`, and `event_signups`, already
   filled with a few sample rows. You can add, edit, and delete rows by hand here.

### From a website or app (JavaScript example)

```js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://oazwkwflgbthojvnclfc.supabase.co',
  'sb_publishable_aMCyVxkiolMuBt9_R990CA_xQmXLaaS'
)

// Get all active members
const { data, error } = await supabase
  .from('members')
  .select('first_name, last_name, member_role')
  .eq('membership_status', 'active')
```

(Reads/writes from a website require the user to be signed in, per the security
rules above.)

---

## 6. Sample data already loaded

Three example members (Maureen O'Brien – captain, Sean Callahan – officer,
Bridget Murphy – member), their 2026 dues (Murphy's is unpaid as an example), two
events (the 2027 parade and a planning meeting), and parade signups for all three
members. Delete these whenever you're ready to enter real data.

---

## 7. Pre-existing item to review (not created here)

The Tribe Test project already contained a database function named
`public.rls_auto_enable()` before this work began. Supabase's linter flags it as
runnable by anonymous users. It was **not** created as part of the Krewe backend, so
it was left untouched. If you don't recognize it, you may want to review or remove it
in the Supabase dashboard — happy to help.

---

## 8. Suggested next steps

1. **Settle the Supabase invoice** (Encountive org) if you want a dedicated project.
2. **Build the front end** — a web page for managing members, dues, and events.
3. **Add automations** (your project's goal), for example:
   - Email reminders for unpaid dues.
   - A public sign-up form for events.
   - A dashboard showing active members and upcoming events.

Tell me which of these you'd like to tackle next.

## Parade Ready engine (added 2026-07)

Migrations: `kos_parade_ready_engine`, `kos_checkin_codes_private`.

| Object | Purpose |
| --- | --- |
| `waivers` | One signed liability waiver per member per season (`member_id`, `season_year`, `signed_name`, `signed_at`). Members insert/read their own; officers read all. |
| `events.is_mandatory` | Marks meetings that count toward parade eligibility. |
| `meeting_checkin_codes` | Officer-only table of QR check-in codes per meeting (kept out of `events`, which members can read). |
| `volunteer_hours` | Member-logged service hours toward the 12-hour commitment (`activity`, `hours`, `worked_on`, `approved`). Members insert/read their own; officers approve via RPC. |
| `v_parade_ready` (view, security invoker) | Per member: `dues_paid` (current year), `waiver_signed`, `meeting_attended` (mandatory meeting this year), `hours_approved`, `hours_logged`. Members see their own row; officers see the roster. |
| `kos_current_member_id()` | Maps `auth.uid()` to the linked `members.id` via `profiles`. |
| `meeting_check_in(p_code)` | Member RPC: marks attendance for the event whose code matches, until 12 hours after the event ends. Attendance is stored as `event_signups.status = 'attended'` (there is no separate attendance table). Source exported verbatim to `sql/kos_checkin_engine_export.sql` (2026-09-18). |
| `officer_upsert_meeting(name, start, mandatory)` | Officer RPC: schedules a meeting event. |
| `officer_enable_checkin(event_id)` | Officer RPC: creates/returns the meeting's check-in code. |
| `officer_review_hours(id, approved)` | Officer RPC: approves or un-approves a volunteer-hours entry. |

Frontend: the members portal's **Parade Ready** card (status gates, waiver signing, hour logging), the
`?checkin=CODE` QR flow on members.html, and three officer reports (Wristband Pickup List, Volunteer
Hours Review, Meeting Check-In QR) under the "Parade Readiness" report category.

## QR registry (added 2026-09)

Migration: `sql/kos_qr_registry.sql` (QR_LIBRARY_BUILD_PLAN.md Phase 2).

| Object | Purpose |
| --- | --- |
| `qr_codes` | The QR library: one row per printed square (`slug`, `label`, `target_url`, `purpose`, optional `event_id`/`product_id`, `active`). Squares encode `go.html?c=SLUG`, so officers can re-point `target_url` after printing. Officers read via RLS; nobody else. |
| `qr_scans` | Anonymous scan log: `qr_id` + `scanned_at` only — by krewe decision (2026-09-18) no member id, IP address, or browser details are stored. No direct read/write policies; counts come out through the officer RPC. |
| `resolve_qr(p_slug)` | Public RPC (anon + authenticated): logs one anonymous scan for an active slug and returns its `target_url`; unknown or retired slugs return `ok:false` without logging. Called by `go.html`. |
| `officer_upsert_qr_code(...)` | Officer RPC: create or edit a code (validates slug shape and that the destination is `https://` or `mailto:`). |
| `officer_set_qr_active(id, active)` | Officer RPC: retire or reactivate a code without losing its scan history. |
| `officer_delete_qr_code(id)` | Officer RPC: delete a code (its scan rows cascade away — prefer deactivating). |
| `officer_list_qr_codes()` | Officer RPC: every code with `scan_count`, `scans_30d`, and `last_scan_at` — the data source for the Phase 3 QR Library card. |

Frontend: `go.html` (the tracked hop; plain fetch to PostgREST, no third-party scripts).

## Attendance QR upgrades (added 2026-09)

Migration: `sql/kos_attendance_qr_hours.sql` (QR_LIBRARY_BUILD_PLAN.md Phase 4).

| Object | Purpose |
| --- | --- |
| `door_checkins` | Committed door log: one row per member per event (`event_id`, `member_id`, `checked_at`, `hours_awarded`). Unique on (event, member) so re-scans never double-count. Locked down; access via RPCs only. |
| `kos_volunteer_season_year()` | Season-year rule shared with the front end: June onward belongs to the season ending next year. |
| `kos_checkin_event_for_code(code)` | Fallback lookup from a check-in code to its event via `meeting_checkin_codes` (columns `code`, `event_id` — confirmed 2026-09-18 by the export in `sql/kos_checkin_engine_export.sql`). `door_check_in` now reads `event_id` straight from `meeting_check_in`'s result and only falls back to this. |
| `door_check_in(p_code)` | Member RPC used by the `?checkin=CODE` flow: calls the existing `meeting_check_in` (Parade Ready attendance unchanged), records the scan in `door_checkins`, and — for volunteer events or members signed up as volunteers — inserts a PENDING `volunteer_hours` row (planned hours, else event duration, else 2; clamped 0.5–24). Front end falls back to `meeting_check_in` if this migration is not applied. |
| `officer_door_count(p_event)` | Officer RPC behind the Live door count view: running total, pending hours sum, and the last 12 names. |

Frontend: members.html check-in flow (adds the "volunteer hours logged — pending review" note) and the
📊 Live door count button on each meeting in the QR Code Studio (refreshes every 10 seconds; projector friendly).

## Check-in engine export completed (2026-09-19)

With the Supabase connection in place, the entire Parade Ready / check-in engine was
exported verbatim from the live database into `sql/kos_checkin_engine_export.sql`:
the `waivers`, `volunteer_hours`, `dues_payments`, and `meeting_checkin_codes` tables
(real columns, constraints, indexes, row-level-security policies), the helper
functions (`kos_current_member_id`, `krewe_volunteer_season_year`, `is_krewe_officer`,
`can_manage_events`), the engine functions (`meeting_check_in`,
`officer_enable_checkin`, `officer_upsert_meeting`, `officer_review_hours`), and the
`v_parade_ready` view. The whole backend is now reconstructable from `sql/` alone.

Same day, the three previously "run manually" migrations were found missing from the
live database (the paste-runs never took) and were applied through the connection's
migration mechanism, then verified present: `kos_qr_registry`,
`kos_attendance_qr_hours`, `kos_profile_name_not_email`.

## Document Library (added 2026-09-19)

Migration: `sql/kos_document_library.sql` (applied as `kos_document_library` +
`kos_document_library_searchpath_fix`). Plan: `DOCUMENT_LIBRARY_PLAN.md`.

| Object | Purpose |
| --- | --- |
| `documents` | The library: one row per document. Points at either `storage_path` (uploaded file in the `krewe-documents` bucket) or `page_url` (in-repo page like `/assets/docs/bylaws.html`). `is_published` gates member visibility; `is_surprise` + `surprise_slug` mark easter eggs. Categories: `governing`, `calendars`, `forms`, `newsletters`, `fun`, `general`. Members read published non-surprise rows plus surprises they personally found; officers read all. Writes go through officer RPCs only. |
| `document_discoveries` | One row per member per found easter egg (unique on document+member — this is what makes the Clover award one-time). Members read their own rows; inserts happen only inside `discover_document`. |
| `discover_document(p_slug)` | Member RPC behind the `?found=SLUG` egg links: records the find, awards **+10 Clovers** (`reason = 'easter_egg'`) on first discovery only, and returns the document's metadata for the celebration toast. Anon execute revoked. |
| `officer_upsert_document(...)` | Officer RPC: create/edit a document row (validates category, surprise slug shape, exactly-one-source rule). |
| `officer_set_document_published(id, bool)` | Officer RPC: publish/unpublish. |
| `officer_delete_document(id)` | Officer RPC: delete the metadata row (the Document Studio removes the bucket file; prefer unpublishing). |
| `krewe-documents` bucket | **First private bucket** in the project (all others are public). 20 MB limit; PDF/DOCX/image types. Members download via signed URLs; only officers write, via storage RLS gated on `is_krewe_officer()`. |

Seeded: the five governing documents (published, `page_url` rows) and the three
easter-egg documents (Tampa Bay Parade Calendar `tampa-parades`, Shamrock Lore
`shamrock-lore`, Irish Blessing Card `irish-blessing`). The eggs were
**published on 2026-09-19** (`sql/kos_publish_easter_eggs.sql`) when the
clover links went live on parades.html, krewe-history.html, and poetry.html;
the Season Calendar row was added the same day
(`sql/kos_season_calendar_seed.sql`). By krewe decision (2026-09-19) there
is **no download logging of any kind**.

## The Craic Cup game and Supabase (updated 2026-09-19)

The Craic Cup (gamification) is wired straight into this same Supabase
project — every number a member sees in the game is a live database read:

- **Tables:** `clover_ledger` (append-only points ledger), `clover_requests`
  (member claims awaiting officer approval), `badge_defs`, `member_badges`.
- **Season rule:** seasons run **July 1 – June 30**. `craic_season_year()`
  returns the year the current season started in and stamps `season_year` on
  every new ledger row and claim (it is the column default);
  `craic_season_start()` returns the July 1 date the current season began.
- **Views:** `v_season_leaderboard` and `v_volunteer_leaderboard` both count
  only the current July-start season.
- **Functions the Hub calls (RPC):**
  - `submit_clover_request(activity, …)` — member claims, including
    `attend_ikc_event` (+25 for attending another IKC krewe's event).
  - `approve_clover_request` / `deny_clover_request` — officer decisions;
    approval inserts the ledger row.
  - `get_member_game_card(email)` — the signed-in member's own snapshot on
    the Hub Home tab.
  - `search_craic_members(name)` — Find My Clovers name search
    (signed-in members only).
  - `get_craic_member_card(member_id)` — the full card: rank, badges, recent
    Clovers, and this season's event history (RSVPs, tickets, payments)
    from `event_signups`/`events`, plus any `legacy_event_registrations`
    rows since July 1.
- **In the game UI**, the pill in the Craic Cup window header ("Live Krewe
  data") turns green after each successful query, so members and officers can
  see at a glance that the game is connected to the database.

The SQL for all of this is in `sql/kos_craic_cup_ikc_and_find.sql` and is
applied to the project as migration `kos_craic_cup_ikc_and_find`.
