/* Document Library — companion to members-desk.js (DOCUMENT_LIBRARY_PLAN.md Phases 2 & 5).
   Fills the #docs card from the `documents` table. Row Level Security decides
   what each member sees: published shelf documents for everyone signed in,
   plus any easter-egg documents that member has personally discovered, and
   everything (drafts included) for officers. Uploaded files live in the
   PRIVATE krewe-documents bucket, so Open/Download go through short-lived
   signed URLs; in-repo pages (page_url) open directly.
   Phase 5: arriving with ?found=SLUG (an egg link hidden on a public page)
   calls discover_document — the server records the find, awards +10 Clovers
   once, and this script throws the celebration. */
(function () {
  "use strict";

  var BUCKET = "krewe-documents";
  var SIGNED_URL_SECONDS = 3600;

  var CATEGORIES = [
    { key: "governing",   icon: "☘",  label: "Governing",
      sub: "Bylaws, conduct, and the rules we march by" },
    { key: "calendars",   icon: "📅", label: "Calendars & Season",
      sub: "Print them, pin them, pencil events in" },
    { key: "forms",       icon: "📝", label: "Forms",
      sub: "Printable forms members may need" },
    { key: "newsletters", icon: "📰", label: "Newsletters",
      sub: "News from around the krewe" },
    { key: "fun",         icon: "🎉", label: "Fun finds",
      sub: "Treasures you’ve discovered around the website" },
    { key: "general",     icon: "📂", label: "More documents", sub: "" }
  ];

  var FILE_ICONS = { pdf: "📄", html: "📃", docx: "📝", image: "🖼️" };

  var CSS = [
    ".hub-doclib-cat{margin:14px 0 4px;}",
    ".hub-doclib-cat h3{font-family:var(--display);color:var(--green-800);font-size:17px;margin:0 0 2px;}",
    ".hub-doclib-cat .sub{font-size:13px;color:var(--muted);margin:0 0 8px;}",
    ".hub-doclib-row{display:flex;gap:12px;align-items:flex-start;background:#fff;border:1px solid rgba(168,128,28,.28);border-radius:12px;padding:12px 14px;margin:0 0 8px;}",
    ".hub-doclib-row .fic{font-size:22px;line-height:1.2;}",
    ".hub-doclib-row .meta{flex:1;min-width:0;}",
    ".hub-doclib-row .meta b{font-family:var(--display);color:var(--green-800);font-size:15.5px;display:block;}",
    ".hub-doclib-row .meta p{margin:2px 0 0;font-size:14px;color:var(--muted);line-height:1.4;}",
    ".hub-doclib-row .meta .kind{font-size:12px;color:var(--gold-deep);letter-spacing:.4px;text-transform:uppercase;font-family:var(--display);}",
    ".hub-doclib-row .meta .draft{color:#a15c00;background:#fff3df;border:1px solid rgba(168,128,28,.4);border-radius:999px;padding:1px 8px;font-size:11.5px;margin-left:6px;}",
    ".hub-doclib-acts{display:flex;flex-direction:column;gap:6px;}",
    ".hub-doclib-acts button,.hub-doclib-acts a{min-height:44px;min-width:96px;display:inline-flex;align-items:center;justify-content:center;background:#f0e8d2;border:1px solid rgba(168,128,28,.3);color:var(--green-800);border-radius:999px;padding:6px 14px;font-size:14px;font-family:var(--display);text-decoration:none;cursor:pointer;}",
    ".hub-doclib-acts button:hover,.hub-doclib-acts a:hover{background:#e8ddc0;}",
    ".hub-doclib-rumor{font-family:var(--fancy);font-style:italic;color:var(--muted);font-size:14.5px;margin:14px 0 0;}",
    ".hub-doclib-msg{font-size:14px;color:var(--green-800);margin:8px 0 0;min-height:1.2em;}",
    /* Easter-egg celebration */
    ".hub-egg-veil{position:fixed;inset:0;background:rgba(20,40,25,.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;}",
    ".hub-egg-card{background:linear-gradient(180deg,#fbf4df,#f1e4c2);border:2px solid var(--gold);border-radius:18px;max-width:420px;width:100%;padding:26px 24px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.35);animation:hubEggPop .45s ease;}",
    "@keyframes hubEggPop{0%{transform:scale(.7);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}",
    ".hub-egg-card .big{font-size:52px;line-height:1;animation:hubEggSpin 1.2s ease;}",
    "@keyframes hubEggSpin{0%{transform:rotate(-30deg) scale(.4)}60%{transform:rotate(12deg) scale(1.15)}100%{transform:rotate(0) scale(1)}}",
    ".hub-egg-card h3{font-family:var(--display);color:var(--green-800);font-size:22px;margin:10px 0 4px;}",
    ".hub-egg-card .t{font-family:var(--display);color:var(--gold-deep);font-size:17px;margin:0 0 6px;}",
    ".hub-egg-card p{font-size:14.5px;color:#3a3a2e;line-height:1.5;margin:0 0 8px;}",
    ".hub-egg-card .clv{display:inline-block;background:rgba(39,125,76,.14);color:var(--green-800);border-radius:999px;padding:4px 14px;font-family:var(--display);font-weight:700;font-size:15px;margin:4px 0 10px;}",
    ".hub-egg-card .acts{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:8px;}",
    ".hub-egg-card .acts .btn{min-height:44px;}",
    "@media (max-width:560px){.hub-doclib-row{flex-wrap:wrap;}.hub-doclib-acts{flex-direction:row;width:100%;}.hub-doclib-acts button,.hub-doclib-acts a{flex:1;}}"
  ].join("");

  function injectCss() {
    if (document.getElementById("kosDocLibCss")) return;
    var s = document.createElement("style");
    s.id = "kosDocLibCss";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(v) {
    return (v == null ? "" : String(v)).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function fmtSize(bytes) {
    var n = Number(bytes);
    if (!n || n <= 0) return "";
    if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }

  async function getClient() {
    var client = window.__kosSb || null;
    for (var i = 0; i < 30 && !client; i++) {
      await new Promise(function (r) { setTimeout(r, 200); });
      client = window.__kosSb || null;
    }
    return client;
  }

  async function signedUrl(client, path, download) {
    var opts = download ? { download: true } : undefined;
    var res = await client.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS, opts);
    if (res.error || !res.data || !res.data.signedUrl) {
      throw new Error((res.error && res.error.message) || "no signed url");
    }
    return res.data.signedUrl;
  }

  function rowHtml(doc) {
    var icon = FILE_ICONS[(doc.file_type || "").toLowerCase()] || "📄";
    var kindBits = [];
    if (doc.file_type) kindBits.push(esc(String(doc.file_type).toUpperCase()));
    var size = fmtSize(doc.file_size);
    if (size) kindBits.push(esc(size));
    var draft = doc.is_published ? "" : '<span class="draft">draft — officers only</span>';
    var acts = ['<button type="button" data-doclib-open="' + esc(doc.id) + '">Open</button>'];
    if (doc.storage_path) {
      acts.push('<button type="button" data-doclib-dl="' + esc(doc.id) + '">Download</button>');
    }
    if ((doc.file_type || "").toLowerCase() === "html" && doc.page_url) {
      acts.push('<a href="' + esc(doc.page_url) + "?print=1" + '" target="_blank" rel="noopener">Print</a>');
    }
    return '<div class="hub-doclib-row">' +
      '<span class="fic" aria-hidden="true">' + icon + "</span>" +
      '<div class="meta"><b>' + esc(doc.title) + draft + "</b>" +
      (kindBits.length ? '<span class="kind">' + kindBits.join(" · ") + "</span>" : "") +
      (doc.description ? "<p>" + esc(doc.description) + "</p>" : "") +
      "</div>" +
      '<div class="hub-doclib-acts">' + acts.join("") + "</div>" +
      "</div>";
  }

  function render(host, docs) {
    var byCat = {};
    docs.forEach(function (d) {
      var k = CATEGORIES.some(function (c) { return c.key === d.category; }) ? d.category : "general";
      (byCat[k] = byCat[k] || []).push(d);
    });
    var html = "";
    CATEGORIES.forEach(function (c) {
      var list = byCat[c.key];
      if (!list || !list.length) return;
      list.sort(function (a, b) {
        return (a.sort_order - b.sort_order) || String(a.title).localeCompare(String(b.title));
      });
      html += '<div class="hub-doclib-cat"><h3>' + c.icon + " " + esc(c.label) + "</h3>" +
        (c.sub ? '<p class="sub">' + esc(c.sub) + "</p>" : "") +
        list.map(rowHtml).join("") + "</div>";
    });
    html += '<p class="hub-doclib-rumor">They say stray clovers grow in odd corners of this website. ' +
      "Find one, and its treasure finds its way here. ☘</p>";
    html += '<div class="hub-doclib-msg" id="docLibMsg" aria-live="polite"></div>';
    host.innerHTML = html;
  }

  function setMsg(text) {
    var el = document.getElementById("docLibMsg");
    if (el) el.textContent = text || "";
  }

  function wireActions(host, client) {
    if (host.getAttribute("data-doclib-wired")) return;
    host.setAttribute("data-doclib-wired", "1");
    host.addEventListener("click", async function (ev) {
      var btn = ev.target.closest ? ev.target.closest("[data-doclib-open],[data-doclib-dl]") : null;
      if (!btn) return;
      var id = btn.getAttribute("data-doclib-open") || btn.getAttribute("data-doclib-dl");
      var wantDownload = btn.hasAttribute("data-doclib-dl");
      var doc = (host._docs || []).find(function (d) { return String(d.id) === id; });
      if (!doc) return;
      if (doc.page_url && !wantDownload) {
        window.open(doc.page_url, "_blank", "noopener");
        return;
      }
      if (!doc.storage_path) return;
      setMsg("Preparing your document…");
      try {
        var url = await signedUrl(client, doc.storage_path, wantDownload);
        setMsg("");
        if (wantDownload) {
          var a = document.createElement("a");
          a.href = url;
          a.rel = "noopener";
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          window.open(url, "_blank", "noopener");
        }
      } catch (e) {
        setMsg("Sorry — that document could not be opened. Try again, or tell an officer.");
      }
    });
  }

  async function loadLibrary(client) {
    var card = document.getElementById("docs");
    if (!card) return;
    var body = card.querySelector(".app-body");
    if (!body) return;
    var q = await client.from("documents")
      .select("id,title,description,category,storage_path,page_url,file_type,file_size,is_published,sort_order")
      .order("sort_order", { ascending: true });
    if (q.error || !q.data || !q.data.length) return; // keep the static card on any failure

    injectCss();
    var host = document.getElementById("docLibList");
    if (!host) {
      host = document.createElement("div");
      host.id = "docLibList";
      body.appendChild(host);
    }
    host._docs = q.data;
    render(host, q.data);
    wireActions(host, client);
    var staticBlock = body.querySelector(".pr-waiver");
    if (staticBlock) staticBlock.style.display = "none";
    var small = card.querySelector(".app-head small");
    if (small) small.textContent = "Open, download, and print krewe documents";
  }

  /* ---------- Phase 5: easter-egg discovery ---------- */

  function cleanFoundParam() {
    try {
      var u = new URL(location.href);
      u.searchParams.delete("found");
      history.replaceState(null, "", u.pathname + (u.searchParams.toString() ? "?" + u.searchParams.toString() : "") + u.hash);
    } catch (e) {}
  }

  function celebrate(data, client) {
    injectCss();
    var doc = data.document || {};
    var veil = document.createElement("div");
    veil.className = "hub-egg-veil";
    veil.id = "hubEggVeil";
    veil.setAttribute("role", "dialog");
    veil.setAttribute("aria-modal", "true");
    veil.setAttribute("aria-label", "You found a hidden treasure");
    veil.innerHTML =
      '<div class="hub-egg-card">' +
      '<div class="big" aria-hidden="true">☘</div>' +
      "<h3>" + (data.newly_found ? "You found a hidden treasure!" : "You’ve been here before…") + "</h3>" +
      '<p class="t">' + esc(doc.title || "A krewe treasure") + "</p>" +
      (doc.description ? "<p>" + esc(doc.description) + "</p>" : "") +
      (data.newly_found && data.clovers_awarded
        ? '<span class="clv">+' + Number(data.clovers_awarded) + " 🍀 Clovers</span>" +
          "<p>It now lives in your <b>Fun finds</b> on the Documents card.</p>"
        : "<p>This treasure is already on your <b>Fun finds</b> shelf — no double Clovers for clever repeat visitors. 😉</p>") +
      '<div class="acts">' +
      (doc.page_url ? '<a class="btn btn-primary" href="' + esc(doc.page_url) + '" target="_blank" rel="noopener">Open it now</a>' : "") +
      '<button class="btn" type="button" id="hubEggClose">Keep exploring</button>' +
      "</div></div>";
    document.body.appendChild(veil);
    function close() { if (veil.parentNode) veil.parentNode.removeChild(veil); }
    document.getElementById("hubEggClose").onclick = close;
    veil.addEventListener("click", function (ev) { if (ev.target === veil) close(); });
    loadLibrary(client); // the new find appears on the Fun finds shelf
  }

  async function handleFound(client) {
    var slug = "";
    try { slug = new URLSearchParams(location.search).get("found") || ""; } catch (e) {}
    if (!slug || document.getElementById("hubEggVeil")) return;
    try {
      var r = await client.rpc("discover_document", { p_slug: slug });
      if (r.error) return; // signed out / no session yet: keep the param, retry after unlock
      if (!r.data || r.data.ok !== true) {
        if (r.data && r.data.error === "not_found") cleanFoundParam(); // dead slug: don't loop
        return; // not_linked: keep the param for the post-login retry
      }
      cleanFoundParam();
      celebrate(r.data, client);
    } catch (e) {}
  }

  /* ---------- boot ---------- */

  var booting = false;
  async function init() {
    if (booting) return;
    booting = true;
    try {
      var client = await getClient();
      if (!client) return; // not signed in yet: static pills keep working
      await handleFound(client);
      await loadLibrary(client);
    } finally {
      booting = false;
    }
  }

  var oldUnlock = window.kosUnlock;
  window.kosUnlock = function () {
    if (typeof oldUnlock === "function") oldUnlock();
    setTimeout(init, 200); // retry ?found= and the shelves once signed in
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
})();
