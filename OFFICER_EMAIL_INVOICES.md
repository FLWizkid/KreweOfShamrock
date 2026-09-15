# Officer desk: Email members & Send invoices

For any krewe officer with Officer desk access (board, officer, or captain — not secretary-only).

## Where to find it

Member Hub → **Officer desk** → section **Email & invoices**:

1. **Email members** - choose audience (all active, officers & board, chairs/officers, or pick from roster), write subject and message, preview, confirm, Send.
2. **Send invoices** - filter unpaid dues or pick members, set year/amount/note, create `dues_payments` invoice rows, optionally email a Zeffy pay link.

## How email delivery works

Compose/send queues rows in `outbound_emails`. The Edge Function `process-outbound-emails` sends them through **Resend**.

**Required to actually deliver:** set Supabase Edge Function secrets:

- `RESEND_API_KEY` = your Resend key
- `RESEND_FROM` = e.g. `Krewe of Shamrock <secretary@your-verified-domain>`

Until the key is set, sends still queue safely and show in history; nothing leaves the building.

## Invoices / payments

- Creates or updates unpaid rows on `dues_payments` (no second billing system).
- Emails include the Zeffy membership form link (full $375 or LOA $100). No card numbers are collected in the Hub.
- When Zeffy webhooks mark dues paid, those members drop off the unpaid list.

## SQL / functions

See `sql/kos_officer_email_and_invoices.sql` and Edge Function `process-outbound-emails`.
