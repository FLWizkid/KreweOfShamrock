// Officer QR Library card (assets/kos-qr-studio.js, Phase 3 of
// QR_LIBRARY_BUILD_PLAN.md). The real card runs behind officer sign-in and
// the live database, so these tests mount the studio script on a light page
// with a stubbed Supabase client: rendering, anonymous scan counts, the
// slug auto-fill, and Show QR are covered end to end in the browser.
const { test, expect } = require("@playwright/test");

async function mountStudio(page) {
  await page.goto("/raffle-qr-sheet.html"); // loads vendor QRCode + kosQR
  await page.waitForFunction(() => window.QRCode && window.kosQR);
  await page.evaluate(() => {
    const panel = document.createElement("div");
    panel.id = "hubOfficer";
    document.body.appendChild(panel);
    const chain = {
      select() { return chain; },
      eq() { return chain; },
      gte() { return chain; },
      async order() { return { data: [] }; },
    };
    window.__kosSb = {
      rpc: async (name) => {
        if (name === "is_krewe_officer") return { data: true };
        if (name === "officer_list_qr_codes") {
          return {
            data: [{
              id: "11111111-1111-1111-1111-111111111111",
              slug: "dues2026",
              label: "Dues postcard 2026",
              target_url: "https://www.zeffy.com/en-US/ticketing/krewe-of-shamrock-membership",
              purpose: "dues",
              active: true,
              scan_count: 5,
              scans_30d: 2,
              last_scan_at: null,
              created_at: "2026-09-18T00:00:00Z",
            }],
          };
        }
        return { data: null };
      },
      from: () => chain,
    };
  });
  await page.addScriptTag({ url: "/assets/kos-qr-studio.js" });
  await expect(page.locator("#hubQrStudio")).toBeVisible({ timeout: 5000 });
}

test("QR Library card lists codes with anonymous scan counts", async ({ page }) => {
  await mountStudio(page);
  const list = page.locator("#hubQrLibList");
  await expect(list).toContainText("Dues postcard 2026");
  await expect(list).toContainText("go.html?c=dues2026");
  await expect(list).toContainText("5 scans · 2 in the last 30 days");
  await expect(list.getByRole("button", { name: "Retire" })).toBeVisible();
});

test("Show QR paints a square for the tracked go.html link", async ({ page }) => {
  await mountStudio(page);
  await page.locator("#hubQrLibList").getByRole("button", { name: /Show QR/ }).click();
  const slot = page.locator("#hubQrLibList .qr-slot");
  await expect(slot.locator("canvas")).toBeVisible();
  await expect(slot.locator("a").first()).toHaveAttribute("href", /go\.html\?c=dues2026/);
  await expect(slot.getByRole("button", { name: /Download PNG/ })).toBeVisible();
});

test("the short code auto-fills from the label until edited by hand", async ({ page }) => {
  await mountStudio(page);
  await page.fill("#hubQrLibLabel", "Tartan Ball Tickets!");
  await expect(page.locator("#hubQrLibSlug")).toHaveValue("tartan-ball-tickets");
  await page.fill("#hubQrLibSlug", "ball26");
  await page.fill("#hubQrLibLabel", "Something else");
  await expect(page.locator("#hubQrLibSlug")).toHaveValue("ball26");
});

test("saving validates the destination before calling the database", async ({ page }) => {
  await mountStudio(page);
  await page.fill("#hubQrLibLabel", "Bad link");
  await page.fill("#hubQrLibTarget", "http://insecure.example.com");
  await page.locator("#hubQrLibSave").click();
  await expect(page.locator("#hubQrLibMsg")).toContainText("must start with https:// or mailto:");
});
