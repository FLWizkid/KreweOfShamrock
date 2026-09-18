// go.html — the tracked QR hop (QR_LIBRARY_BUILD_PLAN.md Phase 2). A printed
// square encodes go.html?c=SLUG; the page resolves the slug through the
// registry and redirects. The happy path needs the live database, so these
// tests cover what runs entirely in the browser: the missing-code message and
// the graceful failure when the server can't be reached.
const { test, expect } = require("@playwright/test");

test("go.html without a code explains and offers the home page", async ({ page }) => {
  await page.goto("/go.html");
  const msg = page.locator("#goMsg");
  await expect(msg).toContainText("missing its code");
  await expect(msg.locator("a")).toHaveAttribute("href", "index.html");
});

test("go.html fails gracefully when the registry is unreachable", async ({ page }) => {
  // Block the Supabase call to simulate no connectivity.
  await page.route("**/rest/v1/rpc/resolve_qr", (route) => route.abort());
  await page.goto("/go.html?c=dues");
  const msg = page.locator("#goMsg");
  await expect(msg).toContainText("Couldn't reach the krewe's server");
  await expect(msg.locator("a")).toHaveAttribute("href", "index.html");
});

test("go.html redirects when the registry answers", async ({ page }) => {
  // Stub the registry and the destination so the redirect path is covered
  // without the live database or outside network.
  await page.route("**/rest/v1/rpc/resolve_qr", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true, target_url: "https://example.com/", label: "Test link" }),
    })
  );
  await page.route("https://example.com/", (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>Arrived</h1>" })
  );
  await page.goto("/go.html?c=test");
  await page.waitForURL("https://example.com/");
  await expect(page.locator("h1")).toHaveText("Arrived");
});
