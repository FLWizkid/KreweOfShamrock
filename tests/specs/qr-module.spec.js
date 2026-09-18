// Shared QR generator (assets/kos-qr.js): the one module that draws every
// QR square (QR_LIBRARY_BUILD_PLAN.md Phase 1). These tests load real pages
// and drive window.kosQR directly, so they cover the self-hosted library,
// the paint/draw entry points, and the download button, without needing an
// officer sign-in.
const { test, expect } = require("@playwright/test");

test.describe("shared QR generator", () => {
  test("members.html exposes the self-hosted library and kosQR", async ({ page }) => {
    await page.goto("/members.html");
    await page.waitForFunction(() => window.QRCode && window.kosQR);
    const api = await page.evaluate(() => ({
      paint: typeof window.kosQR.paint,
      draw: typeof window.kosQR.draw,
      downloadPNG: typeof window.kosQR.downloadPNG,
      printCard: typeof window.kosQR.printCard,
      toCanvas: typeof window.QRCode.toCanvas,
    }));
    expect(api).toEqual({
      paint: "function",
      draw: "function",
      downloadPNG: "function",
      printCard: "function",
      toCanvas: "function",
    });
  });

  test("kosQR.paint draws a square with link, PNG and print buttons", async ({ page }) => {
    await page.goto("/raffle-qr-sheet.html");
    await page.waitForFunction(() => window.QRCode && window.kosQR);
    await page.evaluate(() => {
      const slot = document.createElement("div");
      slot.id = "qrTestSlot";
      document.body.appendChild(slot);
      window.kosQR.paint(slot, "https://www.kreweofshamrock.com/members.html?checkin=test123", "Door check-in");
    });
    const slot = page.locator("#qrTestSlot");
    // The canvas must exist and actually contain dark modules, not stay blank.
    const painted = await slot.locator("canvas").evaluate((canvas) => {
      const ctx = canvas.getContext("2d");
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let dark = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i] < 128) dark++;
      return { width: canvas.width, dark };
    });
    expect(painted.width).toBeGreaterThan(0);
    expect(painted.dark).toBeGreaterThan(100);
    await expect(slot.locator("a")).toHaveAttribute("href", /checkin=test123/);
    await expect(slot.getByRole("button", { name: /Download PNG/ })).toBeVisible();
    await expect(slot.getByRole("button", { name: /Print card/ })).toBeVisible();
    await expect(slot).toContainText("Door check-in");
  });

  test("kosQR.paint falls back to the link when the library is missing", async ({ page }) => {
    await page.goto("/raffle-qr-sheet.html");
    await page.waitForFunction(() => window.QRCode && window.kosQR);
    await page.evaluate(() => {
      window.QRCode = undefined; // simulate a blocked/failed library load
      const slot = document.createElement("div");
      slot.id = "qrFallbackSlot";
      document.body.appendChild(slot);
      window.kosQR.paint(slot, "https://example.com/x", "Scan or open");
    });
    const slot = page.locator("#qrFallbackSlot");
    await expect(slot).toContainText("QR library unavailable");
    await expect(slot.locator("a")).toHaveAttribute("href", "https://example.com/x");
    await expect(slot.locator("canvas")).toHaveCount(0);
  });

  test("kosQR.downloadPNG hands the officer a PNG file", async ({ page }) => {
    await page.goto("/raffle-qr-sheet.html");
    await page.waitForFunction(() => window.QRCode && window.kosQR);
    const downloadPromise = page.waitForEvent("download");
    await page.evaluate(() => {
      window.kosQR.downloadPNG("https://www.kreweofshamrock.com/store.html", "Krewe store");
    });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("krewe-store.png");
  });
});
