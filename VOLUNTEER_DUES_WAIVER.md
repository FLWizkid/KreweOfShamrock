# Volunteer Dues Waiver — Service in Lieu of Dues

This document is the official record, for finance and accounting, that
**Doug Tully** and **Melissa Tully** have satisfied their Krewe of Shamrock
membership dues for the current season through volunteer service. Their dues
amount is **$0.00** — nothing is owed and nothing was collected. The companion
script `sql/kos_volunteer_dues_waiver.sql` records the same fact in the
membership database so every report, reminder, and parade-ready check agrees
with this document.

Questions about anything in this document go to the treasurer at
**treasurer@kreweofshamrock.com** (see CONTACT_EMAILS.md for the routing rules).

---

## 1. The record

| Field | Doug Tully | Melissa Tully |
|---|---|---|
| Season | 2026–2027 | 2026–2027 |
| Membership year (database value) | 2026 | 2026 |
| Standard dues rate (Full Krewe Membership, see PAYMENTS_SETUP.md) | $375.00 | $375.00 |
| Amount charged after waiver | **$0.00** | **$0.00** |
| Amount collected | **$0.00** | **$0.00** |
| How dues were satisfied | Volunteer service in lieu of dues | Volunteer service in lieu of dues |
| Status in the database | Paid, method `waiver` | Paid, method `waiver` |

**Approval details:**

- Approved by: **Tim Fitzpatrick, President** (confirmed September 19, 2026;
  also recorded in the notes field of both waiver rows in `dues_payments`)
- Approval reference: ______________________ (board meeting date or motion,
  if any — optional, add if one exists)
- Date recorded in the database: **September 19, 2026** (migration
  `kos_volunteer_dues_waiver`, applied to the live Krewe of Shamrock Supabase
  project; verified in `dues_payments` and absent from `v_outstanding_dues`)

**Roster note (September 19, 2026):** the members table held two Douglas
Tully rows at recording time — one with a Proton Mail address and one with a
theonefor.ai address. Both rows initially received the $0.00 waiver so
neither could receive a dues reminder. Later the same day the duplicate was
merged (migration `kos_merge_duplicate_doug_tully`), following the club's
roster-merge convention: the Proton Mail record was kept as the active
member with its waiver row; the theonefor.ai record was retired (marked
merged, never deleted) and its redundant $0.00 dues row removed, so the
books hold exactly one waiver row per person; and theonefor.ai was saved as
an email alias on the kept record so future payments from that address
still match Doug. Money totals were unaffected throughout because every row
involved was $0.00.

Recording the waiver in the database (section 4) does not replace filling in
the approval lines above; the database says *what* was recorded, this document
says *who authorized it and why*.

## 2. What "Service in Lieu of Dues" means

A member covered by this arrangement earns their membership for the season by
volunteering their time and skills to the Krewe instead of paying the standard
dues amount in money. For Doug and Melissa Tully, that service includes the
ongoing volunteer work of building and maintaining the Krewe's website, member
hub, and membership database — the systems documented throughout this
repository.

The waiver covers **one membership year at a time**. It does not renew by
itself: each new season, the board (or the officer with authority over dues)
decides again, and the treasurer records a fresh waiver row for the new
membership year. This keeps every season's books self-contained.

## 3. Finance and accounting treatment

These points are what the treasurer and any future bookkeeper or auditor need
to know:

1. **No cash moved.** The waiver is not a payment. No money was received, so
   nothing appears in the `payments` ledger (that table only records real
   online payments arriving through Zeffy — see PAYMENTS_SETUP.md). The only
   database record is the dues row itself, marked paid at $0.00 with the
   method `waiver`.
2. **The books show the waiver explicitly.** The dues row uses the dedicated
   payment method value `waiver`, never `cash` or `other`. Anyone summing
   dues revenue by payment method will correctly see that these two
   memberships contributed $0.00 in money, while a simple headcount of paid
   members still includes them. The standard rate that was waived ($375.00
   per member, $750.00 combined for the season) is documented here so the
   difference between "dues at full rate" and "dues actually collected" can
   be explained in one line in any financial summary.
3. **Tax note for a 501(c)(3).** The value of donated volunteer services is
   generally not recorded as revenue by the organization and is generally not
   tax-deductible for the volunteer (Internal Revenue Service Publication 526,
   "Charitable Contributions," section on contributions you cannot deduct —
   the value of your time or services). Out-of-pocket expenses a volunteer
   pays while serving can be treated differently. The Krewe's tax preparer
   has the final word; this note exists so the question is asked, not to
   answer it definitively.
4. **No reminder emails.** Because the dues row is marked `paid = true`, both
   members automatically drop out of the `v_outstanding_dues` view, so the
   dues reminder process (DUES_REMINDER_AUTOMATION.md) will never email them
   about this season's dues. The standing rule in PAYMENTS_SETUP.md — never
   email a member whose dues row is paid — applies to waived members exactly
   as it does to paying members.
5. **Parade-ready checks pass.** The parade-ready view treats a paid dues row
   as dues satisfied, so a waiver never blocks a member from marching.

## 4. How the waiver is recorded in the database (step by step)

The membership database is the Supabase project used by the member hub. The
dues table is `public.dues_payments`: one row per member per membership year,
with an amount, a paid flag, a payment method, and a notes field.

1. Open the Supabase dashboard for the Krewe's project and go to the
   **SQL Editor**.
2. Open the file `sql/kos_volunteer_dues_waiver.sql` from this repository,
   copy its full contents into the editor, and read the comment at the top of
   the `do $$` block: the script records the waiver for **membership year
   2026** (the current season's dues cycle — verified against the live
   database, whose season dues rows all use 2026). If a future season's rows
   use a different year, change the `v_year` value before running.

   **Already done for this season:** this script was applied to the live
   database on September 19, 2026 as the migration `kos_volunteer_dues_waiver`
   (using the members' verified row identifiers). The steps below remain as
   the reference procedure for re-running it or repeating it in a future
   season.
3. Click **Run**. The script does three things, in order:
   - Extends the allowed payment methods on `dues_payments` to include
     `waiver` (the original list was cash, check, card, paypal, square,
     other). The script is safe to run more than once.
   - Finds Doug Tully and Melissa Tully in `public.members` by name
     (it accepts "Doug" or "Douglas") and inserts — or updates, if a row for
     that member and year already exists — a dues row with amount 0, paid
     true, payment method `waiver`, and a notes field pointing back to this
     document.
   - Prints a verification table of every Tully dues row so you can confirm
     both rows show amount 0, paid true, and method `waiver`.
4. If the script warns that it matched a number of members other than two,
   check the spelling of the first and last names in the `members` table
   (Table Editor → members) and run it again.
5. Fill in the approval lines in section 1 of this document and commit the
   change.

## 5. Granting this waiver to another member later

For a future service-in-lieu-of-dues arrangement, do not edit history — add a
new record:

1. Get the approval first, and note who approved it and when.
2. In the Supabase SQL Editor, run an insert like the one below, replacing the
   name and year (the `waiver` payment method already exists once the script
   in section 4 has been run once):

   ```sql
   insert into public.dues_payments
     (member_id, membership_year, amount, paid, paid_date, payment_method, notes)
   select id, 2026, 0, true, current_date, 'waiver',
          'Volunteer Dues Waiver — service in lieu of dues. Approved [who, when].'
     from public.members
    where lower(first_name) = 'firstname' and lower(last_name) = 'lastname'
   on conflict (member_id, membership_year) do update
     set amount = 0, paid = true, payment_method = 'waiver', notes = excluded.notes;
   ```

3. Add the member, season, and approval details to a new row in a record
   section of this document (or a successor document) so the paper trail and
   the database always match.
