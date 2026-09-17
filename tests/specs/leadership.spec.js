// Shamrock Leaders titles: questionnaire options match the directory language.
const { test, expect } = require("@playwright/test");
const { watchPage, assertHealthy } = require("./helpers");

const OFFICER_TITLES = ["President", "Vice President", "Treasurer", "Secretary"];
const COMMITTEES = [
  "Finance",
  "Bylaws",
  "Charity",
  "Technology",
  "Membership",
  "Social",
  "Float",
  "Parade",
  "Merchandise"
];

test("member login questionnaire lists Shamrock Leaders titles", async ({ page }) => {
  const report = watchPage(page);
  await page.goto("/members.html");

  await expect(page.locator("#authStage")).toBeAttached();
  await expect(page.locator("#pfRoleChoices")).toBeAttached();
  await expect(page.locator("#pfRoleChoices")).toContainText("Board Member");
  for (const title of OFFICER_TITLES) {
    await expect(page.locator("#pfRoleChoices")).toContainText(title);
  }
  for (const committee of COMMITTEES) {
    await expect(page.locator("#pfRoleChoices")).toContainText(committee);
  }

  const loginGuide = page.locator("#castleGuide");
  await expect(loginGuide).toContainText(/President|committee chair/i);

  const catalog = await page.evaluate(() => {
    const L = window.KOS_LEADERSHIP;
    const grouped = L.groupLeaders([
      { member_id: "1", first_name: "Tim", last_name: "Fitzpatrick", officer_title: "President" },
      { member_id: "2", first_name: "Patrick", last_name: "Pustay", officer_title: "Treasurer · Committee Chair of Finance" }
    ]);
    return {
      committees: L.COMMITTEES,
      officerTitles: L.OFFICER_TITLES.map((o) => o.title),
      treasurerRoles: L.rolesForTitle("Treasurer"),
      highest: L.highestMemberRole(["committee", "treasurer", "officer"]),
      officers: grouped.officers.map((x) => x.title + ": " + x.name),
      chairs: grouped.chairs.map((x) => x.name + "|" + x.committee + (x.vacant ? "|vacant" : "")),
      paradeVacant: grouped.chairs.some((x) => x.vacant && x.committee === "Parade"),
      socialVacant: grouped.chairs.some((x) => x.vacant && x.committee === "Social"),
      technologyVacant: grouped.chairs.some((x) => x.vacant && x.committee === "Technology")
    };
  });

  expect(catalog.committees).toEqual(COMMITTEES);
  expect(catalog.officerTitles).toEqual(OFFICER_TITLES);
  expect(catalog.treasurerRoles).toEqual(["treasurer", "officer"]);
  expect(catalog.highest).toBe("officer");
  expect(catalog.officers).toContain("President: Tim Fitzpatrick");
  expect(catalog.officers).toContain("Treasurer: Patrick Pustay");
  expect(catalog.chairs).toContain("Patrick Pustay|Finance");
  expect(catalog.paradeVacant).toBe(true);
  expect(catalog.socialVacant).toBe(true);
  expect(catalog.technologyVacant).toBe(true);
  expect(catalog.chairs.join(" ")).not.toMatch(/Mandy|Dayna/);

  const occupiedTech = await page.evaluate(() => {
    const grouped = window.KOS_LEADERSHIP.groupLeaders([
      { member_id: "9", first_name: "Douglas", last_name: "Tully", officer_title: "Chair of Technology" }
    ]);
    return grouped.chairs.filter((x) => x.committee === "Technology").map((x) => x.name + (x.vacant ? "|vacant" : ""));
  });
  expect(occupiedTech).toEqual(["Douglas Tully"]);
  expect(await page.evaluate(() => window.KOS_LEADERSHIP.rolesForTitle("Chair of Technology"))).toEqual(["committee"]);
  expect(await page.evaluate(() => window.KOS_LEADERSHIP.rolesForTitle("Chair of Merchandise"))).toEqual(["committee"]);
  expect(await page.evaluate(() => window.KOS_LEADERSHIP.rolesForTitle("Co-Chair of Merchandise"))).toEqual(["committee"]);
  expect(await page.evaluate(() => window.KOS_LEADERSHIP.rolesForTitle("Co Chair of Merchandise"))).toEqual(["committee"]);
  expect(await page.evaluate(() => window.KOS_LEADERSHIP.rolesForTitle("Committee Co-Chair of Merchandise"))).toEqual(["committee"]);
  const occupiedMerch = await page.evaluate(() => {
    const grouped = window.KOS_LEADERSHIP.groupLeaders([
      { member_id: "t", first_name: "Tammy", last_name: "Miller", officer_title: "Co-Chair of Merchandise" },
      { member_id: "d", first_name: "Deb", last_name: "Rutkowski", officer_title: "Co-Chair of Merchandise" }
    ]);
    return grouped.chairs.filter((x) => x.committee === "Merchandise").map((x) => x.name + (x.vacant ? "|vacant" : ""));
  });
  expect(occupiedMerch).toEqual(["Tammy Miller", "Deb Rutkowski"]);
  expect(await page.evaluate(() => window.KOS_LEADERSHIP.rolesForTitle("Board"))).toEqual(["board"]);
  const boardAlias = await page.evaluate(() => {
    const grouped = window.KOS_LEADERSHIP.groupLeaders([
      { member_id: "m", first_name: "Melissa", last_name: "Tully", officer_title: "Board" }
    ]);
    return grouped.board.map((x) => x.name);
  });
  expect(boardAlias).toContain("Melissa Tully");

  const html = await page.content();
  expect(html).not.toMatch(/Mandy Franklin|Dayna Olmsted/);

  assertHealthy(expect, report, "leadership titles");
});

const LEADER_FIXTURES = [
  { member_id: "1", first_name: "Tim", last_name: "Fitzpatrick", officer_title: "President", photo_url: "assets/img/emblem-shamrock.png" },
  { member_id: "2", first_name: "Debbie", last_name: "Fitzpatrick", officer_title: "Secretary" },
  { member_id: "3", first_name: "Patrick", last_name: "Pustay", officer_title: "Treasurer · Committee Chair of Finance" },
  { member_id: "4", first_name: "Jim", last_name: "Sugrue", officer_title: "Vice President · Committee Chair of Bylaws" },
  { member_id: "5", first_name: "Jeff", last_name: "Carney", officer_title: "Board Member · Committee Chair of Charity" },
  { member_id: "6", first_name: "Tim", last_name: "Hubbell", officer_title: "Board Member" },
  { member_id: "7", first_name: "Leslie", last_name: "Skrodzki", officer_title: "Board Member" },
  { member_id: "8", first_name: "Lisa", last_name: "Sugrue", officer_title: "Board Member · Committee Chair of Membership" },
  { member_id: "9", first_name: "Melissa", last_name: "Tully", officer_title: "Board Member" },
  { member_id: "10", first_name: "Tammy", last_name: "Miller", officer_title: "Co-Chair of Merchandise" },
  { member_id: "11", first_name: "Deb", last_name: "Rutkowski", officer_title: "Co-Chair of Merchandise" },
  { member_id: "12", first_name: "Douglas", last_name: "Tully", officer_title: "Chair of Technology" },
  { member_id: "13", first_name: "Bruce", last_name: "Weiner", officer_title: "Board Member · Committee Chair of Float" }
];

async function mountLeadersBoard(page) {
  await page.evaluate((rows) => {
    const gate = document.getElementById("authStage");
    if (gate) gate.style.display = "none";
    const content = document.getElementById("memberContent");
    if (content) content.style.display = "block";
    if (typeof window.showHubTab === "function") {
      window.showHubTab("krewe", { skipScroll: true });
    } else {
      document.querySelectorAll("[data-hub-panel]").forEach(function (el) {
        el.classList.toggle("hub-on", el.getAttribute("data-hub-panel") === "krewe");
      });
    }
    const box = document.getElementById("hubLeaders");
    const groups = window.KOS_LEADERSHIP.groupLeaders(rows);
    window.__openedProfile = null;
    window.openMemberProfile = function (id) { window.__openedProfile = id; };
    box.hidden = false;
    box.innerHTML = window.KOS_LEADERSHIP.renderLeadersHtml(groups);
    box.querySelectorAll("button[data-mid]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.openMemberProfile(btn.getAttribute("data-mid"));
      });
    });
  }, LEADER_FIXTURES);
}

test("Member Hub Shamrock Leaders board renders officers, board, and vacant chairs", async ({ page }) => {
  const report = watchPage(page);
  await page.goto("/members.html");
  await expect(page.locator("#hubLeaders")).toBeAttached();
  await page.locator("#dirGrid").waitFor({ state: "attached" });
  await page.waitForTimeout(800);
  await mountLeadersBoard(page);

  const board = page.locator("#hubLeaders");
  await expect(board).toBeVisible();
  await expect(board.locator("#leadersBoardTitle")).toHaveText("Shamrock Leaders");
  await expect(board).toContainText("Thank you for the time, care, and craic you give this krewe.");

  const officers = board.locator(".leaders-officers");
  await expect(officers.locator("h4")).toHaveText("Officers");
  await expect(officers.locator(".leaders-name")).toHaveText([
    "Tim Fitzpatrick",
    "Jim Sugrue",
    "Patrick Pustay",
    "Debbie Fitzpatrick"
  ]);
  await expect(officers).toContainText("President");
  await expect(officers).toContainText("Treasurer");
  await expect(officers.locator('button[data-mid="1"]')).toBeVisible();
  await expect(officers.locator('.leaders-av img[src="assets/img/emblem-shamrock.png"]')).toHaveCount(1);

  const boardCol = board.locator(".leaders-col-board");
  await expect(boardCol.locator("h4")).toHaveText("Board");
  await expect(boardCol.locator(".leaders-name")).toHaveText([
    "Jeff Carney",
    "Tim Hubbell",
    "Leslie Skrodzki",
    "Lisa Sugrue",
    "Melissa Tully",
    "Bruce Weiner"
  ]);
  const boardListDisplay = await boardCol.locator(".leaders-list").evaluate((el) => {
    const css = getComputedStyle(el);
    return { display: css.display, direction: css.flexDirection, columns: css.gridTemplateColumns };
  });
  expect(boardListDisplay.display).toBe("flex");
  expect(boardListDisplay.direction).toBe("column");
  expect(boardListDisplay.columns === "none" || boardListDisplay.columns === "auto").toBeTruthy();

  const chairs = board.locator(".leaders-chairs");
  await expect(chairs.locator("h4")).toHaveText("Committee Chairs");
  await expect(chairs).toContainText("Patrick Pustay");
  await expect(chairs).toContainText("Finance");
  await expect(chairs).toContainText("Douglas Tully");
  await expect(chairs).toContainText("Technology");

  const social = chairs.locator(".leaders-vacant").filter({ hasText: "Social" });
  await expect(social).toContainText("Open");
  await expect(social.locator("button")).toHaveCount(0);
  const parade = chairs.locator(".leaders-vacant").filter({ hasText: "Parade" });
  await expect(parade).toContainText("Open");
  await expect(parade.locator("button")).toHaveCount(0);
  await expect(chairs.locator(".leaders-vacant")).toHaveCount(2);

  await board.locator('button[data-mid="1"]').evaluate((btn) => {
    btn.focus();
    btn.click();
  });
  expect(await page.evaluate(() => window.__openedProfile)).toBe("1");

  await expect(board).not.toContainText("Mandy Franklin");
  await expect(board.locator(".leaders-col.leaders-board")).toHaveCount(0);

  assertHealthy(expect, report, "leaders board");
});

test("Shamrock Leaders board stacks to one column on small screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/members.html");
  await page.waitForTimeout(800);
  await mountLeadersBoard(page);
  const cols = await page.locator("#hubLeaders .leaders-grid").evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  expect(cols.split(" ").length).toBe(1);
  await expect(page.locator("#hubLeaders .leaders-chairs .leaders-vacant").filter({ hasText: "Social" })).toContainText("Open");
  await expect(page.locator("#hubLeaders .leaders-chairs .leaders-vacant").filter({ hasText: "Parade" })).toContainText("Open");
});
