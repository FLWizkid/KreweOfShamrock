// Parade season: Event Studio parade + meeting link, Hub status, public cards, .ics.
const { test, expect } = require("@playwright/test");
const { watchPage, assertHealthy, unlockMemberHub } = require("./helpers");

async function openEventStudio(page) {
  await unlockMemberHub(page, { role: { officer: true, canManageEvents: true } });
  await page.waitForSelector('[data-hub-goto="event-studio"]');
  await page.locator('[data-hub-goto="event-studio"]').click();
  await expect(page.locator("#hubEventStudio")).toBeVisible();
  await expect(page.locator("#hubEventForm")).toBeVisible();
}

test.describe("Event Studio parade season", () => {
  test("Parade type reveals meeting link and create-pair fields", async ({ page }) => {
    const report = watchPage(page);
    await openEventStudio(page);

    await expect(page.locator("#hubEventParadeBox")).toBeHidden();
    await page.locator("#hubEventType").selectOption("parade");
    await expect(page.locator("#hubEventParadeBox")).toBeVisible();
    await expect(page.locator("#hubEventLinkedMeeting")).toBeVisible();
    await expect(page.locator("#hubEventStudio")).toContainText("Mandatory meeting");
    await expect(page.locator("#hubEventStudio")).toContainText("Create a new mandatory meeting");
    await expect(page.locator("#hubEventCreateMeetingFields")).toBeHidden();
    await expect(page.locator("#hubEventMembersOnly")).toBeChecked();

    await page.locator("#hubEventCreateMeeting").check();
    await expect(page.locator("#hubEventCreateMeetingFields")).toBeVisible();
    await expect(page.locator("#hubEventCreateMeetingName")).toBeVisible();
    await expect(page.locator("#hubEventCreateMeetingStart")).toBeVisible();
    await expect(page.locator("#hubEventCreateMeetingMandatory")).toBeChecked();
    await expect(page.locator("#hubEventRoleNotes")).toBeVisible();
    await expect(page.locator("#hubEventStudio")).toContainText("Role notes");
    await expect(page.locator("#hubEventStudio")).toContainText("Muster / step-off start");
    await expect(page.locator("#hubEventStudio")).toContainText("parades.html");
    await expect(page.locator("#hubEventStudio")).toContainText("no public march RSVP");
    assertHealthy(expect, report, "event studio parade fields");
  });

  test("parade meeting fields remain usable on a phone-sized viewport", async ({ page }) => {
    const report = watchPage(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openEventStudio(page);
    await page.locator("#hubEventType").selectOption("parade");
    await expect(page.locator("#hubEventLinkedMeeting")).toBeVisible();
    await page.locator("#hubEventCreateMeeting").check();
    await expect(page.locator("#hubEventCreateMeetingName")).toBeVisible();
    assertHealthy(expect, report, "event studio parade fields mobile");
  });
});

test("Member Hub Events tab shows parade season status", async ({ page }) => {
  const report = watchPage(page);
  await unlockMemberHub(page);
  await page.locator('[data-hub-tab="events"]').click();
  await expect(page.locator("[data-hub-panel='events']")).toHaveClass(/hub-on/);
  await expect(page.locator("#hubParadeSeasonList")).toBeVisible();
  await expect(page.locator("#hubParadeSeasonEvents")).toContainText("Parade season");
  await page.waitForFunction(() => typeof window.__kosRenderParadeSeason === "function");
  await page.evaluate(() => {
    window.__kosParadeSeasonLocked = true;
    window.__kosRenderParadeSeason([{
      id: "parade-1",
      name: "Gasparilla Parade of Pirates",
      start_time: "2027-01-30T19:00:00.000Z",
      location: "Bayshore Boulevard, Tampa",
      members_only: true,
      parade_rsvpd: false,
      parade_checked_in: false,
      eligible: false,
      soft_gate_checkin: true,
      notes: "March the route; hospitality at the float.",
      meeting: {
        id: "meet-1",
        name: "Gasparilla briefing",
        start_time: "2027-01-28T23:00:00.000Z",
        location: "Members home, Tampa",
        rsvpd: false,
        checked_in: false
      }
    }]);
  });

  await expect(page.locator("#hubParadeSeasonList")).toContainText("Meeting not RSVP’d");
  await expect(page.locator("#hubParadeSeasonList")).toContainText("Not yet eligible");
  await expect(page.locator("#hubParadeSeasonList")).toContainText("Door Check-In");
  await expect(page.locator("#hubParadeSeasonList")).toContainText("Add parade to calendar");
  await expect(page.locator("#hubParadeSeasonList")).toContainText("Role notes");
  await expect(page.locator("#hubParadeSeasonList")).toContainText("hospitality");
  await expect(page.locator("#hubParadeSeasonList")).not.toContainText("123 Secret Staging");
  assertHealthy(expect, report, "hub parade season status");
});

test("Member desk includes the parade season card", async ({ page }) => {
  const report = watchPage(page);
  await unlockMemberHub(page);
  await page.locator('[data-hub-tab="parade"]').click();
  await expect(page.locator("#hubParadeSeasonCard")).toBeVisible();
  await expect(page.locator("#hubParadeSeasonDeskList")).toBeVisible();
  await expect(page.locator("#deskSeason")).toContainText("Parade season");
  assertHealthy(expect, report, "member desk parade season");
});

test("parades.html is a recruiting page with Join CTAs and no public march RSVP", async ({ page }) => {
  const report = watchPage(page);
  await page.goto("/parades.html");
  await expect(page.locator("#featured-parade")).toBeVisible();
  await expect(page.locator("#featured-parade")).toContainText("Children's Gasparilla");
  await expect(page.locator("#featured-parade")).toContainText("Parade of Pirates");
  await expect(page.locator("#featured-parade")).toContainText("January 23, 2027");
  await expect(page.locator("#featured-parade")).toContainText("January 30, 2027");
  await expect(page.locator("#why-march")).toBeVisible();
  await expect(page.locator("#why-march")).toContainText("Why March With Shamrock");
  await expect(page.locator("body")).toContainText("See the season");
  await expect(page.locator("#parade-season")).toBeVisible();
  await expect(page.locator("#paradeStaticGrid")).toBeVisible();
  await expect(page.locator("#ikcSeasonTable")).toBeVisible();
  await expect(page.locator("#ikcSeasonTable tr.ours")).toHaveCount(5);
  await expect(page.locator("body")).toContainText("Safety & Security");
  await expect(page.locator("body")).toContainText("Castle of Shenanigans");
  await expect(page.locator("#paradeStaticGrid")).toContainText("Join");
  await expect(page.locator("#paradeStaticGrid")).toContainText("Member Login");
  await expect(page.locator("#paradeStaticGrid")).not.toContainText(/Sign me up|Buy Tickets|march RSVP/i);
  await expect(page.locator("body")).not.toContainText("member_address");
  await expect(page.locator("body")).not.toContainText(/staging on (4th|5th|Howard)/i);
  assertHealthy(expect, report, "public parades marketing");
});

test("calendar helper writes a teaser-only .ics", async ({ page }) => {
  const report = watchPage(page);
  await page.goto("/event-signup.html");
  await page.waitForFunction(() => window.kosCalendar && typeof window.kosCalendar.buildIcs === "function");
  const ics = await page.evaluate(() => window.kosCalendar.buildIcs({
    id: "evt-1",
    name: "Gasparilla briefing",
    start_time: "2027-01-28T23:00:00.000Z",
    end_time: "2027-01-29T00:00:00.000Z",
    location: "Members home, Tampa",
    member_address: "123 Secret Staging Lane",
    description: "Briefing for the pirate parade."
  }));
  expect(ics).toMatch(/BEGIN:VCALENDAR/);
  expect(ics).toMatch(/SUMMARY:Gasparilla briefing/);
  expect(ics).toMatch(/LOCATION:Members home\\, Tampa/);
  expect(ics).toMatch(/Member Hub/);
  expect(ics).not.toMatch(/123 Secret Staging/);
  expect(ics).not.toMatch(/member_address/);
  assertHealthy(expect, report, "ics teaser only");
});
