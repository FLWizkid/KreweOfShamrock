// Event Studio optional raffle / meal / online fields, and signup meal visibility.
const { test, expect } = require("@playwright/test");
const { watchPage, assertHealthy, unlockMemberHub } = require("./helpers");

async function openEventStudio(page) {
  await unlockMemberHub(page, { role: { officer: true, canManageEvents: true } });
  await page.waitForSelector('[data-hub-goto="event-studio"]');
  await page.locator('[data-hub-goto="event-studio"]').click();
  await expect(page.locator("#hubEventStudio")).toBeVisible();
  await expect(page.locator("#hubEventForm")).toBeVisible();
}

test.describe("Event Studio optional fields", () => {
  test("form includes optional raffle, meal, and online meeting controls", async ({ page }) => {
    const report = watchPage(page);
    await openEventStudio(page);

    await expect(page.locator("#hubEventType option[value='online']")).toHaveCount(1);
    await expect(page.locator("#hubEventType option[value='parade']")).toHaveCount(1);
    await expect(page.locator("#hubEventParadeBox")).toBeHidden();
    await expect(page.locator("#hubEventCollectRaffle")).toBeVisible();
    await expect(page.locator("#hubEventCollectMeals")).toBeVisible();
    await expect(page.locator("#hubEventOnline")).toBeVisible();
    await expect(page.locator("#hubEventCollectRaffle")).not.toBeChecked();
    await expect(page.locator("#hubEventCollectMeals")).not.toBeChecked();
    await expect(page.locator("#hubEventOnline")).not.toBeChecked();
    await expect(page.locator("#hubEventRaffleFields")).toBeHidden();
    await expect(page.locator("#hubEventMealFields")).toBeHidden();
    await expect(page.locator("#hubEventOnlineFields")).toBeHidden();
    await expect(page.locator("#hubEventStudio")).toContainText("Raffle tickets (optional)");
    await expect(page.locator("#hubEventStudio")).toContainText("Meal choice (optional)");
    await expect(page.locator("#hubEventStudio")).toContainText("Online meeting (optional)");
    await expect(page.locator("#hubEventLocation")).toBeVisible();
    await expect(page.locator("#hubEventMemberAddress")).toBeVisible();
    await expect(page.locator("#hubEventMembersOnly")).toBeVisible();
    await expect(page.locator("#hubEventMembersOnly")).not.toBeChecked();
    await expect(page.locator("#hubEventStudio")).toContainText("Public location teaser");
    await expect(page.locator("#hubEventStudio")).toContainText("Private / member address");
    await expect(page.locator("#hubEventStudio")).toContainText("Members only");
    await expect(page.locator("#hubEventStudio")).toContainText("Door check-in");
    await expect(page.locator("#hubEventStudio")).toContainText("RSVP QR");
    await expect(page.locator("#hubEventStart")).toBeVisible();
    await expect(page.locator("#hubEventRegCloses")).toBeVisible();
    assertHealthy(expect, report, "event studio optional fields");
  });

  test("checking raffle, meals, and online reveals those fields on a phone-sized viewport", async ({ page }) => {
    const report = watchPage(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openEventStudio(page);

    await page.locator("#hubEventCollectRaffle").check();
    await expect(page.locator("#hubEventRaffleFields")).toBeVisible();
    await expect(page.locator("#hubEventRaffleOptions")).toBeVisible();
    await expect(page.locator("#hubEventRafflePrice")).toBeVisible();
    await expect(page.locator("#hubEventRaffleEvent")).toBeVisible();

    await page.locator("#hubEventCollectMeals").check();
    await expect(page.locator("#hubEventMealFields")).toBeVisible();
    await expect(page.locator("#hubEventMealOptions")).toBeVisible();

    await page.locator("#hubEventOnline").check();
    await expect(page.locator("#hubEventOnlineFields")).toBeVisible();
    await expect(page.locator("#hubEventMeetingUrl")).toBeVisible();

    await page.locator("#hubEventType").selectOption("online");
    await expect(page.locator("#hubEventOnline")).toBeChecked();
    await expect(page.locator("#hubEventMeetingUrl")).toBeVisible();

    await page.locator("#hubEventMembersOnly").check();
    await expect(page.locator("#hubEventMembersOnly")).toBeChecked();
    await expect(page.locator("#hubEventMemberAddress")).toBeVisible();
    assertHealthy(expect, report, "event studio optional fields mobile");
  });
});

test.describe("Event Studio permanent delete", () => {
  async function openDeleteConfirm(page) {
    await page.evaluate(() => {
      document.getElementById("hubEventId").value = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
      document.getElementById("hubEventName").value = "Mistaken Mixer";
      document.getElementById("hubEventStart").value = "2026-10-01T18:00";
      var btn = document.getElementById("hubEventDelete");
      var hint = document.getElementById("hubEventDeleteHint");
      if (btn) { btn.hidden = false; btn.style.display = ""; }
      if (hint) { hint.hidden = false; hint.style.display = ""; }
    });
    await page.locator("#hubEventDelete").click();
    await expect(page.locator("#hubEventDeletePanel")).toBeVisible();
  }

  test("keeps Cancelled status and requires typed confirm before delete", async ({ page }) => {
    const report = watchPage(page);
    await openEventStudio(page);

    await expect(page.locator("#hubEventStatus option[value='cancelled']")).toHaveCount(1);
    await expect(page.locator("#hubEventDelete")).toBeHidden();
    await expect(page.locator("#hubEventDeletePanel")).toBeHidden();

    await openDeleteConfirm(page);
    await expect(page.locator("#hubEventDeletePanel")).toContainText("Mistaken Mixer");
    await expect(page.locator("#hubEventDeletePanel")).toContainText("Delete permanently");
    await expect(page.locator("#hubEventDeleteGo")).toBeDisabled();

    await page.locator("#hubEventDeleteTyped").fill("wrong name");
    await expect(page.locator("#hubEventDeleteGo")).toBeDisabled();

    await page.locator("#hubEventDeleteTyped").fill("Mistaken Mixer");
    await expect(page.locator("#hubEventDeleteGo")).toBeEnabled();

    await page.locator("#hubEventDeleteCancel").click();
    await expect(page.locator("#hubEventDeletePanel")).toBeHidden();
    await expect(page.locator("#hubEventId")).toHaveValue("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    await expect(page.locator("#hubEventMsg")).toContainText(/Delete cancelled/i);

    await openDeleteConfirm(page);
    await page.locator("#hubEventDeleteTyped").fill("Delete permanently");
    await expect(page.locator("#hubEventDeleteGo")).toBeEnabled();
    await page.locator("#hubEventDeleteGo").click();
    await expect(page.locator("#hubEventDeleteErr")).not.toHaveText("", { timeout: 8000 });
    await expect(page.locator("#hubEventDeletePanel")).toBeVisible();
    await expect(page.locator("#hubEventId")).toHaveValue("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    await expect(page.locator("#hubEventMsg")).toContainText(/Couldn't delete/i);

    assertHealthy(expect, report, "event studio permanent delete confirm");
  });

  test("delete confirm remains usable on a phone-sized viewport", async ({ page }) => {
    const report = watchPage(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openEventStudio(page);
    await openDeleteConfirm(page);
    await expect(page.locator("#hubEventDeleteSummary")).toBeVisible();
    await expect(page.locator("#hubEventDeleteTyped")).toBeVisible();
    await expect(page.locator("#hubEventDeleteCancel")).toBeVisible();
    await page.locator("#hubEventDeleteCancel").click();
    await expect(page.locator("#hubEventDeletePanel")).toBeHidden();
    assertHealthy(expect, report, "event studio permanent delete mobile");
  });
});

test("event sign-up hides meal choice until an event with meals is selected", async ({ page }) => {
  const report = watchPage(page);
  await page.goto("/event-signup.html");
  await expect(page.locator("#mealWrap")).toBeHidden();
  await page.waitForFunction(() => {
    const s = document.getElementById("event");
    const t = (s && s.options[0] && s.options[0].textContent) || "";
    return t && !/Loading events/.test(t);
  });

  await page.evaluate(() => {
    const sel = document.getElementById("event");
    const plain = document.createElement("option");
    plain.value = "plain-event";
    plain.textContent = "Plain event";
    plain.dataset.collectGuests = "1";
    plain.dataset.collectGuestNames = "1";
    plain.dataset.collectRaffle = "0";
    plain.dataset.collectMeals = "0";
    sel.appendChild(plain);

    const meals = document.createElement("option");
    meals.value = "meal-event";
    meals.textContent = "Dinner event";
    meals.dataset.collectGuests = "1";
    meals.dataset.collectGuestNames = "1";
    meals.dataset.collectRaffle = "0";
    meals.dataset.collectMeals = "1";
    meals.dataset.mealOptions = "Chicken piccata\nVegetarian pasta";
    sel.appendChild(meals);

    const raffle = document.createElement("option");
    raffle.value = "raffle-event";
    raffle.textContent = "Raffle event";
    raffle.dataset.collectGuests = "1";
    raffle.dataset.collectGuestNames = "1";
    raffle.dataset.collectRaffle = "1";
    raffle.dataset.raffleOptions = "0,1,5";
    raffle.dataset.collectMeals = "0";
    sel.appendChild(raffle);
  });

  await page.locator("#event").selectOption("plain-event");
  await page.evaluate(() => { if (typeof window.__kosSyncSignup === "function") window.__kosSyncSignup(); });
  await expect(page.locator("#mealWrap")).toBeHidden();
  await expect(page.locator("#raffleWrap")).toBeHidden();

  await page.locator("#event").selectOption("meal-event");
  await page.evaluate(() => { if (typeof window.__kosSyncSignup === "function") window.__kosSyncSignup(); });
  await expect(page.locator("#mealWrap")).toBeVisible();
  await expect(page.locator("#mealChoice option")).toContainText(["Select a meal", "Chicken piccata", "Vegetarian pasta"]);
  await expect(page.locator("#raffleWrap")).toBeHidden();

  await page.locator("#event").selectOption("raffle-event");
  await page.evaluate(() => { if (typeof window.__kosSyncSignup === "function") window.__kosSyncSignup(); });
  await expect(page.locator("#mealWrap")).toBeHidden();
  await expect(page.locator("#raffleWrap")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#event").selectOption("meal-event");
  await page.evaluate(() => { if (typeof window.__kosSyncSignup === "function") window.__kosSyncSignup(); });
  await expect(page.locator("#mealChoice")).toBeVisible();
  assertHealthy(expect, report, "signup meal visibility");
});

test("event sign-up treats members-only events as teaser-only on the public form", async ({ page }) => {
  const report = watchPage(page);
  await page.goto("/event-signup.html");
  await page.waitForFunction(() => typeof window.__kosSyncSignup === "function");

  await page.evaluate(() => {
    const sel = document.getElementById("event");
    const opt = document.createElement("option");
    opt.value = "members-only-event";
    opt.textContent = "Basket-making Happy Hour (Members home, Tampa · Members only)";
    opt.dataset.membersOnly = "1";
    opt.dataset.collectGuests = "1";
    opt.dataset.collectGuestNames = "1";
    opt.dataset.collectRaffle = "0";
    opt.dataset.collectMeals = "0";
    sel.appendChild(opt);
  });

  await page.locator("#event").selectOption("members-only-event");
  await page.evaluate(() => { if (typeof window.__kosSyncSignup === "function") window.__kosSyncSignup(); });
  await expect(page.locator("#message")).toContainText("Members only");
  await expect(page.locator("#message")).toContainText("Member Hub");
  await expect(page.locator("#rsvpForm")).not.toContainText("123 Secret Lane");
  await expect(page.locator("#submitBtn")).toContainText(/members/i);
  assertHealthy(expect, report, "signup members-only teaser");
});

test("Member Hub Events tab has a member event list for signed-in members", async ({ page }) => {
  const report = watchPage(page);
  await unlockMemberHub(page);
  await page.locator('[data-hub-tab="events"]').click();
  await expect(page.locator("[data-hub-panel='events']")).toHaveClass(/hub-on/);
  await expect(page.locator("#hubMemberEventList")).toBeVisible();
  await expect(page.locator("[data-hub-panel='events']")).toContainText("Member addresses show here after you sign in");
  assertHealthy(expect, report, "hub member events list");
});

test("public event pages never request the private member address column", async ({ request }) => {
  const signup = await (await request.get("/event-signup.html")).text();
  const home = await (await request.get("/index.html")).text();
  const parades = await (await request.get("/parades.html")).text();
  expect(signup, "event-signup must not select member_address").not.toMatch(/member_address/);
  expect(home, "index must not select member_address").not.toMatch(/member_address/);
  expect(parades, "parades.html must not select member_address").not.toMatch(/member_address/);
  expect(signup).toMatch(/v_public_events/);
  expect(home).toMatch(/v_public_events/);
  expect(parades).toMatch(/v_public_events/);
});
