# QR Code Library & Generator — Build Plan

*A review of everything QR in this repository, the fix that ships with this plan, and the
phased roadmap for a real QR library: one place where officers create, print, and track
every square the krewe uses.*

*Companion to `QR_FEATURE_SOLUTIONS.md` (the "a QR code is a link drawn as a square"
mental model). That file explains the idea to officers; this file is the engineering plan.*

---

## 1. Where QR code features live today (repository inventory)

The generator is not one thing yet — it is the same small routine copy-pasted into five
places. Each copy loads the open-source `qrcode` JavaScript library, builds a URL, and
draws it onto a `<canvas>` element in the page.

| Place | File | What it draws |
|---|---|---|
| Event Studio (officer desk) | `assets/members-desk.js` → `studioPaintQR()` | RSVP QR (`event-signup.html?event=…`) and Door check-in QR (`members.html?checkin=CODE`) per event |
| QR Code Studio card (officer desk) | `assets/kos-qr-studio.js` → `paintLinkQR()` / `enableCheckinInline()` | Meeting check-in QR plus "handy squares" (dues, volunteer hours, store, Facebook group, secretary help) |
| Shop Studio (officer desk) | `assets/kos-shop-studio.js` → `shopPaintQR()` | Per-product Zeffy checkout QR, or whole-store QR |
| Members page inline script | `members.html` → `kosShowCheckinQR()` / `kosShowLinkQR()` | Same meeting check-in and deep-link squares (the studio files call these when present) |
| Raffle print sheet | `raffle-qr-sheet.html` | One printable card per raffle basket plus the 50/50 pot |

Backend pieces that already exist (documented in `DATABASE_BACKEND.md`, live in Supabase):

- `meeting_checkin_codes` — officer-only table of per-meeting check-in codes.
- `officer_enable_checkin(p_event)` — officer RPC that creates/returns a meeting's code.
- `meeting_check_in(p_code)` — member RPC that marks attendance within ±12 hours of the
  meeting start. The scan lands on `members.html?checkin=CODE`, the code survives the
  sign-in in `localStorage`, and `handlePendingCheckin()` redeems it.
- Attendance feeds the Parade Ready engine and the officer reports.

So: **check-in tracking already works end-to-end.** What does not exist yet is a
*library* — a registry of every QR code the krewe has issued, who scans them, and a
single officer surface to manage them.

### Known repository gaps found during this review

1. **The drawing routine is duplicated five times.** Any styling or fallback change has
   to be made in five files (and they have already drifted: three different fallback
   messages exist).
2. **The migrations `kos_parade_ready_engine` and `kos_checkin_codes_private` are
   referenced by `DATABASE_BACKEND.md` but are not in the `sql/` folder.** The database
   has them; the repository does not. They should be exported and committed so the
   backend can be rebuilt from the repo.
3. **The library loaded from a third-party CDN** — the cause of the "QR library
   unavailable — use the link" message officers saw (fixed below).

---

## 2. Fixed in this change: "QR library unavailable — use the link"

**Symptom.** Tapping *Door check-in QR* (or any Show QR button) printed the text
fallback and a bare link instead of a square.

**Cause.** Every page loaded the drawing library from
`https://cdn.jsdelivr.net/npm/qrcode@1.5.3/...`. That is a third-party content delivery
network, and it is exactly the kind of address that ad-blocker browser extensions,
privacy modes, and school/venue Wi-Fi filters silently block. When the file never
arrives, `window.QRCode` is undefined and every paint routine falls back to text.

**Fix.** The same library (same version, 1.5.3, MIT license) is now committed to the
repository at `assets/vendor/qrcode.min.js` and served from `kreweofshamrock.com`
itself. Same-origin files are not blocked by ad-blockers. The CDN address remains only
as an automatic fallback if the local file ever fails to load. Pages changed:
`members.html`, `raffle-qr-sheet.html` (the only two that load the library — every
studio script runs inside `members.html`).

---

## 3. The roadmap: from five copies to one library

Each phase is a separate pull request, shippable on its own, ordered so that every
phase is useful even if the next one never happens.

### Phase 1 — One shared generator module (`assets/kos-qr.js`)

*Effort: small. No database work.*

Create one file that owns everything about drawing squares, and delete the five copies.

- `kosQR.paint(slot, url, label)` — today's canvas + link rendering, one fallback
  message, krewe colors (`#14532d` on white) defined once.
- `kosQR.downloadPNG(url, filename)` — the library's `toDataURL()` already supports
  this; officers constantly want to drop a square into a flyer, Canva, or a slide.
  Today they screenshot the screen.
- `kosQR.printCard(title, subtitle, url)` — opens a print-ready card (generalizing what
  `raffle-qr-sheet.html` proved works: title, subtitle, square, "Scan me" line).
- Load it from `members.html` and `raffle-qr-sheet.html`; have
  `members-desk.js`, `kos-qr-studio.js`, and `kos-shop-studio.js` call it.

Acceptance: every existing Show QR button still works; each also offers
**Download PNG**; `node tests/static-check.mjs` passes; the Playwright specs in
`tests/specs/` still pass.

### Phase 2 — The QR registry with scan tracking (the actual "library")

*Effort: medium. One SQL migration + one small redirect page.*

Today a square encodes its destination directly, so a printed square can never be
re-pointed, and nobody knows whether anyone scans it. The registry fixes both by
putting a tiny krewe-owned hop in the middle.

**New migration `sql/kos_qr_registry.sql`:**

```
qr_codes
  id            uuid primary key
  slug          text unique          -- short code that goes in the square, e.g. "dues"
  label         text                 -- officer-facing name, e.g. "Dues postcard 2026"
  target_url    text                 -- where the scan lands (editable after printing!)
  purpose       text                 -- 'event_rsvp' | 'checkin' | 'shop' | 'dues' | 'link' | …
  event_id      uuid null            -- optional link to events
  product_id    uuid null            -- optional link to shop products
  active        boolean default true
  created_by    uuid                 -- officer
  created_at    timestamptz

qr_scans
  id            bigint identity
  qr_id         uuid references qr_codes
  scanned_at    timestamptz default now()
  member_id     uuid null            -- only when a signed-in member scans; anonymous otherwise
```

- RPC `resolve_qr(p_slug)` (security definer, callable anonymously): looks up the slug,
  inserts a `qr_scans` row, returns `target_url`. Row Level Security: officers manage
  `qr_codes`; nobody reads `qr_scans` directly except officers.
- New page **`go.html`**: reads `?c=SLUG`, calls `resolve_qr`, redirects. Squares now
  encode `https://www.kreweofshamrock.com/go.html?c=dues` instead of the raw Zeffy URL.
- Follows the pattern of every existing migration in `sql/` (`kos_raffles.sql`,
  `kos_event_studio.sql` are good models for RLS + RPC style).

What officers gain: **scan counts per square** ("did anyone scan the dues postcard?"),
and **re-pointable print runs** (Zeffy link changed? Edit `target_url`; the printed
squares on 200 flyers keep working).

Privacy decision for the officers (see §4): whether member scans record `member_id`
or stay anonymous counts only.

### Phase 3 — Officer "QR Library" card in the Member Hub

*Effort: medium. Front-end only, on top of Phase 2.*

Grow `assets/kos-qr-studio.js` from "tonight's handy squares" into the library view:

- Table of all registry codes: label, purpose, destination, active toggle,
  **scan count**, buttons: Show QR / Download PNG / Print card / Edit destination.
- "New QR" form: label + destination + purpose (auto-fills from an event or product
  when opened from Event Studio / Shop Studio, so those studios become thin callers
  of the library instead of parallel implementations).
- A **print-sheet builder**: pick any set of codes, get a `raffle-qr-sheet.html`-style
  page (that page then becomes just a preset of this builder).
- Scan counts are surfaced directly in the library table (total, last 30 days, last
  scan), so a separate `assets/kos-reports.js` report is optional — add one later only
  if officers want scans inside the Reports dashboard too.

### Phase 4 — Attendance QR upgrades (the old "Attendance QR Studio" roadmap item)

*Effort: medium. Small SQL changes on the proven check-in flow.*

`QR_FEATURE_SOLUTIONS.md` already re-framed this correctly: not a new app, but smart
upgrades to the existing Door check-in button.

- **Hours-on-scan**: when the checked-in event is a volunteer event, the same scan
  inserts a pending `volunteer_hours` row (officer confirms afterward, exactly like
  today's manual flow in `officer_confirm_attendance`).
- **Live door count**: officer view of check-ins as they happen at the door
  (Supabase realtime subscription on the attendance table, shown in the projector view).
- Remaining ideas from `SOFTWARE_ARCHITECTURE.md` §"QR feature solutions" slot in here:
  Tartan Ball guest card, wristband station, locker sticker — all become registry
  entries (Phase 2) plus print presets (Phase 3), not new systems.

---

## 4. Decisions the officers should make before Phase 2

1. **Tracking granularity.** Anonymous scan counts only, or record *which member*
   scanned when signed in? Counts answer "is this flyer working"; member-level answers
   "who engaged" but is personal data — the krewe should decide deliberately and say so
   to members (same spirit as `PHOTO_AND_IMAGE_RELEASE.md`).
   **Decided 2026-09-18: anonymous counts only.** `qr_scans` stores just the code
   and the timestamp — no member id, no IP address, no browser details.
2. **Static vs. tracked squares.** Anything already printed and working (raffle
   baskets, current check-in flow) can stay direct-URL; new print runs should go
   through `go.html`. Both can coexist indefinitely.
3. **Slug style.** Human-readable slugs (`go.html?c=dues2026`) are debuggable and
   fine for everything except door check-in, which keeps its random secret codes
   (a guessable check-in code would let people check in from home).

---

## 5. Suggested order of work

| # | What | Depends on | Size |
|---|---|---|---|
| 0 | Self-host the QR library (ships with this plan) | — | done |
| 1 | Export + commit the missing `kos_parade_ready_engine` / `kos_checkin_codes_private` migrations to `sql/` | database access | started — `meeting_check_in` exported to `sql/kos_checkin_engine_export.sql`; that file's header lists what is still missing |
| 2 | Phase 1: shared `assets/kos-qr.js`, delete the five copies, add Download PNG | — | done |
| 3 | Phase 2: `sql/kos_qr_registry.sql` + `go.html` | migration applied 2026-09-18 | done |
| 4 | Phase 3: QR Library card + print-sheet builder (scan counts shown in the card) | Phase 2 | done |
| 5 | Phase 4: hours-on-scan, live door count (`sql/kos_attendance_qr_hours.sql`) | run the migration in Supabase | built |

*Written 2026-09-18 from a review of the `main` branch. Sources: `QR_FEATURE_SOLUTIONS.md`,
`DATABASE_BACKEND.md` §Parade Ready, `SOFTWARE_ARCHITECTURE.md` §QR feature solutions,
and the five QR code sites listed in §1.*
