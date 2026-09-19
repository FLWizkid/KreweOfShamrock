// Event Studio scheduled krewe emails: announcement, ticket reminder,
// and the registration-closing warning sent two days before close.
const { test, expect } = require("@playwright/test");
const { watchPage, assertHealthy, unlockMemberHub } = require("./helpers");

async function openEventStudio(page) {
  await unlockMemberHub(page, { role: { officer: true, canManageEvents: true } });
  await page.waitForSelector('[data-hub-goto="event-studio"]');
  await page.locator('[data-hub-goto="event-studio"]').click();
  await expect(page.locator("#hubEventStudio")).toBeVisible();
  await expect(page.locator("#hubEventForm")).toBeVisible();
}

test.describe("Event Studio scheduled krewe emails", () => {
  test("form includes the optional scheduled emails block, collapsed by default", async ({ page }) => {
    const report = watchPage(page);
    await openEventStudio(page);

    await expect(page.locator("#hubEventStudio")).toContainText("Scheduled krewe emails (optional)");
    await expect(page.locator("#hubEventEmails")).toBeVisible();
    await expect(page.locator("#hubEventEmails")).not.toBeChecked();
    await expect(page.locator("#hubEventEmailFields")).toBeHidden();
    await expect(page.locator("#hubEventEmailAnnounceFields")).toBeHidden();
    await expect(page.locator("#hubEventEmailTicketFields")).toBeHidden();
    await expect(page.locator("#hubEventEmailClosingFields")).toBeHidden();
    assertHealthy(expect, report, "event scheduled emails collapsed");
  });

  test("checking the master box reveals the three emails and their fields on a phone-sized viewport", async ({ page }) => {
    const report = watchPage(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openEventStudio(page);

    await page.locator("#hubEventEmails").check();
    await expect(page.locator("#hubEventEmailFields")).toBeVisible();
    await expect(page.locator("#hubEventEmailAnnounce")).toBeVisible();
    await expect(page.locator("#hubEventEmailTicket")).toBeVisible();
    await expect(page.locator("#hubEventEmailClosing")).toBeVisible();
    await expect(page.locator("#hubEventEmailAnnounceFields")).toBeHidden();
    await expect(page.locator("#hubEventEmailTicketFields")).toBeHidden();
    await expect(page.locator("#hubEventEmailClosingFields")).toBeHidden();

    await page.locator("#hubEventEmailAnnounce").check();
    await expect(page.locator("#hubEventEmailAnnounceFields")).toBeVisible();
    await expect(page.locator("#hubEventEmailAnnounceAt")).toBeVisible();
    await expect(page.locator("#hubEventEmailAnnounceSubject")).toBeVisible();

    await page.locator("#hubEventEmailTicket").check();
    await expect(page.locator("#hubEventEmailTicketFields")).toBeVisible();
    await expect(page.locator("#hubEventEmailTicketAt")).toBeVisible();
    await expect(page.locator("#hubEventEmailTicketFields")).toContainText("already paid");

    await page.locator("#hubEventEmailClosing").check();
    await expect(page.locator("#hubEventEmailClosingFields")).toBeVisible();
    await expect(page.locator("#hubEventEmailClosingWhen")).toContainText("two days before");
    await expect(page.locator("#hubEventEmailClosingFields")).toContainText("already signed up");

    // Setting the registration close date updates the computed send time
    // (two days earlier).
    await page.locator("#hubEventRegCloses").fill("2026-12-01T18:00");
    await page.locator("#hubEventRegCloses").dispatchEvent("input");
    await expect(page.locator("#hubEventEmailClosingWhen")).toContainText("Nov 29, 2026");

    // Unchecking the master box hides everything again.
    await page.locator("#hubEventEmails").uncheck();
    await expect(page.locator("#hubEventEmailFields")).toBeHidden();
    assertHealthy(expect, report, "event scheduled emails reveal");
  });

  test("save validates the email schedule before calling the server", async ({ page }) => {
    const report = watchPage(page);
    await openEventStudio(page);

    await page.locator("#hubEventName").fill("Emerald Gala");
    await page.locator("#hubEventStart").fill("2027-03-05T19:00");

    // Announcement enabled without a send time blocks the save.
    await page.locator("#hubEventEmails").check();
    await page.locator("#hubEventEmailAnnounce").check();
    await page.locator("#hubEventSave").click();
    await expect(page.locator("#hubEventMsg")).toContainText("send date/time for the announcement email");

    // Ticket reminder enabled without a send time blocks the save.
    await page.locator("#hubEventEmailAnnounceAt").fill("2027-01-05T09:00");
    await page.locator("#hubEventEmailTicket").check();
    await page.locator("#hubEventSave").click();
    await expect(page.locator("#hubEventMsg")).toContainText("send date/time for the ticket reminder email");

    // Closing warning requires the registration close date.
    await page.locator("#hubEventEmailTicketAt").fill("2027-02-05T09:00");
    await page.locator("#hubEventEmailClosing").check();
    await page.locator("#hubEventSave").click();
    await expect(page.locator("#hubEventMsg")).toContainText("Close registrations on");

    assertHealthy(expect, report, "event scheduled emails validation");
  });
});
