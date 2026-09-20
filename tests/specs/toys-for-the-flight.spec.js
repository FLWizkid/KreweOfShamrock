// Toys for the Flight Christmas campaign: shareable page + Service & Charity promo.
const { test, expect } = require("@playwright/test");
const { watchPage, assertHealthy } = require("./helpers");

const LIFELINE =
  "https://www.hopkinsmedicine.org/all-childrens-hospital/services/transport-team";

test("volunteer.html promotes Toys for the Flight and links to LifeLine", async ({ page }) => {
  const report = watchPage(page);
  await page.goto("/volunteer.html");

  const promo = page.locator("#toys-for-the-flight");
  await expect(promo).toBeVisible();
  await expect(promo.getByRole("heading", { name: "Toys for the Flight" })).toBeVisible();
  await expect(promo.getByRole("img", { name: /Toys for the Flight/i })).toHaveAttribute(
    "src",
    /toys-for-the-flight-volunteer-card\.jpg/
  );
  await expect(promo.getByRole("link", { name: /See the drive/i })).toHaveAttribute(
    "href",
    "toys-for-the-flight.html"
  );
  await expect(promo.getByRole("link", { name: /Learn about LifeLine/i })).toHaveAttribute(
    "href",
    LIFELINE
  );

  await promo.getByRole("link", { name: /See the drive/i }).click();
  await expect(page).toHaveURL(/toys-for-the-flight\.html$/);
  await expect(page).toHaveTitle(/Toys for the Flight/);
  assertHealthy(expect, report, "volunteer toys promo");
});

test("toys-for-the-flight.html is shareable and points to LifeLine", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const report = watchPage(page);
  await page.goto("/toys-for-the-flight.html");

  await expect(page.getByRole("heading", { level: 1, name: "Toys for the Flight" })).toBeVisible();
  await expect(page.locator("body")).toContainText("LifeLine");
  await expect(page.locator("body")).toContainText("Santa Fest");
  await expect(page.locator("body")).toContainText("New only");
  await expect(page.locator("body")).toContainText("Loud electronics");

  const lifeline = page.locator("#lifelineCta");
  await expect(lifeline).toHaveAttribute("href", LIFELINE);
  await expect(lifeline).toHaveAttribute("target", "_blank");

  await expect(page.locator("#shareCampaignBtn")).toBeVisible();
  await expect(page.locator("#shareUrl")).toContainText("toys-for-the-flight.html");

  await page.locator("#shareCampaignBtn").click();
  await expect(page.locator("#shareStatus")).not.toHaveText("");

  await expect(page.getByRole("img", { name: /campaign banner/i })).toBeVisible();
  await expect(page.getByRole("img", { name: /Square campaign art/i })).toBeVisible();
  await expect(page.locator(".toys-ad-hero img")).toHaveAttribute("src", /toys-for-the-flight-ad\.jpg/);
  assertHealthy(expect, report, "toys campaign page");
});
