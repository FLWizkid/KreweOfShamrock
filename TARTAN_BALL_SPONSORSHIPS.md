# Tartan Ball 2026 — Sponsorship setup

How the Tartan Ball sponsorship program from the Krewe of Shamrock plan is
built into the site and database, and what Melissa needs to do to go live.

## Event foundation

- **Event:** Tartan Ball 2026 — Saturday, October 24, 2026, 6:00 PM
- **Location:** Higgins Hall, 5225 N. Himes Ave., Tampa, FL 33614
- **Event row:** the `Tartan Ball` event seeded by `sql/kos_seed_fall_2026_events.sql`
  (see also `TARTAN_BALL.md` for seating, meals, and labels)
- **Public sponsorship page:** `tartan-ball-sponsors.html`, linked from the
  Events menu and the Tartan Ball page. `tampabaytartanball.com` can link or
  redirect here.

## How each sponsorship maps onto the platform

| Sponsorship | Price | Inventory | How it is built |
|---|---|---|---|
| Moon Coin Band Sponsor | $350 | 1 (exclusive) | Tier with `inventory_limit = 1`; hidden from the public page the moment it is claimed, so it cannot be double-booked |
| Photography Sponsor | $350 (confirmed 2026-09-19) | 1 (exclusive) | Same exclusive mechanics as the band sponsorship |
| Irish Dancers Sponsor | $300 | 1 (exclusive) | Tier with `inventory_limit = 1`, hidden when claimed |
| Liquor Wagon Sponsor | $50 | Unlimited | Multi-quantity tier (`max_per_order = 10`); a member can sponsor several $50 increments in one order |
| Corporate Bronze Sponsor | $500 | Unlimited | `tier_group = 'corporate'`; default perks seeded, editable any time |
| Corporate Silver Sponsor | $1,000 | Unlimited | `tier_group = 'corporate'`; default perks seeded, editable any time |
| Corporate Gold Sponsor | $1,500 | Unlimited | `tier_group = 'corporate'`; default perks seeded, editable any time |

Everything lives in two tables plus one view:

- `sponsorship_tiers` — the catalog officers manage (price, inventory, perks,
  payment link, draft/published/sold-out status).
- `sponsorship_claims` — one row per sponsor order: name, email, company,
  the **mandatory signage text**, optional logo URL, quantity, amount, and
  payment status (`pledged` → `paid`).
- `v_public_sponsorship_tiers` — the only thing the public page reads.
  Draft and hidden tiers never appear; exclusive tiers disappear when claimed;
  limited multi-slot tiers show a Sold Out ribbon.

The front door is the `claim_sponsorship(...)` function. It locks the tier row
so two people cannot grab the last slot simultaneously, records the claim,
flips an exhausted tier to `sold_out`, and queues a sponsor-specific
confirmation email (distinct from the attendee RSVP email) through the same
`enqueue_email` / `outbound_emails` pipeline the rest of the site uses. The
email includes the signage text, the payment link, the 501(c)(3) tax-receipt
note, and the **Friday, October 9, 2026** branding-materials deadline.

Logo uploads go to the public `sponsor-logos` Supabase Storage bucket
(10 MB cap; PNG/JPG/WEBP/SVG/PDF only). Sponsors are anonymous visitors, so
anonymous uploads are allowed on that one bucket — the size/MIME limits bound
the abuse surface, and anyone passing `can_manage_events()` can delete
unwanted files.

## Go-live checklist (Melissa)

1. **Run the SQL.** In the Supabase SQL editor on project `oazwkwflgbthojvnclfc`,
   run `sql/kos_tartan_ball_sponsorships.sql`. Safe to re-run. It requires the
   earlier Event Studio scripts and the Fall 2026 seed (already applied).
2. **Verify the seed.** `select name, price_cents, status from sponsorship_tiers;`
   should show all seven tiers published: Band $350, Photography $350, Dancers
   $300, Liquor Wagon $50, Corporate Bronze $500 / Silver $1,000 / Gold $1,500.
3. **Create Zeffy payment forms** (Patrick) — one per priced tier, following
   `PAYMENTS_SETUP.md`. Set metadata `kind` to `donation` (sponsorships are
   charitable support; Zeffy also issues the donor receipt). Then paste each
   form link into the tier:

   ```sql
   update sponsorship_tiers set payment_url = 'https://www.zeffy.com/...'
   where name = 'Moon Coin Band Sponsor';
   ```

   Until a `payment_url` is set, sponsors still reserve their tier and the
   confirmation email says an officer will follow up about payment.
4. **Review the corporate perks.** The Bronze/Silver/Gold perk lists are
   sensible defaults; adjust the wording any time (`perks` is one perk per
   line) via `officer_upsert_sponsorship_tier` or the SQL editor.
5. **Point the domain.** Link or redirect `tampabaytartanball.com` to
   `tartan-ball-sponsors.html` (or to `tartan-ball.html`, which links to it).

## Officer workflow after launch

- **See sponsors and claims:** call `officer_list_sponsorships()` (optionally
  with the event id) from the hub or SQL editor — it returns every tier and
  every claim, newest first. A Member Hub card can be layered on later; the
  database authorization is `can_manage_events()`, same as Event Studio.
- **Mark a sponsorship paid:** when the Zeffy payment arrives (it also lands
  in the `payments` ledger via the webhook), set the claim's
  `payment_status = 'paid'`.
- **Edit a tier:** `officer_upsert_sponsorship_tier(jsonb)` mirrors
  `officer_upsert_event` — pass `id` plus only the fields to change.
- **Un-sell a cancelled sponsor:** set the claim's `payment_status = 'cancelled'`
  and flip the tier's `status` back to `'published'`; the slot reopens on the
  public page immediately.
- **Collect branding materials:** logos arrive either through the form (in the
  `sponsor-logos` bucket, path `tartan-ball-2026/…`, URL on the claim row) or
  by email. Deadline in every confirmation email: **Friday, October 9, 2026**,
  two weeks before the ball.

## Decision log

- **2026-09-19** — Photography Sponsor confirmed at **$350**; corporate
  packages confirmed at **Bronze $500, Silver $1,000, Gold $1,500**. All seven
  tiers now seed as published.
