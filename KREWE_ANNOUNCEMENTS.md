# Krewe announcements — email that also lives in the Members Hub

Member officers asked for one way to send information that (1) reaches every
member by email and (2) stays readable inside the Members Hub afterward. That
is exactly what **All Krewe Messages** now does end to end. One compose, two
places: the inbox and the Hub.

## How an officer sends an announcement (step by step)

1. Open `members.html` and sign in.
2. Open **Officer desk** → **All Krewe Messages** (the 📣 card).
3. Type the **Subject** and the **Message**. Plain text is fine — blank lines
   become paragraphs. The live **Branded preview** shows the framed email the
   members will receive (deep-green header, crest, gold accents, footer).
4. Tick the confirmation checkbox and press **☘ Send to all members**.

What happens on send (`send_all_krewe_message` in
`sql/kos_all_krewe_messages.sql`):

- **Email:** every active member is queued in `outbound_emails` via
  `queue_broadcast(...)`, wrapped in the branded template, and delivered by
  the `process-outbound-emails` Edge Function through Resend (see
  `EMAIL_AND_PHASE4_GUIDE.md`). Delivery is live — Resend is configured.
- **Members Hub:** the same message is saved in `all_krewe_messages`, and
  every signed-in member can read it in the Hub. Nothing extra to do.

## Where members see it in the Hub

On the **Home** tab of the Member Hub, the **📜 Word from the Board** card
shows the newest announcement in full (with the illuminated drop capital),
with the next two collapsed underneath. A **“📜 See all announcements”**
button under the card opens the full archive — up to the 100 most recent
messages, each expandable, with its date and sender.

So an announcement is never “lost to the inbox”: a member who deleted or
missed the email can always re-read it in the Hub.

## The pieces

| Piece | File | Role |
|---|---|---|
| Officer compose + history | `assets/kos-all-krewe-messages.js` | The Officer desk card; sends and lists prior messages |
| Send + history RPCs | `sql/kos_all_krewe_messages.sql` | `send_all_krewe_message`, `queue_broadcast`, `list_all_krewe_messages` (officer-only) |
| Member view (latest 3) | `sql/kos_board_announcements_member_view.sql` | `list_board_announcements` — subject, body, date, sender for any roster member |
| Member archive (up to 100) | `sql/kos_board_announcements_archive.sql` | Raises the `list_board_announcements` cap from 10 to 100 for the “See all announcements” control |
| Hub card + archive UI | `assets/members-desk.js` | `boardAnnouncementsHtml()` renders the card; `loadBoardArchive()` loads the archive on demand |
| Tests | `tests/specs/hub-announcements.spec.js` | Offline Playwright coverage of the card and archive |

## Deploying (one-time) — DONE

**`sql/kos_board_announcements_archive.sql` was applied** in the Supabase SQL
editor on project `oazwkwflgbthojvnclfc` on 2026-09-19 (safe to re-run if it
ever needs reapplying). Everything else in the flow was already applied, so
the whole feature is live end to end.

## Notes and limits

- Only **signed-in roster members** can read announcements in the Hub; the
  RPC refuses anonymous or non-roster sessions.
- The Hub renders announcement bodies as plain paragraphs (HTML is stripped)
  so an email full of markup can never break or restyle the Hub page.
- Sends from the Officer desk target the **active** roster segment and all
  appear in the Hub. A broadcast saved with segment `officers` (only possible
  from SQL) is **excluded** from the member-facing card and archive by the
  `kos_board_announcements_archive` migration.
- Scheduled, event-specific emails (announcement / ticket reminder / closing
  warning) are a separate Event Studio feature: `EVENT_SCHEDULED_EMAILS.md`.
