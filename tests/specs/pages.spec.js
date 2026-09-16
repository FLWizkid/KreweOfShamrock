// Regression: every page loads cleanly with the shared chrome intact.
const { test, expect } = require("@playwright/test");
const { watchPage, assertHealthy, PAGES } = require("./helpers");

for (const { file, title } of PAGES) {
  test.describe(file, () => {
    test("loads without errors and shows the shared chrome", async ({ page }) => {
      const report = watchPage(page);
      await page.goto("/" + file);
      await expect(page).toHaveTitle(title);

      // Shared navigation is present and styled (stylesheet actually applied).
      const nav = page.locator("nav.krewe-nav");
      await expect(nav).toBeVisible();
      await expect(nav.locator(".brand")).toBeVisible();
      const navPosition = await nav.evaluate((el) => getComputedStyle(el).position);
      expect(navPosition, "krewe.css should style the nav (sticky)").toBe("sticky");

      // Music player: krewe.js injects the violin icon; audio starts paused.
      const musicBtn = page.locator("#kreweMusicBtn");
      await expect(musicBtn).toBeVisible();
      await expect(musicBtn.locator("svg.violin-icon")).toHaveCount(1);
      await expect(musicBtn).toHaveAttribute("aria-pressed", "false");
      expect(await page.locator("#kreweAudio").evaluate((a) => a.paused)).toBe(true);

      // The current page's nav link is highlighted.
      const active = page.locator(`.krewe-nav [data-nav="${file}"].active`);
      if (file !== "raffle.html") {
        // raffle is intentionally unlisted (QR-code entry only)
        await expect(active).toHaveCount(1);
        await expect(active.first()).toHaveAttribute("aria-current", "page");
      }

      // Give dynamic (Supabase-backed) pages a beat to run their scripts.
      await page.waitForTimeout(1200);
      assertHealthy(expect, report, file);
    });
  });
}

test("raffle-qr-sheet.html (standalone print sheet) renders", async ({ page }) => {
  const report = watchPage(page);
  await page.goto("/raffle-qr-sheet.html");
  await expect(page.locator("body")).toBeVisible();
  await page.waitForTimeout(600);
  expect(report.pageErrors).toEqual([]);
  expect(report.failedLocal).toEqual([]);
});

test("internal links across pages point at real pages", async ({ request }) => {
  // Crawl every same-origin href of each page over plain HTTP — no browser,
  // so external resources can't slow this down.
  const seen = new Set();
  for (const { file } of PAGES) {
    const html = await (await request.get("/" + file)).text();
    const hrefs = [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
    for (const href of hrefs) {
      if (!href || /^(https?:|mailto:|tel:|#|javascript:)/i.test(href)) continue;
      if (href.includes("${")) continue; // JS template literal, not markup
      const clean = href.split(/[?#]/)[0];
      if (!clean || seen.has(clean)) continue;
      seen.add(clean);
      const res = await request.get("/" + clean);
      expect(res.status(), `${file} links to missing ${href}`).toBeLessThan(400);
    }
  }
  expect(seen.size).toBeGreaterThan(10);
});

test("bylaws.html publishes the official bylaws, not a placeholder", async ({ page, request }) => {
  await page.goto("/assets/docs/bylaws.html");
  await expect(page).toHaveTitle(/Bylaws/);
  await expect(page.locator("h1")).toHaveText(/Official Bylaws of the Krewe of Shamrock/i);
  await expect(page.locator("body")).not.toContainText("Awaiting officer upload");
  await expect(page.locator("body")).not.toContainText("Email digital@ to upload");
  await expect(page.locator("#art-1")).toContainText("Article I: Official Name");
  await expect(page.locator("#art-8")).toContainText("05 June 2025");

  const pdfLink = page.getByRole("link", { name: /Open \/ download official PDF/i }).first();
  await expect(pdfLink).toBeVisible();
  await expect(pdfLink).toHaveAttribute("href", "krewe-of-shamrock-bylaws.pdf");

  const pdf = await request.get("/assets/docs/krewe-of-shamrock-bylaws.pdf");
  expect(pdf.status(), "official bylaws PDF should be committed and served").toBe(200);
  expect(pdf.headers()["content-type"] || "").toMatch(/pdf/i);

  const back = page.getByRole("link", { name: /Back to Documents/i }).first();
  await expect(back).toHaveAttribute("href", "../../members.html#docs");
});
