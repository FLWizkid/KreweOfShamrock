# Member Hub setup notes

## Supabase project (required)
- URL: `https://oazwkwflgbthojvnclfc.supabase.co`
- Publishable (anon) key is embedded in static pages (publishable only — never commit the service role key).

## Auth URL settings (Melissa must set in Supabase Dashboard → Authentication → URL Configuration)
- **Site URL:** `https://www.kreweofshamrock.com` (or current production host)
- **Redirect URLs** (allow-list all that apply):
  - `https://www.kreweofshamrock.com/members.html`
  - `https://www.kreweofshamrock.com/**`
  - Vercel preview/production app URL(s), e.g. `https://<project>.vercel.app/members.html` and `https://<project>.vercel.app/**`
- Password recovery uses `resetPasswordForEmail` with `redirectTo` = current origin + `/members.html`.

## Public contact and website issues
Official routing lives in `CONTACT_EMAILS.md` (the single source of truth):
- **`secretary@kreweofshamrock.com`** — all general information: public
  website Contact / mailto links, footers, structured data.
- **`digital@kreweofshamrock.com`** — technical website issues only:
  **Report a website problem** / support issue reports, sign-in help.
- The old shared `kreweofshamrocktampa@gmail.com` mailbox is retired from all
  public pages (September 2026) — do not reintroduce it.

## Board / officer bootstrap (administrator) account
- The site administrator account is **`melissajotully@gmail.com`** (board
  pivot — this replaces the shared mailbox as the admin account).
- A database trigger auto-grants that account **board + officer** the moment
  it is created, and Melissa's roster record carries `member_role = 'board'`,
  so `is_krewe_officer()` recognizes her by either path.
- **Do not invent a password for anyone else.** Melissa sets her own password
  (dashboard invite / direct create / Forgot password); other members set
  theirs through their own email links.

## Role approvals happen ON THE WEBSITE (board decision)
- Role requests and duplicate-record merges are decided by officers **inside
  the Member Hub** (Officer desk tab → **Approvals** card, with a count badge).
  No approval links travel by email. See `MEMBER_ONBOARDING_AUTOMATION.md`
  for the full design, database objects, and test checklist.
- Email is used only where it must be: members proving their own address for
  password create / reset (Supabase Auth sends these automatically).
- `secretary@kreweofshamrock.com` is the public contact address (general
  information) and `digital@kreweofshamrock.com` handles technical website
  issues (see `CONTACT_EMAILS.md`);
  the bootstrap board/officer (administrator) account is
  `melissajotully@gmail.com`, auto-granted board + officer roles by a
  database trigger the moment the account is created.
- Optional later add-on: a heads-up email ("something is waiting — sign in to
  review", no action links) via database webhook + Edge Function + Resend.

## Public events + RSVP (fixed 2026-09-03)
- The new Supabase project was created without the public-events plumbing, so
  every page showed "Could not load events." Applied migrations
  `kos_public_events_and_rsvp` and `kos_event_types_and_fall_2026_seed`
  (mirrored in `sql/kos_public_events_and_rsvp.sql` and
  `sql/kos_seed_fall_2026_events.sql`): the `events.is_public` / `events.notes`
  columns, an anonymous read policy for public events, the `rsvp_to_event`
  RPC with its `enqueue_email` helper and `outbound_emails` queue, the
  'social' / 'ball' event types, and the fall 2026 event dates from the
  August general meeting.
- Public events now live: Mini Golf and Lunch (Sep 19), Tartan Ball
  Basket-Making Happy Hour (Oct 17), Tartan Ball (Oct 24, Higgins Hall).
  King and Queen Breakfast is seeded with `is_public = false` until a date
  is announced — flip that flag in the Table Editor to publish it.

## Inter-Krewe Council calendar sync (added 2026-09-03)
- The IKC calendar (interkrewe.com/Calendar) is hosted on Tockify and
  publishes an iCalendar feed. The database function `sync_ikc_calendar()`
  imports it into `events` with `source = 'ikc'` and pg_cron re-runs it every
  morning at 3:30 AM Eastern; cancelled events disappear on the next run.
  See `sql/kos_ikc_calendar_sync.sql`.
- On the website, our events stay **gold** and IKC events render **purple**
  (calendar dots, an IKC tag in "Dates to Remember", purple-edged homepage
  cards). A day with both kinds shows a split gold/purple dot.
- IKC events never appear in the RSVP dropdown — each one links to its page
  on the host krewe's calendar instead, and `rsvp_to_event` refuses them
  server-side as well.
- To run a sync by hand: SQL Editor → `select public.sync_ikc_calendar();`

## New member orientation video (added 2026-09-04)
- The members-only orientation video ("What New Krewe of Shamrock Members
  Must Know") is served from `assets/video/new-member-orientation.mp4` and
  appears as the **New Member Orientation** card on the **My Krewe** tab of
  the Member Hub (`members.html`), plus a "Watch the orientation video"
  quick action on the hub Home tab.
- `.gitignore` and `.vercelignore` normally exclude every `*.mp4` (raw
  uploads); both now carry a `!assets/video/*.mp4` exception so curated
  site videos in that folder are committed and deployed. To replace the
  video, overwrite that file and commit.
- The card only renders behind the member sign-in gate. Note that the file
  itself is technically reachable by its direct URL (static hosting cannot
  password-protect individual files); if the board ever needs hard access
  control, move the file into a private Supabase Storage bucket with an
  authenticated-read policy and a signed URL instead.

## Enable Email + Password provider
- Supabase Dashboard → Authentication → Providers → Email: enable Email, disable “magic link only” if still forced.
- Confirm email confirmations policy matches board preference (invite-only vs open create-password).
