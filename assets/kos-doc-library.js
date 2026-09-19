/* Document Library — companion to members-desk.js (DOCUMENT_LIBRARY_PLAN.md Phase 2).
   Fills the #docs card from the `documents` table. Row Level Security decides
   what each member sees: published shelf documents for everyone signed in,
   plus any easter-egg documents that member has personally discovered, and
   everything (drafts included) for officers. Uploaded files live in the
   PRIVATE krewe-documents bucket, so Open/Download go through short-lived
   signed URLs; in-repo pages (page_url) open directly. */
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

  function wireActions(host, docs, client) {
    host.addEventListener("click", async function (ev) {
      var btn = ev.target.closest ? ev.target.closest("[data-doclib-open],[data-doclib-dl]") : null;
      if (!btn) return;
      var id = btn.getAttribute("data-doclib-open") || btn.getAttribute("data-doclib-dl");
      var wantDownload = btn.hasAttribute("data-doclib-dl");
      var doc = docs.find(function (d) { return String(d.id) === id; });
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

  async function init() {
    var card = document.getElementById("docs");
    if (!card) return;
    var body = card.querySelector(".app-body");
    if (!body) return;
    var client = await getClient();
    if (!client) return; // not signed in yet: static pills keep working

    var q = await client.from("documents")
      .select("id,title,description,category,storage_path,page_url,file_type,file_size,is_published,sort_order")
      .order("sort_order", { ascending: true });
    if (q.error || !q.data || !q.data.length) return; // keep the static card on any failure

    injectCss();
    var staticBlock = body.querySelector(".pr-waiver");
    var host = document.createElement("div");
    host.id = "docLibList";
    body.appendChild(host);
    render(host, q.data);
    wireActions(host, q.data, client);
    if (staticBlock) staticBlock.style.display = "none";
    var small = card.querySelector(".app-head small");
    if (small) small.textContent = "Open, download, and print krewe documents";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
})();
