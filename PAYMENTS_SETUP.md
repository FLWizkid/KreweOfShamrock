# Payments — Zeffy setup for the Krewe of Shamrock (501(c)(3))

The payments ledger and `kos_record_payment` RPC are already live. This runbook
connects Zeffy payment notifications to the `zeffy-webhook` Supabase Edge Function,
which records payments and can auto-mark matching membership dues as paid.

## What's built

| Piece | What it does |
|---|---|
| `payments` table | Ledger of online payments; officers read it in the hub. |
| `kos_record_payment(...)` | Idempotently records a payment, matches the payer to the roster by email, and auto-marks matching dues payments. |
| `zeffy-webhook` Edge Function | Authenticates Zeffy with a shared token, maps the payment, and calls the recorder. |
| Officer desk → Payments card | Shows recent payments and flags payers with no roster match. |

## Step 1 — Create Zeffy campaigns and payment forms (Patrick)

1. Go to [zeffy.com](https://zeffy.com), sign in or create the Krewe account, and
   complete the nonprofit verification and payout setup.
2. Create the needed donation, membership, raffle, event-ticket, and merchandise
   campaigns/forms. Use clear campaign names so the webhook can classify them.
3. If Zeffy provides a metadata/custom-field value for a campaign, set `kind` to
   `dues`, `raffle`, `donation`, `event`, or `store`. For dues, also provide
   `membership_year` (for example `2027`). Metadata takes precedence over name
   matching.
4. Copy the public form links into the appropriate site buttons or store products.

## Live dues / membership campaigns (2026-09-07)

| Level | Amount | Public Zeffy link |
|---|---:|---|
| Full Krewe Membership | $375 | https://www.zeffy.com/en-US/ticketing/krewe-of-shamrock-membership |
| Leave of Absence (non-voting) | $100 | https://www.zeffy.com/en-US/ticketing/krewe-of-shamrock-membership-2 |

Both are valid until June 30. Reminder emails must use the matching link by level and **must never** email members whose `dues_payments.paid` is true. Zeffy `payment.completed` via `zeffy-webhook` should auto-mark matching unpaid dues.

## Step 2 — Add the webhook in Zeffy (Patrick)

In Zeffy's integrations/developer/webhooks area, add a webhook for the
`payment.completed` event. Use this URL template (replace the placeholder with
the secret supplied separately):

```text
https://oazwkwflgbthojvnclfc.supabase.co/functions/v1/zeffy-webhook?token=YOUR_ZEFFY_WEBHOOK_TOKEN
```

If Zeffy supports custom headers, prefer sending the token as
`x-zeffy-token: YOUR_ZEFFY_WEBHOOK_TOKEN` instead of putting it in the URL. Send
the complete JSON payment envelope, including the event `type` and payment id.

## Step 3 — Configure Supabase secrets (one time)

In Supabase Dashboard → **Edge Functions** → `zeffy-webhook` → **Secrets**, set:

- `ZEFFY_WEBHOOK_TOKEN` = the generated shared token (set this exact value; never
  commit it or place the real value in this document).
- `ZEFFY_API_KEY` = optional Zeffy API key. If present, the function verifies the
  payment with `GET https://api.zeffy.com/api/v1/payments/{id}` before recording.

**JWT verification must stay OFF** for `zeffy-webhook`. Zeffy is an external
webhook sender and cannot provide a Supabase login JWT; the function uses the
shared `ZEFFY_WEBHOOK_TOKEN` instead.

## Kind mapping

The function first uses `metadata.kind` (or `product_kind`). Otherwise it checks
campaign/product text in this order:

- `dues` — dues, membership, member
- `raffle` — raffle, drawing, lottery
- `donation` — donation, donor, gift
- `event` — event, ticket, admission, gala, ball, parade
- `store` — store, merch, merchandise, shirt, tee, hat, kilt, apparel
- `other` — no match

A payer email matching a roster member is linked automatically. Dues payments with
a matching member and year update that member's unpaid dues row.

## Step 4 — Test and monitor

1. Send a Zeffy test `payment.completed` notification or make a small test payment.
2. Confirm Zeffy receives a 2xx response (`{"received":true}`).
3. Confirm the payment appears in Officer desk → Payments and that the member/year
   is marked paid when applicable.
4. If the payer is not matched, verify the email in the Zeffy receipt and roster.
5. Rotate the shared token in Zeffy and Supabase if it is ever exposed.

## Data and security notes

The Edge Function uses the Supabase service role only server-side to call the RPC;
it does not expose that key. The webhook URL is not a substitute for the shared
token. Keep the token out of GitHub, chat transcripts, and this runbook.

## Amount units and roster matching (2026-09-14)

Zeffy `payment.completed` sends `data.amount` and item `amount` in **cents**. The
`zeffy-webhook` Edge Function stores that value in `payments.amount_cents` (no extra
×100). Officer Payments divides by 100 once for display.

Roster match uses the buyer email (Zeffy often puts a contact UUID in `contact`, so
we read `buyer` first), plus `member_email_aliases`, then a careful name fallback.
Event ticket purchases auto-RSVP matched members via `kos_auto_rsvp_from_payment`
when the campaign links to a krewe event (`ticket_payment_url` / name). The member
self-serve **"My ticket is already purchased"** checkbox on `event-signup.html`
(still calling `rsvp_to_event` with `p_note`) is unchanged.

