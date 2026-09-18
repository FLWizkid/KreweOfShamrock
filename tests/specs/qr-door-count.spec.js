// Live door count (Phase 4 of QR_LIBRARY_BUILD_PLAN.md). Mounts the real QR
// studio script against a stubbed database client, as qr-library.spec.js
// does, and drives the "Live door count" button on a meeting row.
const { test, expect } = require("@playwright/test");

async function mountStudioWithMeeting(page) {
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
            id: "22222222-2222-2222-2222-222222222222",
            name: "February parade briefing",
            start_time: "2026-09-19T23:00:00Z",
            is_mandatory: true,
          }],
        };
      },
    };
    window.__kosSb = {
      rpc: async (name) => {
        if (name === "is_krewe_officer") return { data: true };
        if (name === "officer_list_qr_codes") return { data: [] };
        if (name === "officer_door_count") {
          return {
            data: {
              count: 3,
              hours_pending: 4.5,
              recent: [
                { name: "Pat Doe", at: "2026-09-19T23:05:00Z", hours: 2 },
                { name: "Sam Roe", at: "2026-09-19T23:04:00Z", hours: 2.5 },
                { name: "Kim Poe", at: "2026-09-19T23:03:00Z", hours: null },
              ],
            },
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

test("Live door count shows the running total, pending hours, and recent names", async ({ page }) => {
  await mountStudioWithMeeting(page);
  const meetings = page.locator("#hubQrMeetingList");
  await expect(meetings).toContainText("February parade briefing");
  await meetings.getByRole("button", { name: /Live door count/ }).click();
  const slot = meetings.locator(".qr-slot");
  await expect(slot).toContainText("3");
  await expect(slot).toContainText("checked in at the door");
  await expect(slot).toContainText("4.5 volunteer hours pending review");
  await expect(slot).toContainText("Pat Doe");
  await expect(slot).toContainText("+2.5h pending");
});

test("door count explains itself when the Phase 4 migration is missing", async ({ page }) => {
  await mountStudioWithMeeting(page);
  await page.evaluate(() => {
    const realRpc = window.__kosSb.rpc;
    window.__kosSb.rpc = async (name) => {
      if (name === "officer_door_count") {
        return { error: { message: "Could not find the function public.officer_door_count" } };
      }
      return realRpc(name);
    };
  });
  const meetings = page.locator("#hubQrMeetingList");
  await meetings.getByRole("button", { name: /Live door count/ }).click();
  await expect(meetings.locator(".qr-slot")).toContainText("run sql/kos_attendance_qr_hours.sql");
});
