// Member Hub Quick Links, Documents card, and governing-doc pills.
const { test, expect } = require("@playwright/test");
const { watchPage, assertHealthy, unlockMemberHub } = require("./helpers");

const DOC_PAGES = [
  {
    name: "Bylaws",
    href: "/assets/docs/bylaws.html",
    title: /Bylaws/,
    heading: /Official Bylaws of the Krewe of Shamrock/i
  },
  {
    name: "Code of Conduct",
    href: "/assets/docs/code-of-conduct.html",
    title: /Code of Conduct/,
    heading: /Official Code of Conduct/i
  },
  {
    name: "Parade Rules",
    href: "/assets/docs/parade-rules.html",
    title: /Parade Rules/,
    heading: /Parade Rules/i
  }
];

async function waitForQuickLinks(page) {
  await page.waitForSelector('[data-hub-goto="directory"]');
}

test.describe("Member Hub Quick Links", () => {
  test("My Krewe quick link opens the member directory UI without console errors", async ({ page }) => {
    const report = watchPage(page);
    await unlockMemberHub(page);
    await waitForQuickLinks(page);

    await page.locator('[data-hub-goto="directory"]').click();

    await expect(page.locator("[data-hub-panel='krewe']")).toHaveClass(/hub-on/);
    await expect(page.locator("#hubMemberDirectory")).toBeVisible();
    await expect(page.locator("#hubMemberDirectory h2")).toHaveText(/My Krewe/i);
    await expect(page.locator("#dirSearch")).toBeVisible();
    assertHealthy(expect, report, "directory quick link");
  });

  test("Event Studio Quick Link is hidden without permission", async ({ page }) => {
    const report = watchPage(page);
    await unlockMemberHub(page);
    await waitForQuickLinks(page);
    await expect(page.locator('[data-hub-goto="event-studio"]')).toHaveCount(0);
    assertHealthy(expect, report, "event studio hidden");
  });

  test("Event Studio Quick Link opens Event Studio when permitted", async ({ page }) => {
    const report = watchPage(page);
    await unlockMemberHub(page, { role: { officer: true, canManageEvents: true } });
    await waitForQuickLinks(page);

    const studioBtn = page.locator('[data-hub-goto="event-studio"]');
    await expect(studioBtn).toBeVisible();
    await studioBtn.click();

    await expect(page.locator("[data-hub-panel='officer']")).toHaveClass(/hub-on/);
    await expect(page.locator("#hubEventStudio")).toBeVisible();
    await expect(page.locator("#hubEventStudio h2")).toHaveText(/Event Studio/i);
    assertHealthy(expect, report, "event studio quick link");
  });

  test("Open Documents card and #docs show Documents with Bylaws, Code of Conduct, Parade Rules", async ({ page }) => {
    const report = watchPage(page);
    await unlockMemberHub(page);
    await waitForQuickLinks(page);

    await page.locator('[data-hub-goto="docs"]').click();

    await expect(page.locator("[data-hub-panel='parade']")).toHaveClass(/hub-on/);
    await expect(page.locator("#docs")).toBeVisible();
    await expect(page.locator("#docs h2")).toHaveText(/^Documents$/i);
    await expect(page.locator("#docs")).toContainText("Governing documents");
    await expect(page.locator('#docs a[href="/assets/docs/bylaws.html"]')).toBeVisible();
    await expect(page.locator('#docs a[href="/assets/docs/code-of-conduct.html"]')).toBeVisible();
    await expect(page.locator('#docs a[href="/assets/docs/parade-rules.html"]')).toBeVisible();
    assertHealthy(expect, report, "open documents card");
  });

  test("#docs hash reveals the Documents card", async ({ page }) => {
    const report = watchPage(page);
    await unlockMemberHub(page);
    await waitForQuickLinks(page);
    await page.evaluate(() => { location.hash = "docs"; });
    await expect(page.locator("#docs")).toBeVisible();
    await expect(page.locator("#docs h2")).toHaveText(/^Documents$/i);
    assertHealthy(expect, report, "#docs hash");
  });

  test("All Documents link lands on the Documents card", async ({ page }) => {
    const report = watchPage(page);
    await unlockMemberHub(page);
    await waitForQuickLinks(page);

    await page.locator("#docsHome a[href='#docs']", { hasText: "All Documents" }).click();

    await expect(page.locator("#docs")).toBeVisible();
    await expect(page.locator("#docs h2")).toHaveText(/^Documents$/i);
    await expect(page.locator('#docs a[href="/assets/docs/bylaws.html"]')).toBeVisible();
    assertHealthy(expect, report, "all documents link");
  });

  test("underlined Documents links in My Krewe reveal the Documents card", async ({ page }) => {
    const report = watchPage(page);
    await unlockMemberHub(page);
    await waitForQuickLinks(page);

    await page.locator('[data-hub-tab="krewe"]').click();
    await expect(page.locator("#orientationCard")).toBeVisible();
    await page.locator("#orientationCard a[href='#docs']").click();

    await expect(page.locator("#docs")).toBeVisible();
    await expect(page.locator("#docs h2")).toHaveText(/^Documents$/i);
    assertHealthy(expect, report, "orientation documents link");
  });
});

for (const doc of DOC_PAGES) {
  test(`Quick Links ${doc.name} pill opens a published page, not a placeholder`, async ({ page, request }) => {
    const report = watchPage(page);
    const res = await request.get(doc.href);
    expect(res.status(), `${doc.name} should return 200`).toBe(200);

    await unlockMemberHub(page);
    await waitForQuickLinks(page);
    await page.locator(`#docsHome .hub-docs a[href="${doc.href}"]`).click();
    await expect(page).toHaveURL(new RegExp(doc.href.replace(/\./g, "\\.") + "$"));
    await expect(page).toHaveTitle(doc.title);
    await expect(page.locator("h1")).toHaveText(doc.heading);
    await expect(page.locator("body")).not.toContainText("Awaiting officer upload");
    await expect(page.locator("body")).not.toContainText("Email digital@ to upload");
    assertHealthy(expect, report, `${doc.name} pill`);
  });

  test(`Documents card ${doc.name} pill opens a published page`, async ({ page }) => {
    const report = watchPage(page);
    await unlockMemberHub(page);
    await waitForQuickLinks(page);
    await page.locator('[data-hub-goto="docs"]').click();
    await expect(page.locator("#docs")).toBeVisible();
    await page.locator(`#docs .hub-docs a[href="${doc.href}"]`).click();
    await expect(page).toHaveURL(new RegExp(doc.href.replace(/\./g, "\\.") + "$"));
    await expect(page.locator("body")).not.toContainText("Awaiting officer upload");
    assertHealthy(expect, report, `docs card ${doc.name}`);
  });
}

test("waiver All Documents markup uses #docs", async ({ request }) => {
  const html = await (await request.get("/members.html")).text();
  expect(html).toMatch(/href="#docs">All Documents</);
  expect(html).not.toMatch(/href="members\.html#docs">All Documents</);
});

test("My Krewe governing pills use root-absolute published doc paths", async ({ page }) => {
  const report = watchPage(page);
  await unlockMemberHub(page);
  await waitForQuickLinks(page);
  await page.locator('[data-hub-tab="krewe"]').click();
  await expect(page.locator("[data-hub-panel='krewe'] .hub-docs a[href='/assets/docs/bylaws.html']")).toBeVisible();
  await expect(page.locator("[data-hub-panel='krewe'] .hub-docs a[href='/assets/docs/code-of-conduct.html']")).toBeVisible();
  await expect(page.locator("[data-hub-panel='krewe'] .hub-docs a[href='/assets/docs/parade-rules.html']")).toBeVisible();
  assertHealthy(expect, report, "krewe governing pills");
});
