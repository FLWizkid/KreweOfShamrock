# Krewe of Shamrock — Gamification Design Spec

**Purpose:** Incentivize members to attend events and volunteer, using a points,
rank, and badge system built on the existing Supabase database.

**Written for a beginner.** Every section says *what* the rule is, *why* it exists,
and *how* it maps to data you already store. Nothing here requires changing how
members sign up today — the only new human habit is an officer marking who actually
**attended**.

**The guiding principle.** This krewe runs on heritage, friendship, and pride —
not prizes. Research on volunteer motivation (Self-Determination Theory; the
"overjustification effect," Deci, Koestner & Ryan, 1999) warns that large cash-like
rewards can *crowd out* the intrinsic reasons people already show up. So this design
leads with **status and recognition** (free, durable) and uses **tangible rewards**
sparingly, as a garnish — never as the main engine.

---

## 1. The currency: "Clovers"

A single point currency called **Clovers** (🍀). One number per member, easy to
understand, easy to display.

- Clovers are **earned**, never lost for inactivity (no decay). Decay punishes the
  people you most want to keep around.
- Clovers come in two flavors that we track separately so we can build different
  leaderboards:
  - **Lifetime Clovers** — all-time total. Drives **rank** (below).
  - **Season Clovers** — reset each krewe year on **July 1** (the season runs
    July 1 – June 30, matching the volunteer-hours year; the database function
    `craic_season_year()` labels each season by the year it started in). Drives
    the **seasonal leaderboard**, so a new member can still "win this year."

> **Why two counters?** Lifetime rewards loyalty; seasonal keeps the contest fresh
> and winnable for newcomers. Both read from the same ledger — it's just two views.

---

## 2. How Clovers are earned (the point table)

Every value below maps to a row or column you already have. The numbers are a
**starting point** — they're deliberately round and easy to tune later.

| Action | Clovers | Where it comes from in your data |
|---|---:|---|
| RSVP to an event (registered) | **5** | `event_signups.status = 'registered'` |
| **Attend** an event (verified) | **20** | officer sets `status = 'attended'` |
| **Volunteer** at an event | **+30** bonus | `signup_role = 'volunteer'` **and** `status = 'attended'` |
| **Organize** an event | **+50** bonus | `signup_role = 'organizer'` and attended |
| Fill a **hard-to-staff role** (setup, teardown, parade day) | **×2** on the volunteer bonus | new `event_signups.is_priority_role` flag (see §7) |
| Bring a guest (per guest, capped at 3) | **5** each | `event_signups.guests_count` |
| Pay annual dues **on time** | **25** | `dues_payments.paid = true` and `paid_date <= due_date` |
| Pay dues **early** (before Jan 31 / "by St. Paddy's") | **+15** | `paid_date` threshold |
| **Refer** a new member who joins | **40** | new `members.referred_by` field (see §7) |
| Complete the **new-member quest line** (first 60 days) | **50** | derived (see §6) |
| Attend a **members' meeting** | **15** | `events.event_type = 'meeting'`, attended |
| Attend **another IKC krewe's event** (support the krewe family) | **25** | member claim, `clover_requests.activity_code = 'attend_ikc_event'`, officer-approved |

**Worked example.** Bridget RSVPs to the St. Patrick's parade (5), shows up and is
marked attended (20), volunteers (30), and takes the teardown shift — a priority role,
so the volunteer bonus doubles (+30 → total volunteer credit 60), and brings 2 guests
(10). That single event earns her **95 Clovers**.

### Key rule: attendance must be *verified*

RSVP earns a token 5 Clovers; the real points come from **showing up**. This is the
heart of the system and the one new habit it requires:

- After each event, an officer opens the headcount list and flips no-shows back and
  attendees forward to `status = 'attended'`. That single action is what releases the
  20 + bonuses.
- Why: if RSVP alone paid out, people would RSVP to everything and attend nothing —
  the exact behavior you're trying to fix.

---

## 3. The rank ladder (status = the real reward)

Lifetime Clovers unlock honorary **ranks**. Ranks are titles and a badge color shown
on the member's profile and the Members page. They cost nothing to give and they last
forever, which is precisely why they motivate.

| Rank | Lifetime Clovers | Feel |
|---|---:|---|
| 🌱 **Newcomer** | 0–99 | Just joined |
| ☘️ **Clansman / Clanswoman** | 100–299 | Shows up regularly |
| 🎻 **Bard** | 300–699 | A familiar, reliable face |
| 🛡️ **Chieftain** | 700–1,499 | A pillar of the krewe |
| 👑 **Highland Champion** | 1,500+ | Legend status |

Design notes:

- **Thresholds widen as you climb.** Early ranks come fast (fast early wins keep new
  members engaged); top ranks take years (so they stay prestigious).
- Rank is **honorary and visual only** — it does **not** override `member_role`
  (`member`/`officer`/`captain`/`board`), which stays about real authority. Keep the
  two ideas separate so nobody confuses "earned a fun title" with "is now an officer."
- Optional perk for the top two ranks: a small, *status-flavored* benefit (priority
  parade position, reserved Tartan Ball seating) — recognition, not cash.

---

## 4. Badges (collectible achievements)

Badges are discrete, one-time accomplishments — the "I did a specific thing" awards
that complement the steady drip of Clovers. Each is fully derivable from your data, so
they award automatically.

| Badge | How to earn it | Data source |
|---|---|---|
| 🎉 **First Steps** | Attend your first event | first `status='attended'` row |
| 🥁 **Parade Marcher** | Attend a parade | `event_type='parade'`, attended |
| 🤝 **Helping Hand** | Volunteer once | `signup_role='volunteer'`, attended |
| 🛠️ **Crew of Five** | Volunteer 5 times | count volunteer-attended rows |
| 🏆 **Order of the Golden Shamrock** | Volunteer 15 times | count |
| 📅 **Perfect Season** | Attend every event in a season | season attendance = season event count |
| 🔥 **Lucky Streak** | Attend 4 events in a row | consecutive attended events |
| 👥 **Recruiter** | Refer a member who joins | `members.referred_by` |
| 💚 **Early Bird** | Pay dues before St. Paddy's | `dues_payments.paid_date` |
| 🎩 **Host with the Most** | Bring 10 guests (lifetime) | sum of `guests_count` |
| 🌟 **Founder's Circle** | (manual) special service award | officer-granted |

Rules:

- Most badges award **automatically** the moment the underlying data is true.
- A few (like Founder's Circle) are **manually granted** by officers for things data
  can't see — keep a manual-grant path.
- Badges are **permanent** and shown as a row of icons on the member profile.

---

## 5. Leaderboards (use carefully)

Leaderboards are powerful but double-edged: the top 10% love them, the bottom 50% can
feel judged and disengage. Mitigations are built in.

- **Seasonal Top Contributors** (Season Clovers) — resets yearly so it's always
  winnable. This is the *primary* public board.
- **Top Volunteers** — a separate board so service is celebrated on its own terms,
  not buried under people who simply attend a lot.
- **Clan standings (recommended)** — split the krewe into a few named teams ("septs"
  or "clans") and rank **teams**, not individuals, on total participation. Team boards
  create positive peer pull and protect lower-activity members from feeling singled
  out. A captain rallies each clan.
- **Always show the member their own number and "next rank" progress**, even if they
  never appear in a top-10. Personal progress motivates the middle of the pack far
  more than a ranking they'll never top.

---

## 6. New-member quest line (onboarding)

First-year drop-off is where most volunteer orgs lose people. A short guided
checklist for a member's first 60 days creates early wins and a reason to come back.
This ties into your planned Phase 5 onboarding.

**The quest:** complete all four to earn the **Welcomed badge** + 50 Clovers.

1. Attend your first event. *(status='attended')*
2. RSVP to a second upcoming event. *(a forward-looking 'registered' row)*
3. Volunteer once **or** attend a members' meeting.
4. Update your member profile / say hello.

Show it as a 4-step progress bar on their dashboard the moment they're approved as a
member.

---

## 7. Small data additions required

Nothing here breaks your schema. The complete list of new pieces:

**New columns (additive, optional):**

- `event_signups.is_priority_role` (boolean, default false) — flags hard-to-staff
  shifts that earn the ×2 volunteer bonus.
- `members.referred_by` (uuid, nullable, links to `members.id`) — powers the
  Recruiter badge and referral Clovers.

**New tables:**

- **`points_ledger`** — the heart of the system. *Append-only*, one row per award:
  `id`, `member_id`, `event_id` (nullable), `reason` (text, e.g. `'attended'`,
  `'volunteer_bonus'`, `'dues_on_time'`), `clovers` (int), `season_year` (int),
  `created_at`. Append-only means it's auditable and easy to reason about — you can
  always see *why* someone has the total they have, and you never overwrite history.
- **`member_badges`** — `member_id`, `badge_key`, `awarded_at`, `granted_by`
  (nullable, for manual awards).

**New views (saved questions — no new data, just summaries):**

- `v_member_clovers` — lifetime and season totals per member (sum of `points_ledger`).
- `v_member_rank` — adds the rank name by bucketing lifetime totals (§3).
- `v_season_leaderboard`, `v_volunteer_leaderboard` — ordered lists for §5.
- `v_clan_standings` — team totals (if you adopt clans).

**One trigger (the only "automatic" moving part):**

- When `event_signups.status` changes **to** `'attended'`, insert the right
  `points_ledger` rows: base attendance, plus volunteer/organizer bonus, plus the ×2
  if `is_priority_role`, plus guest Clovers. Reverse them if an officer later
  un-marks attendance.

That's the whole build: **2 columns, 2 tables, ~5 views, 1 trigger** — plus a
member-facing dashboard page to display it.

---

## 8. Anti-gaming rules (keep it honest)

A points system invites point-farming. Guardrails:

- **Attendance is officer-verified.** RSVP alone never pays the big points (§2). This
  single rule defeats most gaming.
- **Guest Clovers are capped** (3 per event) so nobody pads numbers with a crowd.
- **Referral Clovers pay only when the referred member is actually approved** (status
  `prospect → active`), not at application — and only once per referred person.
- **Dues Clovers award once per membership year**, on the `paid` flip, not per edit.
- **Ledger is append-only and officer-auditable.** Because every award is a logged row
  with a reason, a captain can scan for anything that looks off.
- **Manual grants are attributed** (`granted_by`) so honorary awards are accountable.
- **No negative balances / no public shaming.** Nobody loses Clovers for not
  participating; the system only ever adds. Loss aversion belongs in *streaks*
  (you can break a streak), not in the core balance.

---

## 9. Suggested point values are tunable — start, then watch

Treat the §2 numbers as v1. After one season, look at the ledger and ask:

- Is volunteering clearly out-earning passive attendance? *(It should — that's the
  goal.)* If not, raise the volunteer bonus.
- Are priority roles getting filled now? If not, raise the multiplier or add a
  raffle-ticket reward on top.
- Is the rank ladder pacing well — newcomers reaching Clansman in their first season,
  Champion staying rare? Adjust thresholds in §3.

Because everything derives from one append-only ledger, **re-tuning is just changing
a few numbers in the views and the trigger** — no data migration, no history lost.

---

## 10. Recommended build order

1. **`points_ledger` table + the attendance trigger.** Start awarding Clovers silently
   in the background. (Even with no UI yet, you're banking real history.)
2. **`v_member_clovers` + `v_member_rank` views.** Now you can see standings in the
   Supabase Table Editor.
3. **Member dashboard page** — "You have 240 Clovers · Rank: Bard · 3/6 events this
   season · next rank in 60." This is what members actually feel.
4. **Badges** (`member_badges` + auto-award logic) and the **Members-page showcase**.
5. **Leaderboards / clans** once there's enough activity to make them lively.
6. **Quest line** wired into onboarding.

Each step delivers value on its own, and each reuses the step before it.
