# Member Onboarding, Role Approvals, and Record Merges

This document describes the automated onboarding system built on the new
Supabase project (**Krewe of Shamrock**, `oazwkwflgbthojvnclfc`). The board's
chosen design: **approvals happen on the website, inside the Member Hub** —
no approval links travel by email. Email is used only where it must be:
proving a member owns their own email address (password create / reset).

The full database migration is in `sql/kos_role_approvals_onboarding.sql`
and has been applied to the project as migrations
`role_approvals_and_onboarding` and `harden_rpc_execute_grants`.

---

## 1. The member's experience (kept deliberately easy)

1. **Get in**: enter your email on `members.html` → an automatic email arrives →
   set a password → signed in. (Supabase Auth sends the create-password and
   reset-password emails with no human involved.)
2. **First login only**: one short screen — first name, last name, optional
   phone and bio, plus:
   - ☑ *I am a current Krewe of Shamrock member* (checked by default)
   - ☐ *I hold a krewe title* — opens the Shamrock Leaders checklist
     (President, Vice President, Treasurer, Secretary, Board Member, and
     Committee Chair of Finance / Bylaws / Charity / Technology / Membership /
     Social / Float / Parade / Merchandise) and an optional note for the board.
     These labels match the Member Hub directory. Douglas Tully's roster
     title **Chair of Technology** is the same Technology chair (not a
     vacant seat and not a Dayna replacement). Tammy Miller and Deb
     Rutkowski are both **Co-Chair of Merchandise** — the directory and
     `kos_sync` treat `Co-Chair of X` like `Chair of X`. The client maps them onto
     the existing `member_roles` enums (`officer`, `board`, `treasurer`,
     `secretary`, `committee`). Highest role wins when someone holds more than
     one title.
3. **Instant member access**: if the sign-in email matches the roster
   (`members.email`), the account links automatically — the member is inside
   the hub immediately. No waiting, no human step.
4. **Role claims wait for one click**: any elevated role checked on that screen
   becomes a *pending request*. The member is told they can use the hub right
   away and that role tools unlock once an officer confirms.

## 2. The officers' experience

- Officers see a red **count badge** on the *Officer desk* tab whenever
  anything is waiting.
- The **Approvals** card (top of the Officer desk tab) lists:
  - **Role requests** — who, their email, whether they match the roster, which
    roles they claim, their committee and note. Buttons: **Approve** / **Deny**
    (with an optional recorded reason).
  - **Possible duplicate records** — pairs of roster records that look like the
    same person (same name, or same phone number in any formatting). Buttons:
    **Keep A, fold B in** / **Keep B, fold A in** / **Not duplicates**.
- Every decision records **who** decided and **when** (audit trail in
  `role_requests.decided_by/decided_at` and `possible_duplicates`).
- Any signed-in officer can decide — nobody has to watch a shared mailbox.

## 3. How merging works (record check)

- **Automatic linking**: at signup and again at profile completion, the account
  is linked to the roster record whose email matches exactly
  (case-insensitive). This is the no-questions-asked path.
- **Automatic flagging, human-confirmed merging**: after each profile save, the
  linked roster record is compared with the rest of the roster. Same first and
  last name, or the same phone number (formatting ignored), flags a pair into
  the officers' queue. Nothing merges on its own — families share phone
  numbers, and names repeat.
- **What a merge does**: dues history and event signups move to the kept
  record (skipping rows that would duplicate an existing year/event), missing
  details (phone, bio, hometown, photo…) are copied over, and the retired
  record is marked `merged_into = <kept id>` with status `merged`. **Nothing is
  ever deleted**, so a mistaken merge can be repaired by an administrator.

## 4. Security model

- Role checks are enforced **in the database**, not just in page JavaScript:
  - `is_krewe_officer()` — true if the account has an explicit
    `member_roles` grant of board/officer/captain, **or** its linked roster
    record has `member_role` officer/captain/board and is active.
  - `has_role('treasurer')` etc. for finer checks.
- The three new tables (`member_roles`, `role_requests`,
  `possible_duplicates`) have **read-only Row Level Security** and **no write
  policies at all** — the only write paths are `SECURITY DEFINER` functions
  that check authorization internally (`Officers only` / `Not signed in`).
- Anonymous (signed-out) visitors cannot execute any of these functions
  (execute revoked from `anon`); internal helpers are also removed from the
  signed-in API surface.
- Client-sent role names are filtered against a fixed allow-list; one pending
  request per person at a time.

## 5. Bootstrap (first officer)

The site administrator is **`melissajotully@gmail.com`**: that account is
automatically granted **board + officer** the moment it is created (database
trigger, with a backfill in the migration; her roster record also carries
`member_role = 'board'`). Create that account first and the Approvals queue is
immediately usable. No invented passwords anywhere.

Public contact routing (see `CONTACT_EMAILS.md`): `secretary@kreweofshamrock.com`
is the **public contact address** for general information, and
`digital@kreweofshamrock.com` receives "Report a website problem" and other
technical website issues. Neither is the administrator account.

## 6. Database objects added

| Object | Purpose |
|---|---|
| `member_roles` (table) | Explicit role grants — the source of truth for elevated access. |
| `role_requests` (table) | First-login questionnaire submissions with status and audit fields. |
| `possible_duplicates` (table) | The merge queue, with status and audit fields. |
| `members.merged_into` (column) | Marks a retired record and points to its survivor. |
| `profiles.first_name/last_name/phone/bio` (columns) | First-login profile details. |
| `get_my_krewe_profile()` | Everything the hub needs about the signed-in member (called by `members.html`). |
| `complete_krewe_profile(first,last,phone,bio)` | Saves the first-login profile, links to the roster by email, flags duplicates. |
| `submit_role_request(claimed, roles[], answers)` | Files a role claim; returns whether approval is needed. |
| `approve_role_request(id)` / `deny_role_request(id, note)` | Officer decisions; approve writes the `member_roles` grants. |
| `merge_members(keep, duplicate)` / `dismiss_duplicate(id)` | Officer merge decisions. |
| `list_officer_approvals()` / `officer_pending_counts()` | Feed the Approvals card and the tab badge. |
| `kos_flag_duplicates(member)` | Internal duplicate detection (name / phone). |
| `kos_bootstrap_admin()` (trigger on `auth.users`) | Auto-grants board+officer to the admin mailbox account. |
| `is_krewe_officer()` (extended), `has_role(role)` | Database-enforced role checks. |

## 7. Optional add-on: heads-up email (not built yet, by design)

The website queue is the primary mechanism. If requests ever sit too long, a
short notification email ("A role request is waiting — sign in to the Member
Hub to review it", **no action links**) can be added later with a database
webhook → Edge Function → Resend (free tier). The queue design does not change
either way.

## 8. What still needs a human (one-time dashboard setup)

These are Supabase Dashboard settings that cannot be set from code — see
`MEMBER_HUB_SETUP.md` for the exact clicks:

1. Authentication → URL Configuration: Site URL + redirect allow-list
   (production domain and Vercel preview URLs).
2. Authentication → Providers → Email: enable **Email + Password**.
3. Attach a real mail sender (custom SMTP — Resend recommended). The built-in
   mailer is rate-limited to a few emails per hour and is for testing only.
4. Import the roster into `public.members` (email per member), then create the
   administrator account (`melissajotully@gmail.com`) — by dashboard invite,
   or directly via Authentication → Users → Add user while no mail sender is
   configured.

## 9. Test checklist

- [ ] Roster member signs up → lands in the hub with no approval step.
- [ ] Same member checks *Treasurer* → request appears in Officer desk →
      Approve → `has_role('treasurer')` returns true for them.
- [ ] Non-roster email signs up → hub works, shows "no roster match" on any
      role request row.
- [ ] Two roster records with the same name → pair appears in the merge queue;
      merge moves dues/events; retired record has `merged_into` set.
- [ ] "Not duplicates" dismisses a pair and it never reappears (unique pair).
- [ ] Non-officer cannot call `approve_role_request` (error: Officers only).
- [ ] Signed-out visitor cannot call any of the functions.
