// Shared helpers for the regression specs.
// Collects console errors, uncaught page errors, and failed same-origin
// requests so every spec can assert the page is healthy. External-network
// noise (Supabase, CDNs, Google Fonts) is tolerated — the suite must pass
// offline — but same-origin failures and real JS exceptions are regressions.

const EXTERNAL_NOISE = [
  /Failed to load resource/i, // resource-level 404/blocked lines carry the URL in location, checked below
  /net::ERR_/i,
  /Failed to fetch/i,
  /NetworkError/i,
  /ERR_NAME_NOT_RESOLVED/i,
  /fonts\.g(oogleapis|static)\.com/i,
  /supabase/i,
  /cdn\.jsdelivr\.net/i,
  /esm\.sh/i,
  /i\.ytimg\.com/i,
];

function isExternalNoise(text, url) {
  if (url && !url.includes("127.0.0.1") && !url.includes("localhost")) return true;
  return EXTERNAL_NOISE.some((re) => re.test(text));
}

function watchPage(page) {
  const report = { consoleErrors: [], pageErrors: [], failedLocal: [] };

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const loc = msg.location() || {};
    if (isExternalNoise(msg.text(), loc.url)) return;
    report.consoleErrors.push(`${msg.text()} (${loc.url || "?"}:${loc.lineNumber || "?"})`);
  });

  page.on("pageerror", (err) => {
    const text = String(err);
    if (isExternalNoise(text)) return; // network-dependent rejections are not code regressions
    report.pageErrors.push(text);
  });

  page.on("response", (res) => {
    const url = res.url();
    if (!url.includes("127.0.0.1")) return;
    if (res.status() >= 400) report.failedLocal.push(`${res.status()} ${url}`);
  });

  page.on("requestfailed", (req) => {
    const url = req.url();
    if (!url.includes("127.0.0.1")) return;
    const errorText = (req.failure() && req.failure().errorText) || "";
    // Media elements abort in-flight range requests as a matter of course
    // (pause, teardown); that is not a missing file.
    if (errorText === "net::ERR_ABORTED" && req.resourceType() === "media") return;
    report.failedLocal.push(`FAILED ${url} (${errorText})`);
  });

  return report;
}

function assertHealthy(expect, report, label) {
  expect(report.pageErrors, `${label}: uncaught JS errors`).toEqual([]);
  expect(report.consoleErrors, `${label}: console errors`).toEqual([]);
  expect(report.failedLocal, `${label}: failed local resources`).toEqual([]);
}

async function unlockMemberHub(page, opts) {
  opts = opts || {};
  const target = opts.hash ? `/members.html#${opts.hash}` : "/members.html";
  await page.goto(target);
  await page.evaluate((role) => {
    const auth = document.getElementById("authStage");
    if (auth) auth.style.display = "none";
    const content = document.getElementById("memberContent");
    if (content) content.style.display = "block";
    if (role && typeof window.__kosHubSetRole === "function") window.__kosHubSetRole(role);
    if (typeof window.kosUnlock === "function") window.kosUnlock();
    if (typeof window.kosShowHub === "function") window.kosShowHub("hub", { skipScroll: true });
  }, opts.role || null);
  await page.waitForSelector("#hubRoot");
}

// Every page of the site (raffle-qr-sheet.html is a standalone print sheet
// without the shared chrome, so it is checked separately).
const PAGES = [
  { file: "index.html", title: /Krewe of Shamrock/ },
  { file: "event-signup.html", title: /Event Sign-Up/ },
  { file: "parades.html", title: /Parade/ },
  { file: "tartan-ball.html", title: /Tartan Ball/ },
  { file: "learn.html", title: /Heritage|Learn/ },
  { file: "krewe-history.html", title: /History/ },
  { file: "poetry.html", title: /Creativity/ },
  { file: "gallery.html", title: /Gallery/ },
  { file: "videos.html", title: /Video/ },
  { file: "share.html", title: /Share/ },
  { file: "volunteer.html", title: /Service|Charity|Volunteer/ },
  { file: "store.html", title: /Shop/ },
  { file: "members.html", title: /Members/ },
  { file: "membership-application.html", title: /Membership Application/ },
  { file: "raffle.html", title: /Raffle/ },
];

module.exports = { watchPage, assertHealthy, PAGES, unlockMemberHub };
