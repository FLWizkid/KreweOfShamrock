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
