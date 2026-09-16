// Regression: interactive behavior — navigation dropdowns, the mobile
// drawer, and the music player toggle.
const { test, expect } = require("@playwright/test");
const { watchPage, assertHealthy } = require("./helpers");

test.describe("desktop navigation", () => {
  test("dropdown opens on click, closes on Escape and outside click", async ({ page }) => {
    const report = watchPage(page);
    await page.goto("/index.html");

    const events = page.locator(".nav-group", { has: page.getByRole("button", { name: /Events/ }) }).first();
    const btn = events.locator(".nav-group-btn");
    await btn.click();
    await expect(events).toHaveClass(/open/);
    await expect(btn).toHaveAttribute("aria-expanded", "true");
    await expect(events.getByRole("link", { name: "Parades" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(events).not.toHaveClass(/open/);
    await expect(btn).toHaveAttribute("aria-expanded", "false");

    // opening one group then clicking another closes the first
    await btn.click();
    const about = page.locator(".nav-group", { has: page.getByRole("button", { name: /About/ }) }).first();
    await about.locator(".nav-group-btn").click();
    await expect(about).toHaveClass(/open/);
    await expect(events).not.toHaveClass(/open/);

    await page.locator("h1").click(); // outside click closes
    await expect(about).not.toHaveClass(/open/);
    assertHealthy(expect, report, "desktop nav");
  });

  test("dropdown links navigate to the right page", async ({ page }) => {
    await page.goto("/index.html");
    await page.getByRole("button", { name: /Get Involved/ }).click();
    await page.getByRole("link", { name: "Volunteer" }).click();
    await expect(page).toHaveURL(/volunteer\.html$/);
    await page.getByRole("link", { name: "Member Login" }).click();
    await expect(page).toHaveURL(/members\.html$/);
    await expect(page).toHaveTitle(/Members/);
  });
});

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 400, height: 800 } });

  test("hamburger opens the drawer; backdrop closes it", async ({ page }) => {
    const report = watchPage(page);
    await page.goto("/index.html");

    const nav = page.locator("nav.krewe-nav");
    const toggle = page.locator("#kreweNavToggle");
    await expect(toggle).toBeVisible();
    await expect(page.locator("#kreweMenu")).not.toBeInViewport();

    await toggle.click();
    await expect(nav).toHaveClass(/open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#kreweMenu")).toBeVisible();
    expect(await page.evaluate(() => document.body.classList.contains("nav-open"))).toBe(true);

    await page.locator(".nav-backdrop").click({ position: { x: 5, y: 400 }, force: true });
    await expect(nav).not.toHaveClass(/open/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    assertHealthy(expect, report, "mobile nav");
  });

  test("choosing a link closes the drawer and navigates", async ({ page }) => {
    await page.goto("/index.html");
    await page.locator("#kreweNavToggle").click();
    await page.locator("#kreweMenu").getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL(/index\.html$/);
    await expect(page.locator("nav.krewe-nav")).not.toHaveClass(/open/);
  });
});

test.describe("music player", () => {
  test("toggle keeps aria state consistent with the audio element", async ({ page }) => {
    const report = watchPage(page);
    await page.goto("/index.html");
    const btn = page.locator("#kreweMusicBtn");
    const audio = page.locator("#kreweAudio");

    await expect(btn).toHaveAttribute("aria-pressed", "false");
    await btn.click();
    // Playback may be denied in some environments; the invariant is that the
    // UI state always matches the element state, in both outcomes.
    await page.waitForTimeout(1000);
    const paused = await audio.evaluate((a) => a.paused);
    await expect(btn).toHaveAttribute("aria-pressed", paused ? "false" : "true");

    if (!paused) {
      expect(await audio.evaluate((a) => a.loop)).toBe(true);
      expect(await audio.evaluate((a) => Math.round(a.volume * 100))).toBe(18);
      await btn.click();
      await expect(btn).toHaveAttribute("aria-pressed", "false");
      expect(await audio.evaluate((a) => a.paused)).toBe(true);
    }
    assertHealthy(expect, report, "music player");
  });
});
