# Krewe of Shamrock — Launch Readiness & Deployment Plan

**Prepared:** July 3, 2026
**Audience:** ~80 krewe members
**Live site today:** https://krewe-of-shamrock.vercel.app (Vercel, healthy)
**Backend:** Supabase project `njfzrnqwbnuhmopgpsud` ("Tribe Test", shared)

---

## 1. Executive summary

The site is genuinely close. The public pages, the members portal, the raffle
flow, event RSVPs, the membership application, and the email queue are all built
and mostly working. Hosting is live on Vercel and the database is healthy.

**But it is not safe to hand to 80 members yet.** There is one critical security
hole that makes the entire "members-only" area open to anyone on the internet,
plus a set of database permission rules that let any signed-in person read and
change every other member's personal data and dues. These are quick to fix, but
they are launch-blockers.

This plan is organized as:

- **Section 2 — 🔴 Blockers.** Must be fixed before anyone gets the link.
- **Section 3 — 🟠 Should-fix.** Fix during the launch window; visible bugs and
  data-integrity gaps.
- **Section 4 — 🟡 Polish.** Cosmetic/consistency; safe to do after launch.
- **Section 5 — Infrastructure & go-live checklist.** Email, domain, hosting,
  sample-data cleanup, member onboarding.
- **Section 6 — Suggested timeline.**

Everything in Sections 2–4 was verified against the live database and the actual
page source, not assumed.

> **Update — July 3, 2026 (Day-1 security work applied).** Blockers **B-1, B-2,
> B-3, and B-4 are now resolved** and verified against the live database. The
> client sign-up fix is in this branch; the database changes were applied to the
> Supabase project as two tracked migrations (`kos_rls_lockdown_member_vs_officer`,
> `kos_function_authorization_guards`). Supabase's security advisor went from 25
> "RLS policy always true" findings to 5 (the 5 remaining are the intended
> insert-only policies on the coordination and public-raffle tables). An anonymous
> caller now reads **0 rows** from `members`, `dues_payments`, `lockers`, and
> `profiles`, while the member directory, public events, and published content
> still work. **B-5 and B-6 (email + hosting/plan) remain** and are still
> launch-blocking. See the per-item ✅ notes below.

---

## 2. 🔴 Blockers — fix before launch

### B-1. Anyone can log into the "members-only" area (critical) — ✅ RESOLVED

> **Fixed (this branch).** Both `signInWithOtp` calls now pass
> `shouldCreateUser:false`, so Supabase will only send a magic link to an email
> that already has an account. New members must be pre-added by an officer (or the
> `approve_member` flow) before they can sign in. *Recommended follow-up:* also
> disable open sign-ups in Supabase → Authentication for defense in depth.


`members.html:999` and `share.html:439` call:

```js
sb.auth.signInWithOtp({ email, options:{ emailRedirectTo: ... } })
```

Supabase's `signInWithOtp` defaults to **`shouldCreateUser: true`**. That means
if a stranger types *their own* email into the members sign-in box, Supabase
creates an account for them and emails them a working magic link. They click it
and they are now an authenticated user of your backend. The green "members only"
gate is only `display:none` CSS — it is not real protection.

**Why this is critical:** see B-2. Once someone is authenticated, the database
rules currently let them read and edit everything.

**Fix (choose one):**
- **Fastest:** add `shouldCreateUser: false` to both `signInWithOtp` calls so
  only people you have pre-added as members can ever receive a link. New members
  get added by an officer (or by the `approve_member` flow) first.
- **Belt-and-suspenders:** also turn off open sign-ups in Supabase → Authentication
  → Providers/Settings, and rely on officer-created accounts + invites.

### B-2. Any signed-in user can read & modify every member's data (critical) — ✅ RESOLVED

> **Fixed (migration `kos_rls_lockdown_member_vs_officer`).** The blanket
> `USING (true)` policies on `members`, `dues_payments`, `events`,
> `event_signups`, and `dues_reminders` were replaced with member-vs-officer
> scoping: ordinary members can read only their **own** member row / their **own**
> dues and signups; officers (via `is_krewe_officer()`) read the full roster and
> are the only role that can insert/update/delete. `profiles` no longer allows
> public read of names/emails/phones, and `member_badges` / `points_ledger` are
> now read-only to members (writes happen only inside SECURITY DEFINER triggers),
> so members can't award themselves points or badges. Verified: an anonymous
> caller now returns 0 rows from `members`, `dues_payments`, `lockers`, and
> `profiles`; the `member_directory` view (name + role for active members) still
> works. *Residual (follow-up, not launch-blocking):* the 10 `security_definer_view`
> advisories remain — those views (the name+role directory and aggregate report
> views, which contain **no** per-member contact info) run as owner and bypass
> RLS by design. Converting them to `security_invoker` is a later hardening step.


I pulled the live RLS policies. On `members`, `dues_payments`, `events`,
`event_signups`, `dues_reminders`, and `content_items`, the write policies are
literally `USING (true)` / `WITH CHECK (true)` for the `authenticated` role.
Supabase's own security advisor flags 25 "RLS policy always true" findings.

Concretely, any authenticated user can:
- Read every member's **name, email, phone, and private notes** (`members`).
- Read and edit **anyone's dues records** — mark unpaid as paid, change amounts
  (`dues_payments`).
- Insert/update/**delete** any member, event, or signup.

Combined with B-1 (anyone can become authenticated), this is a full PII and
data-integrity exposure to the open internet. This is the single most important
thing to fix.

**Fix:** tighten RLS so that:
- Ordinary members can read only the limited directory (already exists as the
  `member_directory` view: first/last name + role for active members) and their
  **own** row / their **own** dues.
- Only officers (there is already an `is_krewe_officer()` function) can read the
  full roster, edit dues, approve members, or delete rows.
- Replace the blanket `authenticated … USING (true)` policies with
  `USING (public.is_krewe_officer())` for officer-only tables, and
  `USING (member_id = public.caller_member_id())` for self-service ones.

The building blocks (`is_krewe_officer()`, `caller_member_id()`) already exist,
so this is mostly rewriting policy predicates, not new plumbing.

### B-3. `content_items` is editable by anonymous (unauthenticated) users — ✅ RESOLVED

> **Fixed (migration `kos_rls_lockdown_member_vs_officer`).** The
> `anon moderate update content`, `anon delete pending content`, and
> `anon submit pending content` policies were dropped. Now: anyone can *read*
> published content; signed-in members can *submit* only unpublished
> (`is_published = false`) content; officers moderate (update/delete/read-all).


There is an RLS policy named **"anon moderate update content"** that allows the
`anon` role to `UPDATE content_items` with `USING (true)`. That means a
not-signed-in visitor can rewrite any gallery caption, poem, or article on the
public site.

**Fix:** drop the `anon moderate update content` and `anon delete pending content`
policies. Keep only: anon can read published content, anon can *submit* pending
(unpublished) content, and officers moderate.

### B-4. Officer-only actions & admin functions — ✅ RESOLVED

> **Fixed (migration `kos_function_authorization_guards`).** Three admin RPCs that
> had **no** authorization check and were callable by any signed-in member —
> `approve_member`, `decline_application`, and `queue_broadcast` (a member could
> have approved members or emailed the whole roster) — now guard on
> `is_krewe_officer()` (allowing the postgres/service/cron context too). Direct
> `EXECUTE` was revoked from `anon`/`authenticated` on the internal gamification
> helpers (`award_dues_points`, `award_signup_points`, `grant_badge`,
> `recompute_member_badges`), the trigger functions, the cron-only
> `send_dues_reminders`, and the legacy `rls_auto_enable`. The raffle draw/create
> RPCs were already `SECURITY DEFINER` with genuine internal officer/owner checks
> (`can_manage_raffle` / `is_krewe_officer`), so the UI gating is backed by the
> server. *Residual (follow-up, low risk):* the advisor still lists self-guarded
> and own-data functions as anon/authenticated-executable — they enforce their own
> auth or only return the caller's own data, so this is advisory cleanup, not an
> open door. One minor item: `get_member_game_card(email)` lets a caller look up
> another member's badges/points (no contact info) by email. Also note the
> `*_raffle_event` / `add_raffle_basket` function variants reference a
> non-existent `kos_is_officer()` and therefore error out — dead duplicates safe
> to drop later.

*Original finding, for reference:*


Good news, mostly verified: the sensitive raffle RPCs (`draw_5050_winner`,
`draw_basket_winner`, `set_raffle_active`, `delete_basket`, `update_raffle`) are
`SECURITY DEFINER` and call `can_manage_raffle()` / `is_krewe_officer()`
internally, so the UI-only gating in `members.html:1090` is backed by a real
server check. **However**, every one of these functions is currently granted
`EXECUTE` to the `anon` role too (32 anon-executable SECURITY DEFINER functions
in the advisor report). The internal officer check will reject a non-officer, so
this is not a live breach, but admin-shaped functions should not be anon-callable.

**Fix:** `REVOKE EXECUTE ... FROM anon` on the officer/admin functions
(`approve_member`, `decline_application`, `grant_badge`, `queue_broadcast`,
`send_dues_reminders`, `draw_*`, `set_raffle_active`, `delete_basket`,
`update_raffle`, the `trg_*` triggers, and `rls_auto_enable`). Keep anon EXECUTE
only on the genuinely public ones (`enter_basket_public`, `buy_5050_public`,
`submit_membership_application`, `rsvp_to_event`).

### B-5. Email is queued but nothing actually sends — RESOLVED 2026-09-18

**This is done.** `RESEND_API_KEY` is set as an edge-function secret and
delivery is verified working: as of 2026-09-19 the `outbound_emails` queue
shows 23 rows with status `sent` and zero `queued` or `failed`. The backlog
flushed on 2026-09-18 around 20:30 UTC, and emails queued after that (RSVP
confirmations) delivered on their first attempt within about five minutes.

Original issue, kept for history: the whole email system (dues reminders,
RSVP confirmations, welcome/lapsed notices, officer new-application alerts,
broadcasts) writes rows into `outbound_emails` and a cron job calls the
`process-outbound-emails` edge function every 5 minutes, but that function
is a no-op until `RESEND_API_KEY` is set. The fix was: create a Resend
account, verify the sending domain, and set `RESEND_API_KEY` and
`RESEND_FROM` as edge-function secrets (Project Settings → Edge Functions →
Secrets), per `EMAIL_AND_PHASE4_GUIDE.md`.

> Note: Supabase **magic-link auth email** is separate from Resend and is sent by
> Supabase directly, so sign-in will work without Resend. But it uses Supabase's
> default rate limits and sender — verify the auth email template and confirm the
> free-tier hourly email cap is enough for an 80-member onboarding wave (see 5.4).

### B-6. The Supabase project pauses on the free tier + shares data with other apps

Two related risks in the design docs, both confirmed:
- The data lives in a **shared** project ("Tribe Test") alongside several
  unrelated apps. That's workable but messy; a data leak in another app's code
  using a broader key could touch these tables.
- Supabase's **free tier pauses a project after ~7 days of inactivity.** If the
  krewe site goes quiet for a week, events/raffles/portal all break until someone
  logs into the dashboard.

**Fix:** upgrade to Supabase Pro (~$25/mo, no pausing, daily backups) *or* add a
keep-alive ping. Pro is strongly recommended once real member PII is in the
database. Ideally also migrate to a dedicated project (the schema is portable),
which was deferred due to a billing hold — resolve that first.

---

## 3. 🟠 Should-fix — during the launch window

### D-1. Two disagreeing event sources on the RSVP page — ✅ RESOLVED

> **Fixed (this branch).** The hardcoded `KREWE_EVENTS` calendar array is gone; the
> "Krewe of Shamrock Calendar" (month grids + "Dates to Remember" list) now renders
> from the same Supabase `events` fetch that fills the RSVP dropdown, so the two can
> no longer disagree. One source of truth.

`event-signup.html` shows a hardcoded static calendar (lines 138–145) **and** a
live Supabase `events` dropdown (269–291). They can disagree — a member sees a
date on the calendar that isn't an RSVP-able event, or vice-versa. Pick one
source of truth (recommend: drive the calendar from `events` too).

### D-2. Raffle is honor-system with no abuse control — ✅ PARTIALLY RESOLVED

> **Hardened (migration `kos_abuse_controls_and_email_lock`).** `enter_basket_public`
> and `buy_5050_public` now cap name/email length and reject rapid repeat entries
> under the same name on the same basket/pot (15-second throttle), which blunts
> accidental double-submits and casual stuffing. **Still honor-system on payment**
> by design — there is no payment processor, so officers must reconcile cash before
> drawing and treat on-screen counts as unverified until then (that's the Phase-6
> payments work, still not built).

`raffle.html` records ticket entries (`enter_basket_public` / `buy_5050_public`)
from an unauthenticated QR page with just a name; payment is "pay a volunteer in
person." Anyone can submit unlimited free entries under any name (qty capped at
200 *per submit* but resubmittable), inflating public ticket counts and the
advertised 50/50 pot, and skewing the weighted draw. For an 80-member krewe this
is acceptable **if** volunteers reconcile cash before the officer draws — but you
should (a) add basic rate-limiting/duplicate detection to the public RPCs, and
(b) make clear in officer training that on-screen counts are unverified until cash
is reconciled.

### D-3. Membership application endpoint has no spam protection — ✅ RESOLVED

> **Fixed (migration `kos_abuse_controls_and_email_lock`).**
> `submit_membership_application` now caps every field length (name 80, email 120,
> phone 40, notes 2000) and rate-limits brand-new applications (rejects if more than
> 5 new prospects were created in the last minute), while still updating an existing
> applicant's own record normally.

`submit_membership_application` is a public, unauthenticated RPC with only
client-side required-field validation. Add server-side length caps and simple
rate-limiting (e.g. reject a second application from the same email within N
minutes) before the form is publicized.

### D-4. Visible markup bugs — ✅ RESOLVED

> **Fixed (this branch).** All five typos below are corrected: the stray `<` on the
> members Share card, the Share-card chip deep-links (the chips now
> `stopPropagation()` so the `?type=` links work instead of the card's click
> handler hijacking them), the `gallery.html` stray `h` and `_bhlank` typo, and
> the `index.html` `hrefh` preconnect. Verified: all pages render with no console
> errors.

- `members.html:289` — `<<div class="dash-chips">` renders a stray `<` on the
  Share-content chip row.
- `members.html` Share card — chips wrapped in a `role="button"` section whose
  `onclick` navigates to plain `share.html`, so the `?type=video|photo|art`
  deep-links never work (every chip lands on the same page).
- `gallery.html:87` — stray literal `h` before an `<img>` in the "Shamrock
  Sisters" tile.
- `gallery.html:89` — `target="_bhlank"` typo (should be `_blank`).
- `index.html:10` — `hrefh=` typo makes the gstatic preconnect a no-op.

### D-5. Two pages use the old, broken navigation — ✅ RESOLVED

> **Fixed (this branch).** `videos.html` and `krewe-history.html` now use the same
> responsive dropdown nav (with working mobile hamburger) and the standard footer
> as every other page, and their brand tagline reads "Est. 1999". Verified: the
> mobile nav toggle and dropdown menu render and open on both pages.

`videos.html` and `krewe-history.html` still use the **old flat nav** (no mobile
hamburger, no dropdowns, no active-state). `krewe.js` early-returns on them, so on
a phone there is no working menu on those two pages. They also show the wrong
tagline ("Est. for good craic" instead of "Est. 1999") and a condensed footer.
Bring both onto the shared responsive nav/footer used by every other page.

### D-6. No sign-out button in the portal — ✅ RESOLVED

> **Fixed (this branch).** The portal now shows a "Signed in as {name}" bar with a
> **Sign out** button at the top of the members area, wired to the existing
> `kosSignOut()` handler.

`window.kosSignOut` is defined (`members.html:1022`) but never wired to a visible
control — members can't log out. Add a sign-out link to the portal header.

### D-7. "Secure" officer reports are permanently unreachable — ✅ RESOLVED

> **Fixed (this branch).** The five officer/PII reports (attendee contacts, full
> member directory, pending applications, outstanding dues by member, communications
> log) now actually run for officers — each queries its officer-scoped view/table
> (`v_event_attendee_emails`, `members`, `v_pending_applications`,
> `v_outstanding_dues`, `outbound_emails`). Access is gated on `is_krewe_officer()`
> in the UI **and** enforced by RLS underneath (a non-officer gets no rows even if
> they bypass the UI). The stale "unlocks when per-member sign-in is added" notice
> was replaced with an accurate "officers only" message. The `outbound_emails` queue
> was also locked to officer-read (migration `kos_abuse_controls_and_email_lock`).

Several officer/PII reports (`attendee_contacts`, `member_directory_full`,
`pending_apps`, `dues_by_member`, `comms_log`) render a "unlocks when per-member
sign-in is added" notice — but per-member sign-in already exists in the same file.
So officers currently have **no** in-app path to dues-by-member, attendee emails,
or pending applications. Wire these to `is_krewe_officer()` and let officers see
them once B-1/B-2 make roles trustworthy.

### D-8. Redundant identity entry / impersonation on member forms — ✅ RESOLVED

> **Fixed (this branch).** The locker, carpool, and van-reservation forms now
> pre-fill (and lock) the member's name and email from their signed-in profile, and
> the insert handlers use that profile identity as the source of truth rather than
> free-typed text — so a member can't file a row under someone else's name, and
> doesn't have to re-type their details. (These tables have no `member_id` column, so
> a hard server-side foreign-key stamp would need a small schema change — noted as a
> future hardening, but the client now closes the practical impersonation path and
> inserts are already restricted to signed-in members by RLS.)

Locker, carpool, and van-reservation forms make an already-signed-in member
re-type their name/email, and the row isn't tied to `auth.uid()`. After B-2,
default these from the member's profile and stamp `caller_member_id()` server-side
so rows can't be filed under someone else's name.

---

## 4. 🟡 Polish — mostly done

**✅ Done (this branch / applied):**
- **Pinned the Supabase JS version.** Every page now imports
  `@supabase/supabase-js@2` (was unpinned `/+esm` = latest), so a future major
  version can't silently break the pages.
- **Hardened the `esc()`/`E()`/`RE()` escapers** to also escape single quotes
  (`&#39;`) across all pages, for defense-in-depth.
- **Fixed a real defect:** `membership-application.html` had 516 trailing **NUL
  bytes** after `</html>` (which is why tools saw it as binary) — stripped.
- **`share.html` footer** no longer hardcodes "© 2025" (now evergreen).
- **Consistent "age of krewe" copy** — the plain "twenty years" / "over two
  decades" phrases were brought to "twenty-five years" to match the rest (Est.
  1999 → 2026 is 27, so "more than twenty-five years" is accurate). Slogans like
  "25 Years of Shenanigans" were left as-is.
- **Set fixed `search_path`** on the `kos_rank_*` helper functions (migration
  `kos_rank_helpers_fixed_search_path`), clearing that advisor finding.

**⏳ Deferred (needs a decision, a download, or the dashboard):**
- **Tune-picker labels** in `poetry.html` name traditional songs but point to
  Krewe theme tracks. Left alone deliberately — recent commits show these labels
  were set intentionally; changing them is a content call for the krewe.
- **Old-site external media.** `videos.html` hot-links two videos from
  `www.kreweofshamrock.com` and `event-signup.html` embeds an interkrewe.com
  calendar image. Re-hosting needs the source files (and large video is excluded
  from the repo by `.gitignore`), so this is a manual asset step.
- **`pg_net` in `public` schema** — left in place; moving it risks breaking the
  email-flush cron (`net.http_post`). Low-severity advisory; do it carefully with
  a maintenance window if desired.
- **Leaked-password protection** — a Supabase Auth dashboard toggle (no code),
  worth enabling.
- **Storage buckets** `avatars`, `media`, `raffle-baskets` are public/listable —
  fine for images; just confirm nothing private was uploaded.
- **No pagination anywhere.** Fine at 80 members; revisit if the roster grows.

---

## 5. Infrastructure & go-live checklist

### 5.1 Hosting (Vercel)
- Site is live and healthy at `krewe-of-shamrock.vercel.app` (latest production
  deploy READY).
- **Connect GitHub → Vercel for auto-deploy.** Deploys are currently manual via
  CLI; connecting the repo means every push to `main` redeploys automatically.
- **Vercel Hobby is non-commercial.** For an organization site this is a terms
  risk flagged in the design doc. Either move to Vercel Pro or to Cloudflare Pages
  (free, commercial-OK) before heavy promotion.

### 5.2 Don't ship internal docs to the public site
`.vercelignore` excludes `*.md`, **but not** `Krewe of Shamrock - Software Design
Document.docx`, which contains architecture, keys context, and RLS notes. Add
`*.docx` (and confirm the `.md` exclusion is working) so none of the planning
docs are downloadable from the live URL.

### 5.3 Delete sample/test data before launch
The database still has sample rows: test members (Maureen O'Brien, Sean Callahan,
Bridget Murphy with `@example.com` emails), sample events, and 5 stale
`queued` emails. Delete these before real members and Resend go live, or test
emails will fire and sample people will appear in the directory/leaderboards.

### 5.4 Email & auth deliverability
- Set up Resend (B-5) for app emails.
- Verify the Supabase **magic-link** email template and sender look right (this is
  what members actually click to log in).
- Supabase free tier caps auth emails per hour. Onboarding 80 members at once may
  hit that cap — **stagger invitations** in batches, or raise the limit / use a
  custom SMTP sender on Pro.

### 5.5 Custom domain (optional but recommended)
The design doc plans a custom domain (~$12–20/yr). It also unlocks a clean Resend
sending domain (e.g. `events@kreweofshamrock.com`) for better deliverability than
a shared vercel.app URL.

### 5.6 Member onboarding flow (once B-1/B-2 are fixed)
1. Officer loads the real roster into `members` (name, email, role,
   membership_status).
2. Because sign-up is now closed (B-1), each member's account is pre-provisioned;
   send them the site link and have them request a magic link with the email you
   have on file.
3. First login runs the existing profile-setup + welcome tour.
4. Officers use the approval flow (`approve_member`) for new applicants from the
   public form.

---

## 6. Suggested timeline

**Day 1 — Security (blockers B-1 → B-4). ✅ DONE (July 3, 2026).** Closed open
sign-up, rewrote the always-true RLS policies to member-vs-officer scoping,
dropped the anon content-edit policies, guarded the unguarded admin functions,
and revoked direct EXECUTE on internal helpers. Re-ran the Supabase security
advisor: "RLS policy always true" fell from 25 to 5 (the 5 remaining are the
intended insert-only policies on `lockers`, `carpools`, `vanpool_reservations`,
`raffle_entries`, and `raffle_ticket_purchases` — see D-2/D-8 for the abuse
controls that harden those). Remaining launch gate is **B-5/B-6 below**.

**Day 2 — Infrastructure (B-5, B-6, 5.1–5.4).** Stand up Resend, upgrade Supabase
to Pro (and/or migrate to a dedicated project), connect GitHub→Vercel, add
`*.docx` to `.vercelignore`, delete sample data.

**Day 3 — Visible bugs (D-1, D-4, D-5, D-6).** Fix the markup typos, unify nav on
the two old pages, add a sign-out button, reconcile the two event sources.

**Day 4 — Officer tooling & forms (D-2, D-3, D-7, D-8).** Wire officer reports,
add abuse controls to public RPCs, tie member forms to the signed-in identity.

**Day 5 — Soft launch.** Invite officers + a handful of members first, watch the
`outbound_emails` queue and Supabase logs, then send the full 80-member wave in
staggered batches.

**Post-launch — Polish (Section 4)** and the still-unbuilt roadmap items
(gamification/Craic Cup is spec-only; Phase-6 real payments; old-site content
pages like Charities / Leaders & Board / Contact and the membership-fee tiers on
the Join page, called out as the biggest content gap in the integration plan).

---

## Appendix — What's already working (verified)

- Vercel production deploy is live and healthy.
- Public pages render; graceful empty-states on all data-driven pages;
  `share.html` and `members.html` correctly set `noindex`.
- Event RSVP (`rsvp_to_event`), membership application
  (`submit_membership_application`), and content submission all reach real
  server-side RPCs.
- Raffle draw functions are `SECURITY DEFINER` with genuine internal
  officer/owner checks (`can_manage_raffle`).
- Email pipeline (queue + cron + edge function) is built and wired; it just needs
  the Resend key.
- Onboarding automation (`approve_member` creates first-year dues + welcome
  email) and dues-reminder cron are in place.
- No hardcoded secrets in the client beyond the intended publishable key; no
  lorem ipsum; copy is real.
