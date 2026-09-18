// Member Hub home-screen install path: manifest, icons, service worker,
// Apple standalone tags, hub how-to card, and no public homepage banner.
const { test, expect } = require("@playwright/test");
const { watchPage, assertHealthy, unlockMemberHub } = require("./helpers");

test.describe("Member Hub home-screen install", () => {
  test("manifest is valid: Shamrock, members.html, standalone, icons exist", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status(), "manifest should be served").toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toBe("Shamrock");
    expect(manifest.short_name).toBe("Shamrock");
    expect(String(manifest.start_url)).toMatch(/members\.html/);
    expect(manifest.display).toBe("standalone");
    const sizes = (manifest.icons || []).map((icon) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    for (const icon of manifest.icons) {
      const href = icon.src.startsWith("/") ? icon.src : "/" + icon.src;
      const img = await request.get(href);
      expect(img.status(), `${href} should exist`).toBe(200);
      expect(img.headers()["content-type"] || "").toMatch(/png/i);
    }
  });

  test("members.html has Apple standalone tags, crest touch icon, and a fetch-only service worker", async ({ page, request }) => {
    const report = watchPage(page);
    await page.goto("/members.html");

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(manifestHref).toMatch(/manifest\.webmanifest/);
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
    await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "Shamrock");
    const touch = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
    expect(touch).toMatch(/hub-apple-touch-icon\.png/);
    const touchRes = await request.get("/" + touch.replace(/^\.\//, "").replace(/^\//, ""));
    expect(touchRes.status()).toBe(200);

    const sw = await request.get("/hub-sw.js");
    expect(sw.status()).toBe(200);
    const swText = await sw.text();
    expect(swText).toMatch(/addEventListener\(\s*["']fetch["']/);
    expect(swText).not.toMatch(/caches\.open/);
    expect(swText).not.toMatch(/cache\.add(?:All)?/);

    const registered = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const ready = await navigator.serviceWorker.ready;
      return !!(ready && ready.active);
    });
    expect(registered, "tiny service worker should activate on the hub").toBe(true);
    assertHealthy(expect, report, "members install tags");
  });

  test("signed-in hub Home shows the iPhone Add to Home Screen how-to card", async ({ page }) => {
    const report = watchPage(page);
    await unlockMemberHub(page);
    const card = page.locator("#hubInstallCard");
    await expect(card).toBeVisible();
    await expect(card.locator("h3")).toHaveText(/Add Shamrock to your Home Screen/i);
    await expect(card).toContainText("Safari");
    await expect(card).toContainText("Share");
    await expect(card).toContainText("Add to Home Screen");
    await expect(card).toContainText("Chrome");
    await expect(card).toContainText("Zeffy");
    await expect(card).toContainText("not an App Store or Play Store app");
    await expect(page.locator("#hubHome")).toContainText("This is the Craic Cup");
    assertHealthy(expect, report, "hub install card");
  });

  test("public homepage does not grow an install banner", async ({ page, request }) => {
    const report = watchPage(page);
    const html = await (await request.get("/index.html")).text();
    expect(html).not.toMatch(/rel=["']manifest["']/i);
    expect(html).not.toMatch(/apple-mobile-web-app-capable/i);
    expect(html).not.toMatch(/Add to Home Screen/i);
    expect(html).not.toMatch(/beforeinstallprompt/i);
    expect(html).not.toMatch(/hub-install\.js/);
    expect(html).not.toMatch(/hub-sw\.js/);

    await page.goto("/index.html");
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
    await expect(page.locator("#hubInstallCard")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("Add Shamrock to your Home Screen");
    await expect(page.locator("body")).not.toContainText("Add to Home Screen");
    assertHealthy(expect, report, "homepage has no install banner");
  });
});
