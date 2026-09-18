# Event Studio

Event Studio lives in the authenticated Member Hub under **Officer desk**. Members with the normal officer role, or a board/officer/captain/committee-chair event-management grant, can create and edit Krewe events.

## Create or edit an event

1. Open `members.html` and sign in.
2. Open **Officer desk**, then **Event Studio**.
3. Choose **New / clear** for a new event, or **Edit** beside an existing Krewe event.
4. Enter the name and start time, then add the public location teaser, private member address, description, capacity, event type, visibility, mandatory flag, status, flyer, and ticket details.
5. Optional extras (all off unless you turn them on; existing events without them keep working):
   - **Members only.** Check this for house parties and other member events. Public pages show title, date, and the teaser only (for example "Members home, Tampa"), plus a sign-in note. The full street address is never sent to anonymous visitors.
   - **Public location teaser.** Safe for the public site. Keep it vague for members-only events.
   - **Private / member address.** Full street address. Shown to signed-in members in the Member Hub and included in the RSVP confirmation email. Anonymous API clients cannot select this column.
   - **Raffle tickets.** Reuses `raffle_events` plus the signup raffle qty field. Offer tickets, attach an existing raffle, or enter a ticket price (officer-entered; nothing is hardcoded). Leave the box unchecked for no raffle.
   - **Meal choice.** Turn it on and list meal options (one per line). Members pick one at signup; the choice is stored on `event_signups.meal_choice`.
   - **Online meeting.** Set type to Online or check "This is an online event" and paste the join URL. Signup emails that link only to the member who just registered, through `enqueue_email` / `outbound_emails`.
6. Save. The list refreshes from `officer_list_events()`. Published events stay editable (address, dates, Close registrations on).

Schema for raffle / meal / online extras is `sql/kos_event_studio_raffle_meal_online.sql` (applied live; safe to re-run).

Members-only + private address is `sql/kos_event_members_only_address.sql`. Melissa needs to run that file in the Supabase SQL editor on project `oazwkwflgbthojvnclfc` (same as prior Event Studio scripts). Safe to re-run. Until it is applied, Event Studio can still save other fields, but the new columns, `v_public_events` view, and RSVP email address line will not exist yet.

Anonymous PostgREST lock-down for `member_address` / `meeting_url` is `sql/kos_event_member_address_anon_lockdown.sql`. Run that too (or re-run the updated members-only file). A table-level `GRANT SELECT` to `anon` makes a column revoke a no-op.

IKC-sourced events are read-only. The database authorization is enforced again by `officer_upsert_event`, so hiding the UI is not the security boundary.

## Cancel vs delete permanently

**Cancelled** (Status dropdown) keeps the event row and hides it from public signup. Use that when the gathering is off but the record should stay.

**Delete permanently** is a separate dangerous action for mistaken events that should not remain in the system. It is on each Event Studio row and on the editor after you tap Edit event.

1. Tap **Delete permanently**.
2. Confirm the named event (title and date). Type the event name, or type `Delete permanently`.
3. Tap **Delete permanently** again. **Cancel** aborts with no changes.
4. On success the event leaves the list. On failure the server message is shown in the confirm panel.

Authorization is `can_manage_events()` inside `officer_delete_event` (`sql/kos_officer_delete_event.sql`). Apply that SQL on live Supabase before the button will succeed.

Related data: RSVPs (`event_signups`) for that event are removed. Payment ledger rows stay; `payments.event_id` is cleared. Linked raffles stay; `raffle_events.krewe_event_id` is cleared. Tartan Ball orders block the delete (cancel that event instead). IKC sync events cannot be deleted.

## Flyers (featured event)

The public sign-up page (`event-signup.html`) features the earliest upcoming **published, public** event that has a flyer. To attach one:

1. In the Event Studio form, use **Upload flyer (PDF or image)**. Accepted types are PDF, JPG, PNG, and WEBP, up to 10 MB.
2. The file uploads to the public `event-flyers` Supabase Storage bucket (created by `sql/kos_event_flyers_storage.sql`; storage row-level security allows writes only for members who pass `can_manage_events()`), and the resulting public URL is placed in the **Flyer URL** field automatically. You can also paste any URL there by hand.
3. Press **Save event**. Once the event is published and public, the flyer appears in the "Featured Event" section — PDFs render in an embedded viewer with an "Open flyer PDF" link, images render directly.

## Paid tickets

Create a Stripe Payment Link for the event, set Payment Link metadata `kind=event`, and paste the link into **Ticket payment URL**. Enter the customer-facing ticket label and dollar price; Event Studio converts dollars to cents for the `events.ticket_price_cents` column. Payment reconciliation remains handled by the Stripe webhook and payments ledger. See `PAYMENTS_SETUP.md` for the Stripe runbook.
