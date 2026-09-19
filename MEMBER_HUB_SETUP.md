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
  Basket Social (moved from Oct 17 to Oct 3 —
  `sql/kos_basket_social_oct3.sql`), Tartan Ball (Oct 24, Higgins Hall).
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

## Member desk redesign (added 2026-09-19)
- The **Member desk** tab (`members.html` + `assets/members-desk.js`,
  `layoutMemberDesk()`) now opens with an Irish-styled masthead (Celtic
  knotwork trim from `assets/img/celtic-border.svg` / `celtic-corner.svg`)
  and jump chips, and every everyday member tool files under one of four
  labeled groups, in reading order:
  1. **Get Season Ready** — Parade Ready (`#prCard`) and Volunteer hours
     (`#hubHoursCard`).
  2. **Share Your Media** — the `#shareCard` (moved here from the Home tab):
     photo/video uploads for the public site that officers approve, plus
     artwork, poems, stories, and recipes.
  3. **Getting There & Your Gear** — Carpools (`#carpoolCard`), Van Pools
     (`#vanCard`), and Locker Rentals (`#lockerCard`).
  4. **Learn & Look Up** — the New Member Orientation video
     (`#orientationCard`, moved here from My Krewe) and Documents (`#docs`).
- `members.html#share` deep-links to the Share Your Media group, and the
  Home tab has a "Share your media" quick link beside the Member desk tile.
  A desk card that no group claims still renders — it files in after the
  groups instead of disappearing.

## Officer desk redesign (added 2026-09-19)
- The **Officer** tab wears the same Irish masthead as the Member desk, in a
  gold-washed officer variant (`.desk-hero.desk-officer`), with jump chips
  that mirror whichever launcher sections the signed-in officer actually
  sees (committee-limited roles get a shorter desk). Clicking a chip returns
  to the tool overview first, then scrolls to that section.
- The launcher's section labels are now illuminated group headers
  (`.desk-group-head` + gold rule) with a one-line description per section:
  Events, Approvals, Documents, Shop, Money, Email & invoices, Reports.
  Section metadata lives in `OFFICER_SECTION_META` and each section carries
  a stable id (`deskOff-<slug>`, e.g. `deskOff-events`).
- Everything else is unchanged: one tool open at a time, the "← All tools"
  bar, the "Jump by name" picker, and the shop-only / social-only
  role-limited views.

## New member orientation video (added 2026-09-04, moved 2026-09-19)
- The members-only orientation video ("What New Krewe of Shamrock Members
  Must Know") is served from `assets/video/new-member-orientation.mp4` and
  appears as the **New Member Orientation** card in the **Learn & Look Up**
  group of the **Member desk** tab of the Member Hub (`members.html`).
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

## Shamrock Leaders roster (directory + RBAC)
- Canonical officer / board / committee-chair titles match the public
  "Shamrock Leaders" page. The Member Hub directory and the first-login
  questionnaire use the same labels (`assets/kos-leadership.js`).
- Apply `sql/kos_shamrock_leaders_roster_and_rbac.sql` (idempotent) to upsert
  named leaders onto existing roster emails, leave Parade and Social chairs
  vacant (`Open`), and sync `member_roles` grants for any already-linked Auth
  users. Highest role wins (officer > board > committee).
- Tim Fitzpatrick (`tim.fitzpatrick@lumen.com`) is **President**,
  `member_role = officer` — **not** Treasurer. Patrick Pustay
  (`ppustay1@gmail.com`) is **Treasurer · Committee Chair of Finance**,
  `member_role = officer`. Run `sql/kos_shamrock_leaders_president_treasurer.sql`
  if a leftover Treasurer grant is still on Tim or missing on Patrick.
- Mandy Franklin and Dayna Olmsted are **not** in the Krewe: do not seed them,
  do not list them as Social or Technology chair, and run
  `sql/kos_shamrock_leaders_remove_departed.sql` if those seed rows exist.
- Do not invent a Parade, Social, or Technology chair or any email/phone.
  Douglas Tully already holds **Chair of Technology** — keep that display
  title; `kos_sync_roster_role_grants()` matches both `Chair of X` and
  `Committee Chair of X` and writes officer + `committee:Technology` for his
  linked Auth user without demoting him. A title of **Board** is treated the
  same as **Board Member**. Run
  `sql/kos_shamrock_leaders_sync_chair_of_and_board.sql` if those grants are
  still missing.
- Tammy Miller (`tammymillerkos@gmail.com`) and Deb Rutkowski
  (`debrski1@gmail.com`) are both **Co-Chair of Merchandise**,
  `member_role = member` so Shop Studio stays scoped. `kos_sync` and the
  directory treat `Co-Chair of X` like `Chair of X` / `Committee Chair of X`.
