// Quick QR picker: one dropdown holding events (auto-filled from the events
// table), tracked library codes, and handy links. Mounts the real studio
// script against a stubbed database client, as the other QR specs do.
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
      async order() {
        return {
          data: [{
            id: "33333333-3333-3333-3333-333333333333",
            name: "Tartan Ball",
            start_time: "2026-10-24T22:00:00Z",
            event_type: "fundraiser",
            status: "published",
          }, {
            id: "44444444-4444-4444-4444-444444444444",
            name: "Cancelled thing",
            start_time: "2026-10-25T22:00:00Z",
            event_type: "social",
            status: "cancelled",
          }],
        };
      },
    };
    window.__kosSb = {
      rpc: async (name) => {
        if (name === "is_krewe_officer") return { data: true };
        if (name === "officer_enable_checkin") return { data: "code-abc123" };
        if (name === "officer_list_qr_codes") {
          return {
            data: [{
              id: "11111111-1111-1111-1111-111111111111",
              slug: "dues2026",
              label: "Dues postcard 2026",
              target_url: "https://example.com/dues",
              purpose: "dues",
              active: true,
              scan_count: 0,
              scans_30d: 0,
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
  // Events load asynchronously after the card renders.
  await expect(page.locator("#hubQrPick option[value^='ev:']")).toHaveCount(1);
}

test("the picker lists events, library codes, and handy links in one dropdown", async ({ page }) => {
  await mountStudio(page);
  const sel = page.locator("#hubQrPick");
  await expect(sel.locator("optgroup[label='Events (added automatically)'] option")).toHaveText([/Tartan Ball/]);
  await expect(sel.locator("option")).not.toContainText(["Cancelled thing"]);
  await expect(sel.locator("optgroup[label='Tracked library codes'] option")).toHaveText([/Dues postcard 2026/]);
  await expect(sel.locator("optgroup[label='Handy links'] option").first()).toHaveText(/Pay member dues/);
});

test("picking a handy link paints its square immediately", async ({ page }) => {
  await mountStudio(page);
  await page.selectOption("#hubQrPick", "link:0");
  const slot = page.locator("#hubQrPickSlot");
  await expect(slot.locator("canvas")).toBeVisible();
  await expect(slot).toContainText("Pay member dues");
});

test("picking an event offers RSVP, door check-in, count, and library save", async ({ page }) => {
  await mountStudio(page);
  await page.selectOption("#hubQrPick", "ev:33333333-3333-3333-3333-333333333333");
  const actions = page.locator("#hubQrPickActions");
  await expect(actions.getByRole("button", { name: /RSVP QR/ })).toBeVisible();
  await expect(actions.getByRole("button", { name: /Door check-in QR/ })).toBeVisible();
  await expect(actions.getByRole("button", { name: /Live door count/ })).toBeVisible();

  await actions.getByRole("button", { name: /^▦ RSVP QR$/ }).click();
  const slot = page.locator("#hubQrPickSlot");
  await expect(slot.locator("a").first()).toHaveAttribute(
    "href",
    /event-signup\.html\?event=33333333-3333-3333-3333-333333333333/
  );

  await actions.getByRole("button", { name: /Door check-in QR/ }).click();
  await expect(slot.locator("a").first()).toHaveAttribute("href", /members\.html\?checkin=code-abc123/);

  await actions.getByRole("button", { name: /Save tracked RSVP in library/ }).click();
  await expect(page.locator("#hubQrLibLabel")).toHaveValue("Tartan Ball RSVP");
  await expect(page.locator("#hubQrLibSlug")).toHaveValue("tartan-ball-rsvp");
  await expect(page.locator("#hubQrLibPurpose")).toHaveValue("event_rsvp");
});
