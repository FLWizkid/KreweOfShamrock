#!/usr/bin/env node
/* Static integrity check for the Krewe of Shamrock site.
   Verifies that every local file referenced by the HTML pages and the shared
   stylesheet actually exists on disk: page links, images, audio, CSS, JS,
   favicons, and url(...) references inside CSS. Exits non-zero on failure. */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");

const htmlFiles = readdirSync(ROOT).filter((f) => f.endsWith(".html"));
const problems = [];
const checked = new Set();

function isExternal(ref) {
  return /^(https?:|mailto:|tel:|javascript:|data:|#|\/\/|sms:)/i.test(ref);
}

function normalize(ref) {
  // strip query string and fragment (e.g. hero-fiddler.jpg?v=2, page.html#top)
  return decodeURIComponent(ref.split(/[?#]/)[0]);
}

function checkRef(fromFile, ref, kind) {
  if (!ref || isExternal(ref)) return;
  const path = normalize(ref);
  if (!path) return; // pure fragment link
  if (/\$\{|\{\{/.test(path)) return; // template placeholder in inline JS
  const target = path.startsWith("/")
    ? resolve(join(ROOT, path.slice(1)))
    : resolve(join(ROOT, dirname(fromFile)), path);
  const key = `${fromFile} -> ${ref}`;
  if (checked.has(key)) return;
  checked.add(key);
  if (!existsSync(target)) {
    problems.push(`${fromFile}: missing ${kind} "${ref}"`);
  } else if (statSync(target).isDirectory() && !path.endsWith("/")) {
    problems.push(`${fromFile}: ${kind} "${ref}" is a directory`);
  }
}

// --- scan HTML attributes ---------------------------------------------------
const ATTR_RE = /\b(?:href|src|poster|data-src)\s*=\s*["']([^"']+)["']/gi;
const STYLE_ATTR_RE = /\bstyle\s*=\s*"([^"]*)"/gi;
const STYLE_URL_RE = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;

for (const file of htmlFiles) {
  const html = readFileSync(join(ROOT, file), "utf8");
  let m;
  while ((m = ATTR_RE.exec(html))) checkRef(file, m[1], "reference");
  // only scan url(...) inside style="" attributes, not inline JS (new URL(...))
  let s;
  while ((s = STYLE_ATTR_RE.exec(html))) {
    let u;
    while ((u = STYLE_URL_RE.exec(s[1]))) checkRef(file, u[1], "inline-style url");
  }
}

// --- scan CSS url() references ---------------------------------------------
const cssFiles = ["assets/krewe.css"];
for (const file of cssFiles) {
  const css = readFileSync(join(ROOT, file), "utf8");
  let m;
  while ((m = STYLE_URL_RE.exec(css))) checkRef(file, m[1], "css url");
}

// --- every page should carry the shared stylesheet and nav ------------------
for (const file of htmlFiles) {
  if (file === "raffle-qr-sheet.html") continue; // standalone print sheet
  const html = readFileSync(join(ROOT, file), "utf8");
  if (!html.includes("assets/krewe.css")) {
    problems.push(`${file}: does not link assets/krewe.css`);
  }
  if (!html.includes('class="krewe-nav"')) {
    problems.push(`${file}: missing shared navigation`);
  }
}

if (problems.length) {
  console.error(`Static check FAILED (${problems.length} problem${problems.length === 1 ? "" : "s"}):`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`Static check passed: ${checked.size} references across ${htmlFiles.length} pages all resolve.`);
