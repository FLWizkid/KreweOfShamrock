# Krewe of Shamrock — Website

Tampa's original kilted krewe (Est. 1999). This repository holds the source for the
Krewe of Shamrock website.

**Live site:** https://krewe-of-shamrock.vercel.app

## Overview
A static website (HTML / CSS / JavaScript) with dynamic content served from a
Supabase backend (events, poetry & art, the shop, and member coordination tools).
No build step is required — the pages are served as-is.

## Structure
- `*.html` — the site pages (Home, Events, Parades, Tartan Ball, Join, Service,
  Gallery, Shop, Videos, Learn, Poetry & Art, Members)
- `assets/krewe.css`, `assets/krewe.js` — shared styles and scripts
- `assets/img/`, `assets/audio/` — images, the crest/logo, and the theme music
- `*.md` — project plans and guides
- `Krewe of Shamrock - Software Design Document.docx` — architecture & cost analysis

## Running locally
Open `index.html` in a browser, or serve the folder with any static server.

## Deploying
Hosted on Vercel as a static site. Connecting this repository to Vercel
(Import Git Repository) will redeploy automatically on every push to `main`.

## Parade season (officers)

Apply `sql/kos_parade_season.sql` in the Supabase SQL editor (safe to re-run), then:

1. Event Studio → create the **mandatory meeting** (or use create-pair on the parade).
2. Event Studio → type **Parade**, keep it public + members only, set the muster / step-off window, link the meeting, put staging in the private staging address, add role notes, publish.
3. Make Door check-in QRs for the meeting and the parade. Parade door check-in warns/blocks if the meeting was missed; parade RSVP stays open.
4. Public `parades.html` shows every Shamrock march as a recruiting card (Join / Member Login / See the season), plus a Gasparilla spotlight. Staging streets never go on the public page.

Full steps: `EVENT_STUDIO.md` (Parade season how-to).

## Notes
- The backend is a Supabase project; only the public "publishable" key ships in the
  client — no secrets are stored in this repository.
- Large raw source media (zip archives, source videos) are intentionally excluded
  via `.gitignore`.
