# Krewe of Shamrock — Document Library Feature Plan

**Status:** planning document (nothing in this file is built yet)
**Audience:** written for a novice builder — every section explains *what*, *why*, and *how*
**Related docs:** `SOFTWARE_ARCHITECTURE.md`, `DATABASE_BACKEND.md`, `MEMBER_HUB_SETUP.md`, `GAMIFICATION_DESIGN.md`

---

## 1. What this feature is

A **Document Library** inside the Member Hub (`members.html`) where every krewe
document lives in one organized place. Members can:

- **Open** a document in the browser (view it without downloading),
- **Download** it to their phone or computer,
- **Print** it (with print-friendly styling where the document is an HTML page).

Officers get a matching **Document Studio** (an officer-desk tool, like the
existing Event Studio and Shop Studio) where they can **upload** new documents,
edit titles and descriptions, sort them into categories, publish or unpublish
them, and retire old versions — all without touching code or GitHub.

Two special documents are part of the launch content, and a few documents are
deliberately **hidden "easter eggs"** that members discover by exploring the
website (details in Section 6):

1. **Tampa Bay Area Parade Calendar** — a one-page reference listing the
   pending dates for parades across the Tampa Bay area this season. This one is
   an easter-egg find.
2. **Krewe of Shamrock Season Calendar** — a cutely designed, 12-page document,
   one page per month of the season, showing this season's parades **with blank
   space on every page so members can pencil in events by hand**. Printed, it
   becomes a paper reference that stays useful all season: as new events are
   announced, members write them in.

---

## 2. What exists today (the starting point)

Understanding the current state matters because the plan reuses these pieces
instead of inventing new ones.

| Existing piece | Where it lives | How the Document Library will use it |
|---|---|---|
| Static governing documents | `assets/docs/` — `bylaws.html`, `code-of-conduct.html`, `parade-rules.html`, `dues-and-loa.html`, `liability-waiver.html`, plus PDF versions | These become the first rows in the new library (seeded, not re-uploaded). The HTML versions stay, because HTML prints beautifully and loads fast. |
| "Governing documents" pills | `assets/members-desk.js` (`DOC_PAGES`, `hubDocsPillsHtml()`, `revealDocsCard()`, the `#docs` card) | The pills remain as quick links, but the `#docs` card grows into the full library view, driven by the database instead of a hard-coded list. |
| Flyer upload pattern | `assets/kos-event-studio.js` — uploads to the public `event-flyers` Storage bucket, write access gated by `can_manage_events()` | The Document Studio copies this exact upload pattern, but into a **private** bucket (Section 4). |
| Officer gating | `is_krewe_officer()` / `can_manage_events()` SQL functions, RLS policies | The same functions gate who may manage documents. |
| Craic Cup game | `clover_ledger`, `submit_clover_request(...)`, badges | Easter-egg document discovery can award Clovers (Section 6). |
| Members-only Facebook, directory, Parade Ready | Member Hub tabs | The Documents card already sits on the **My Krewe** tab — the library stays there, keeping the Hub's information architecture unchanged. |

**Key constraint to respect:** this is a static site — no build step, no server.
Everything happens in browser JavaScript talking to Supabase with the
publishable key, protected by Row Level Security (RLS) and gated RPC functions,
exactly like every other feature on the site.

---

## 3. Design decisions (with reasoning)

These are the choices this plan recommends. Each has a short "why" so you can
overrule any of them knowingly.

### 3.1 Where the files live: a private Supabase Storage bucket

Create one new Storage bucket named **`krewe-documents`**, set to **private**
(not public).

- **Why private?** The existing `event-flyers` bucket is public because flyers
  are marketing. Documents like bylaws drafts, meeting minutes, or member-only
  calendars should not be fetchable by anyone who guesses a URL. A private
  bucket means every download goes through a permission check.
- **How members download from a private bucket:** the browser asks Supabase for
  a **signed URL** — a temporary link (for example, valid for 60 minutes) that
  Supabase only issues to signed-in users the Storage policies allow. The
  JavaScript call is `client.storage.from('krewe-documents').createSignedUrl(path, 3600)`.
  Reference: <https://supabase.com/docs/guides/storage/serving/downloads>
- **Folder layout inside the bucket:** one folder per category slug, e.g.
  `governing/`, `calendars/`, `forms/`, `newsletters/`, `fun/`. Files named
  with a timestamp prefix to avoid collisions, mirroring the flyer pattern
  (`calendars/1758240000000-season-calendar-2027.pdf`).

### 3.2 What the database stores: a `documents` metadata table

Files alone are not enough — the library needs titles, descriptions,
categories, ordering, and publish state. That is a table:

```sql
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,                          -- one friendly sentence shown under the title
  category      text not null default 'general'
                check (category in ('governing','calendars','forms','newsletters','fun','general')),
  storage_path  text,                          -- path inside the krewe-documents bucket (for uploaded files)
  page_url      text,                          -- OR an in-repo page like /assets/docs/bylaws.html
  file_type     text,                          -- 'pdf', 'html', 'docx', 'image' — drives the icon and the Open behavior
  file_size     bigint,                        -- bytes, so the UI can show "2.4 MB"
  is_published  boolean not null default false,-- officers draft first, publish when ready
  is_surprise   boolean not null default false,-- easter-egg documents: excluded from the main list (Section 6)
  surprise_slug text unique,                   -- short code the easter-egg link carries, e.g. 'tampa-parades'
  sort_order    int not null default 100,      -- lower numbers list first within a category
  uploaded_by   uuid references public.members(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

Notes for a beginner:

- A document points at **either** `storage_path` (an uploaded file) **or**
  `page_url` (an existing HTML page in the repo). This lets the five current
  governing documents join the library without moving them.
- `check (category in (...))` is the database refusing bad data — the same
  pattern `members.member_role` already uses.
- `is_published` gives officers a safe workspace: upload → preview → publish.

### 3.3 Who can see and do what: RLS + RPCs

Follow the site's established security shape exactly:

| Action | Who | Enforced by |
|---|---|---|
| List published, non-surprise documents | any signed-in member | RLS `select` policy: `is_published = true and is_surprise = false` for role `authenticated` |
| Open a surprise document by its slug | any signed-in member **who has the slug** | RPC `discover_document(p_slug)` (Section 6) — no direct table read of surprise rows |
| List **all** documents incl. drafts & surprises | officers | RLS `select` policy using `is_krewe_officer()` |
| Insert / update / delete rows | officers | Either RLS write policies gated by `is_krewe_officer()`, or (preferred, matching recent hardening) SECURITY DEFINER RPCs `officer_upsert_document(...)`, `officer_set_document_published(...)`, `officer_delete_document(...)` with `EXECUTE` revoked from `anon` |
| Upload / delete files in the bucket | officers | Storage RLS policies on `storage.objects` for bucket `krewe-documents`, gated by `is_krewe_officer()` |
| Download files | any signed-in member | Storage `select` policy for `authenticated` on the bucket (signed URLs still require this) |

Anonymous visitors get nothing — consistent with the rest of the member data.

Reference for Storage policies:
<https://supabase.com/docs/guides/storage/security/access-control>

### 3.4 Download log — DECIDED: none

**Decision (Melissa, 2026-09-19): no download logging at all.** No
`document_views` table is built. Downloads leave no record of any kind —
the most private option, consistent with the krewe's QR privacy posture.
If officers later want usage numbers, an anonymous-counts table can be added
without touching anything else in this design.

---

## 4. Member experience (what a member sees)

All of this lives on the **My Krewe** tab, expanding the existing `#docs` card.

1. **The Documents card** shows categories as friendly section headers:
   - ☘ **Governing** — Bylaws, Code of Conduct, Parade Rules, Dues & LOA, Liability Waiver
   - 📅 **Calendars & Season** — the 12-page Season Calendar, meeting schedule
   - 📝 **Forms** — printable forms members may need
   - 📰 **Newsletters** — if/when the krewe starts one
   - 🎉 **Fun finds** — easter-egg documents appear here **only after that
     member has discovered them** (Section 6) — this section is the trophy shelf
2. **Each document row** shows: an icon by file type, the title, the one-line
   description, the size for files ("PDF · 2.4 MB"), and three actions:
   - **Open** — HTML pages open in-Hub or a new tab; PDFs open in the browser's
     built-in viewer via a signed URL.
   - **Download** — same signed URL with `?download` so the browser saves the
     file instead of displaying it
     (`createSignedUrl(path, 3600, { download: true })`).
   - **Print** — for HTML documents, opens the page and calls `window.print()`;
     for PDFs, the browser viewer's own print button does the job, so the
     library's Print action simply opens the PDF and tells the member to use it.
3. **Mobile matters:** most members are on phones. Rows use the Hub's existing
   44px-minimum touch targets (`.hub-docs a` already does this). Download on
   iOS Safari saves to the Files app — worth one line of helper text the first
   time.

---

## 5. Officer experience: the Document Studio

A new Officer desk tool, structurally a copy of the Shop Studio pattern
(`assets/kos-shop-studio.js` → new file `assets/kos-doc-studio.js`):

1. **Upload** — pick a file (accept `.pdf,.docx,.png,.jpg`), give it a title,
   description, and category. The file goes to the `krewe-documents` bucket;
   the metadata row is created **unpublished**.
2. **Preview** — officers see unpublished rows with a "draft" chip and can open
   them via signed URL before anyone else can.
3. **Publish / Unpublish** — one toggle. Publishing is what makes it appear for
   members.
4. **Mark as surprise** — a checkbox plus a short slug field turns a document
   into an easter egg (Section 6). The Studio shows the full easter-egg link so
   the officer can place it anywhere on the site or in an email.
5. **Replace a file** — upload a new file onto an existing row (new
   `storage_path`, old file deleted) so the "Season Calendar" link never
   changes even when the file is refreshed — the same philosophy as the QR
   registry's re-pointable `target_url`.
6. **Retire** — unpublish rather than delete, so history is kept; delete exists
   but warns.

File size guard: reject uploads over ~20 MB in the browser with a friendly
message (Supabase free tier caps and phone data plans both appreciate it).

---

## 6. The easter-egg mechanic (the fun part)

The request: a few documents should feel like **finding a surprise** while
wandering the website — for example, the **Tampa Bay Area Parade Calendar**.

### How discovery works

1. A surprise document has `is_surprise = true` and a `surprise_slug`
   (e.g. `tampa-parades`). It is **invisible** in the main library list.
2. Somewhere on the website, a small, unlabeled visual is placed — a tiny extra
   shamrock in a border, a clover tucked into the `parades.html` page footer, a
   glinting pixel in a gallery corner. It links to
   `members.html?found=tampa-parades`.
3. When the Hub loads with `?found=SLUG` and the member is signed in, it calls
   a new RPC **`discover_document(p_slug)`** which:
   - looks up the published surprise document with that slug,
   - records the find in a `document_discoveries` table
     (`member_id`, `document_id`, `found_at`, unique per member+document so
     re-finding never double-counts — the same idempotency trick as
     `door_checkins`),
   - returns the document's metadata so the Hub can pop a celebration:
     *"☘ You found a hidden treasure! The Tampa Bay Parade Calendar is now in
     your Fun finds."*
4. From then on, that document appears in that member's **Fun finds** section —
   the RPC-backed list is per-member, which is why surprises are read through
   the RPC rather than plain RLS.

### Tie-in with the Craic Cup (recommended, small)

The krewe already has a points economy. On **first** discovery of each surprise
document, `discover_document` inserts a `clover_ledger` row worth a small,
fun amount (suggest **+10 Clovers**, `reason = 'easter_egg'`). The unique
constraint on `document_discoveries` is what guarantees one award per member
per document — no officer approval needed because the find itself is the proof.
This mirrors how the RSVP +5 award works (unique partial index prevents double
award). If the krewe prefers to keep the game and the library separate, skip
this — everything else stands alone.

### Where to hide the first eggs (suggestions to choose from)

- `parades.html` — a small clover at the end of the parade history → **Tampa
  Bay Area Parade Calendar** (thematically perfect).
- `krewe-history.html` — a shamrock in the timeline → a "vintage" krewe photo
  sheet or trivia page.
- `poetry.html` — the last line of a poem → a printable Irish blessing card.

Keep the total small (3–5). Scarcity is what makes it a treasure hunt.

---

## 7. The two launch calendars

### 7.1 Tampa Bay Area Parade Calendar (easter egg)

A **one-page** document listing area parades and their pending dates
(Gasparilla-adjacent season, St. Patrick's events, IKC krewe parades). Since
dates are "pending," build it as a **print-styled HTML page**
(`assets/docs/tampa-bay-parades.html`) rather than a PDF:

- HTML can carry a "dates last updated" line and is a one-commit edit when a
  date firms up — no re-export, no re-upload.
- It prints cleanly with a small `@media print` stylesheet (hide nav, black
  text on white).
- The library row uses `page_url`, `file_type = 'html'`, `is_surprise = true`,
  `surprise_slug = 'tampa-parades'`.
- **Content source:** the `events` table already distinguishes `source =
  'krewe'` from `source = 'ikc'`. The page can be generated from those rows
  (a small fetch on load, with a static fallback list baked in), so the paper
  calendar and the Hub calendar never drift apart.

### 7.2 Krewe of Shamrock Season Calendar (12 pages, one per month)

The signature piece: cutely designed, one month per page, this season's parades
pre-printed, **generous blank writing space on every page** so a printed copy
becomes a living paper planner.

**Season span:** the krewe's season rule is already defined in the database —
`kos_volunteer_season_year()` / `craic_season_year()` treat **July 1 – June 30**
as the season. Twelve pages = July through June, matching that rule exactly.

**Recommended build: a print-first HTML page** (`assets/docs/season-calendar.html`):

- **Page structure:** each month is a `<section>` with
  `page-break-after: always` (CSS `break-after: page`), sized for US Letter.
  Twelve sections = twelve printed pages, automatically.
- **Each page contains:** the month name in the krewe's display font, a classic
  month grid with this season's krewe parades and key dates pre-filled in
  their cells, the krewe crest/celtic border art from `assets/img/`
  (`celtic-border.svg`, `kos-crest.png`), and a ruled **"Pencil it in"**
  block — 6–8 blank lines with a light dotted rule, plus roomy calendar cells,
  because pencil space *is* the product.
- **Data:** on load, fetch this season's events (`events` where `start_time`
  falls in the season window) and place them in the grid; also ship with the
  known parade dates hard-coded as a fallback so the page still prints if
  opened offline after saving.
- **Print styling:** `@media print` hides everything but the pages; test in
  Chrome and Safari's print preview (they break pages slightly differently);
  set `@page { margin: 0.5in; }`.
- **In the library:** category `calendars`, published normally (this one is a
  headline feature, not an egg). The Open action shows it in-browser; the
  Print action triggers `window.print()`.

**Alternative considered — a designed PDF (e.g. made in Canva) uploaded to the
bucket:** prettier typography control, but every date change means re-export
and re-upload, and members holding an old printout diverge silently. The HTML
approach keeps one source of truth and still prints charmingly with good CSS.
A middle path: build HTML now; if the krewe later wants a lavish keepsake
edition, an officer uploads that PDF as a *second* document ("Season Calendar —
Keepsake Edition") without disturbing the living one.

---

## 8. Build phases (small, shippable steps)

Each phase deploys on its own and leaves the site working. Follow the repo's
deploy rule: push to `main` → Vercel Production; after Hub JS changes, bump the
`members-desk.js?v=…` cache-buster in `krewe.js`.

### Phase 1 — Backend foundation (one SQL migration)
- Migration `sql/kos_document_library.sql`: the `documents` table,
  `document_discoveries` table, RLS policies, the officer RPCs, the
  `discover_document` RPC, the `krewe-documents` bucket and its Storage
  policies.
- Seed rows for the five existing governing documents (using `page_url`).
- Verify with Supabase security advisors after the privilege changes (the
  established habit from the 2026-09-08 hardening).
- **Done when:** an officer account can list all rows from the SQL editor; a
  member account sees only published, non-surprise rows.

### Phase 2 — Member library UI
- Grow the `#docs` card in `assets/members-desk.js` (or a new
  `assets/kos-doc-library.js` loaded the same way the other `kos-*.js` helpers
  are) to render categories from the `documents` table, with Open / Download /
  Print actions and signed-URL fetching.
- Keep `hubDocsPillsHtml()` pills working during the transition — they can
  point at the same rows.
- **Done when:** a member on a phone can open, download, and print a seeded
  governing document.

### Phase 3 — Officer Document Studio
- New `assets/kos-doc-studio.js` on the Officer desk: upload, edit, publish,
  replace, retire, surprise toggle + slug + copyable egg link.
- **Done when:** an officer uploads a PDF end-to-end and a member can download
  it, with no code changes involved.

### Phase 4 — The two calendars
- Build `assets/docs/tampa-bay-parades.html` and
  `assets/docs/season-calendar.html` with print stylesheets; wire the events
  fetch; add both as library rows (calendar published, parade list as
  surprise).
- **Done when:** the season calendar prints as twelve clean pages from Chrome
  and Safari with room to write.

### Phase 5 — Easter eggs + Craic Cup
- Hide 3–5 egg links across the public pages; implement the `?found=SLUG`
  handler and the celebration toast; enable the +10 Clover award in
  `discover_document`.
- **Done when:** finding the parades-page clover as a member pops the
  celebration once, shows the document under Fun finds, and awards Clovers
  exactly once even after repeat visits.

Sequencing note: Phases 2 and 3 can swap; nothing else can. Phase 5 is the
only phase touching public pages.

---

## 9. Testing checklist (manual, matches how this site is verified)

- Member sees published documents; never sees drafts or undiscovered surprises
  (check via a non-officer roster account).
- Signed URL expires: wait past the TTL or request a 10-second URL and confirm
  it dies — proves the bucket is genuinely private.
- Anonymous browser (logged out) gets zero rows and zero files.
- Officer upload → publish → member download round-trip on a real phone.
- `discover_document` idempotency: hit the egg link three times, one Clover
  award, one Fun-finds row.
- Print preview of the season calendar: 12 pages, no orphaned headers, in both
  Chrome and Safari.
- Supabase advisors: no new warnings beyond the known accepted ones.

---

## 10. Product owner decisions (Melissa, 2026-09-19)

1. **Download logging: NONE.** No logging table of any kind (see 3.4).
2. **Clovers for easter eggs: YES, +10** per member per surprise document,
   one-time, enforced by the unique constraint on `document_discoveries`.
3. **Category list: APPROVED** — `governing / calendars / forms /
   newsletters / fun / general`.
4. **Season calendar art: BUILD NOW** from the site's existing celtic assets
   (`celtic-border.svg`, `kos-crest.png`, the display font). Artwork can be
   restyled later; a keepsake PDF edition remains a possible later addition.
5. **Which pages hide eggs, and how sneaky — STILL OPEN.**
   Recommendation: "small but visible" clovers (invisible-until-hover is fun
   on desktop but undiscoverable on phones). Candidate spots in Section 6.

---

## 11. References (for learning the pieces used here)

- Supabase Storage overview: <https://supabase.com/docs/guides/storage>
- Signed URLs & downloads: <https://supabase.com/docs/guides/storage/serving/downloads>
- Storage access control (bucket RLS): <https://supabase.com/docs/guides/storage/security/access-control>
- Postgres Row Level Security concepts: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase RPC (database functions): <https://supabase.com/docs/guides/database/functions>
- CSS paged media / page breaks for the printable calendar:
  <https://developer.mozilla.org/en-US/docs/Web/CSS/break-after> and
  <https://developer.mozilla.org/en-US/docs/Web/CSS/@page>
- `window.print()`: <https://developer.mozilla.org/en-US/docs/Web/API/Window/print>

---

*Prepared 2026-09-19. This file is excluded from the public deploy by the
`*.md` rule in `.vercelignore`, like all internal runbooks.*
