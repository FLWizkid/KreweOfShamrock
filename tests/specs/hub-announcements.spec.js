// Krewe Tidings announcements card and its full archive.
// The suite runs offline, so announcements are injected through the
// __kosHubSetAnnouncements test fixture (mirrors __kosHubSetRole); the
// archive's live fetch then falls back to the injected list gracefully.
const { test, expect } = require("@playwright/test");
const { watchPage, assertHealthy, unlockMemberHub } = require("./helpers");

const ANNOUNCEMENTS = [
  {
    id: "a1",
    subject: "Tartan Ball tickets are live",
    body_html: "<p>Buy your tickets and bring your friends.</p><p>Higgins Hall, October 24.</p>",
    created_at: "2026-09-18T21:00:00Z",
    sender_name: "Melissa Tully"
  },
  {
    id: "a2",
    subject: "Basket Social moved to October 3",
    body_html: "<p>New date! RSVP details are in your krewe email.</p>",
    created_at: "2026-09-10T18:30:00Z",
    sender_name: "Melissa Tully"
  },
  {
    id: "a3",
    subject: "Volunteer call: sign-in table and raffles",
    body_html: "<p>Reply if you can help before or during the ball.</p>",
    created_at: "2026-09-01T15:00:00Z",
    sender_name: null
  }
];

async function openHomeWithAnnouncements(page) {
  await unlockMemberHub(page);
  await page.waitForSelector('[data-hub-goto="directory"]');
  await page.evaluate((list) => window.__kosHubSetAnnouncements(list), ANNOUNCEMENTS);
}

test.describe("Krewe Tidings announcements", () => {
  test("card shows the latest announcement with older ones collapsed", async ({ page }) => {
    const report = watchPage(page);
    await openHomeWithAnnouncements(page);

    const card = page.locator(".hub-board");
    await expect(card).toBeVisible();
    await expect(card.locator("h3")).toHaveText(/Krewe Tidings/);
    await expect(card).toContainText("News from the Board");
    await expect(card.locator("h4").first()).toHaveText("Tartan Ball tickets are live");
    await expect(card).toContainText("from Melissa Tully");
    await expect(card.locator("details.hub-board-old summary").first())
      .toContainText("Basket Social moved to October 3");
    assertHealthy(expect, report, "board card");
  });

  test("See all announcements reveals the full archive (offline fallback)", async ({ page }) => {
    const report = watchPage(page);
    await openHomeWithAnnouncements(page);

    const btn = page.locator("#hubBoardArchiveBtn");
    await expect(btn).toBeVisible();
    await btn.click();

    const archive = page.locator("#hubBoardArchive");
    await expect(archive).toBeVisible();
    // Offline, the live archive call cannot succeed; the injected
    // announcements must still all be listed, without console errors.
    await expect(archive).toContainText("Tartan Ball tickets are live");
    await expect(archive).toContainText("Basket Social moved to October 3");
    await expect(archive).toContainText("Volunteer call: sign-in table and raffles");
    await expect(btn).toBeHidden();
    assertHealthy(expect, report, "board archive");
  });

  test("card stays absent when there are no announcements", async ({ page }) => {
    const report = watchPage(page);
    await unlockMemberHub(page);
    await page.waitForSelector('[data-hub-goto="directory"]');
    await page.evaluate(() => window.__kosHubSetAnnouncements([]));
    await expect(page.locator(".hub-board")).toHaveCount(0);
    assertHealthy(expect, report, "no announcements");
  });
});
