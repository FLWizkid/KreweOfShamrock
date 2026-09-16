# Regression tests

A regression suite for the Krewe of Shamrock site: a static integrity check
plus Playwright browser tests that load every page.

## What is covered

- **`static-check.mjs`** — every local `href`/`src`/`poster`/inline-style
  `url(...)` in the HTML pages and `assets/krewe.css` resolves to a real file,
  and every page carries the shared stylesheet and navigation.
- **`specs/pages.spec.js`** — each of the 16 pages loads with no uncaught JS
  errors, no console errors, and no failed same-origin resources; the shared
  chrome (styled nav, music player with the violin icon, correct active-link
  highlight) is present; all internal links point at real pages.
- **`specs/interactions.spec.js`** — desktop nav dropdowns (open/close,
  Escape, outside click, one-at-a-time), the mobile hamburger drawer
  (open, backdrop close, link-tap close), and the music player toggle.
- **`specs/forms.spec.js`** — membership application and event sign-up
  client-side validation, the members-area auth gate, and the shop cart.
  Forms are never submitted with valid data, so no test writes to the
  production Supabase backend.
- **`specs/leadership.spec.js`** — first-login questionnaire lists Shamrock
  Leaders titles (officers, board, committee chairs) and the client catalog
  maps titles onto existing RBAC enums, leaving Parade chair vacant.

External services (Supabase, CDNs, Google Fonts) are treated as optional:
the suite passes offline, and only same-origin failures or genuine script
errors fail a test.

## Running

```sh
cd tests
npm install
npm test          # static check + Playwright suite
npm run test:static
npm run test:browser
```

Playwright downloads its own Chromium on first install. If a pre-installed
browser should be used instead, point `CHROMIUM_PATH` at the executable
(the config also picks up `/opt/pw-browsers/chromium` automatically).
