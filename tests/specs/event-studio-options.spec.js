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
    assertHealthy(expect, report, "event studio optional fields mobile");
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
