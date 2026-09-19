/* Document Studio — officer management for the Document Library
   (DOCUMENT_LIBRARY_PLAN.md Phase 3). Companion to kos-doc-library.js.
   Officers upload files to the PRIVATE krewe-documents bucket, create and
   edit library rows, publish/unpublish, mark easter eggs, and copy egg
   links. All writes go through the officer_* RPCs from
   sql/kos_document_library.sql; each re-checks is_krewe_officer()
   server-side, so this UI is not the security boundary. */
(function () {
  "use strict";

  var BUCKET = "krewe-documents";
  var MAX_BYTES = 20 * 1024 * 1024;
  var MIME_OK = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "image/jpeg": "image",
    "image/png": "image",
    "image/webp": "image"
  };
  var CATEGORY_OPTIONS = [
    ["governing", "Governing"],
    ["calendars", "Calendars & Season"],
    ["forms", "Forms"],
    ["newsletters", "Newsletters"],
    ["fun", "Fun finds (easter eggs live here)"],
    ["general", "General"]
  ];

  var CSS = [
    ".hub-docstudio-row{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;border:1px solid rgba(168,128,28,.3);border-radius:12px;padding:11px 12px;margin:8px 0;background:#fffdf4;flex-wrap:wrap;}",
    ".hub-docstudio-row b{font-family:var(--display);color:var(--green-800);}",
    ".hub-docstudio-row .muted{color:var(--muted);font-size:13px;line-height:1.45;}",
    ".hub-docstudio-badge{display:inline-block;border-radius:999px;padding:2px 8px;font-size:11px;font-family:var(--display);font-weight:700;background:rgba(168,128,28,.15);color:var(--gold-deep);margin-right:4px;}",
    ".hub-docstudio-badge.live{background:rgba(39,125,76,.14);color:var(--green-800);}",
    ".hub-docstudio-badge.egg{background:rgba(122,60,160,.13);color:#6a2f92;}",
    ".hub-docstudio-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;}",
    ".hub-docstudio-actions .btn{min-height:40px;}",
    ".hub-docstudio-form{margin-top:18px;padding-top:16px;border-top:1px dashed rgba(168,128,28,.4);}",
    ".hub-docstudio-form h3{font-family:var(--display);color:var(--green-800);margin:0 0 10px;font-size:18px;}",
    ".hub-docstudio-form label{display:block;font-size:13px;color:var(--muted);margin:10px 0 3px;}",
    ".hub-docstudio-form input,.hub-docstudio-form textarea,.hub-docstudio-form select{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid rgba(168,128,28,.4);border-radius:8px;font:inherit;background:#fff;}",
    ".hub-docstudio-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 12px;}",
    ".hub-docstudio-grid .wide{grid-column:1/-1;}",
    ".hub-docstudio-note{font-size:12px;color:var(--muted);margin:4px 0;}",
    ".hub-docstudio-msg{min-height:1.2em;color:var(--green-800);font-size:14px;margin:8px 0 0;}",
    ".hub-docstudio-egg{background:#faf5ff;border:1px solid rgba(122,60,160,.3);border-radius:10px;padding:10px 12px;margin-top:8px;}",
    "@media(max-width:620px){.hub-docstudio-grid{grid-template-columns:1fr}.hub-docstudio-grid .wide{grid-column:auto}.hub-docstudio-actions{justify-content:flex-start}}"
  ].join("");

  function css() {
    if (document.getElementById("kosDocStudioCss")) return;
    var s = document.createElement("style");
    s.id = "kosDocStudioCss";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(v) {
    return (v == null ? "" : String(v)).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ""; }
  function setVal(id, v) { var e = document.getElementById(id); if (e) e.value = v == null ? "" : v; }
  function msg(text) { var m = document.getElementById("hubDocMsg"); if (m) m.textContent = text || ""; }

  function eggLink(slug) {
    var o = (location.origin || "").replace(/\/$/, "");
    return o + "/members.html?found=" + encodeURIComponent(slug);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }
    return Promise.resolve(false);
  }

  function fileTypeFor(file) {
    return MIME_OK[file.type] || null;
  }

  function pageUrlType(url) {
    if (/\.pdf(\?|$)/i.test(url)) return "pdf";
    if (/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)) return "image";
    return "html";
  }

  async function upload(sb, file, category) {
    var kind = fileTypeFor(file);
    if (!kind) throw Error("Please choose a PDF, Word (.docx), JPG, PNG, or WEBP file.");
    if (file.size > MAX_BYTES) throw Error("Files must be 20 MB or smaller.");
    var ext = (file.name.match(/\.([a-z0-9]+)$/i) || ["", "pdf"])[1].toLowerCase();
    var base = (file.name || "document").replace(/\.[^.]*$/, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "document";
    var path = (category || "general") + "/" + Date.now() + "-" + base + "." + ext;
    var r = await sb.storage.from(BUCKET).upload(path, file, {
      upsert: false, contentType: file.type, cacheControl: "3600"
    });
    if (r.error) throw r.error;
    return { path: path, kind: kind, size: file.size };
  }

  function clearForm() {
    var f = document.getElementById("hubDocForm");
    if (f) f.reset();
    ["hubDocId", "hubDocStoragePath", "hubDocFileType", "hubDocFileSize", "hubDocOldPath"].forEach(function (id) { setVal(id, ""); });
    var t = document.getElementById("hubDocFormTitle");
    if (t) t.textContent = "New document";
    var del = document.getElementById("hubDocDelete");
    if (del) del.style.display = "none";
    var note = document.getElementById("hubDocFileNote");
    if (note) note.textContent = "Upload a file OR fill the page address — one or the other, not both.";
    toggleEgg();
    msg("");
  }

  function toggleEgg() {
    var on = !!(document.getElementById("hubDocSurprise") || {}).checked;
    var box = document.getElementById("hubDocEggBox");
    if (box) box.style.display = on ? "" : "none";
  }

  function fill(d) {
    setVal("hubDocId", d.id);
    setVal("hubDocTitle", d.title);
    setVal("hubDocDescription", d.description);
    setVal("hubDocCategory", d.category || "general");
    setVal("hubDocPageUrl", d.page_url);
    setVal("hubDocSort", d.sort_order == null ? "100" : d.sort_order);
    setVal("hubDocSlug", d.surprise_slug);
    setVal("hubDocStoragePath", d.storage_path);
    setVal("hubDocOldPath", d.storage_path);
    setVal("hubDocFileType", d.file_type);
    setVal("hubDocFileSize", d.file_size == null ? "" : d.file_size);
    var chk = document.getElementById("hubDocSurprise");
    if (chk) chk.checked = !!d.is_surprise;
    toggleEgg();
    var t = document.getElementById("hubDocFormTitle");
    if (t) t.textContent = "Edit: " + (d.title || "document");
    var del = document.getElementById("hubDocDelete");
    if (del) del.style.display = "";
    var note = document.getElementById("hubDocFileNote");
    if (note) {
      note.textContent = d.storage_path
        ? "Current file: " + d.storage_path + " — upload a new file to replace it (the row and its links stay the same)."
        : "Upload a file OR fill the page address — one or the other, not both.";
    }
    var wrap = document.getElementById("hubDocFormWrap");
    if (wrap) wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function rowHtml(d) {
    var badges = d.is_published
      ? '<span class="hub-docstudio-badge live">published</span>'
      : '<span class="hub-docstudio-badge">draft</span>';
    if (d.is_surprise) badges += '<span class="hub-docstudio-badge egg">easter egg</span>';
    var src = d.storage_path ? ("file: " + esc(d.storage_path)) : ("page: " + esc(d.page_url || ""));
    return '<div class="hub-docstudio-row">' +
      "<div><b>" + esc(d.title) + "</b><div class=\"muted\">" + badges + " " +
      esc(d.category) + " · " + src + "</div>" +
      (d.is_surprise && d.surprise_slug
        ? '<div class="muted">egg link: ' + esc(eggLink(d.surprise_slug)) + "</div>" : "") +
      "</div>" +
      '<div class="hub-docstudio-actions">' +
      '<button class="btn" type="button" data-edit="' + esc(d.id) + '">Edit</button>' +
      '<button class="btn" type="button" data-pub="' + esc(d.id) + '">' + (d.is_published ? "Unpublish" : "Publish") + "</button>" +
      (d.is_surprise && d.surprise_slug
        ? '<button class="btn" type="button" data-egg="' + esc(d.surprise_slug) + '">Copy egg link</button>' : "") +
      '<button class="btn btn-danger" type="button" data-del="' + esc(d.id) + '">Delete</button>' +
      "</div></div>";
  }

  async function fetchDocs(sb) {
    var r = await sb.from("documents").select("*")
      .order("category", { ascending: true }).order("sort_order", { ascending: true });
    if (r.error) throw r.error;
    return r.data || [];
  }

  async function refresh(sb) {
    var t = document.getElementById("hubDocList");
    if (!t) return;
    t.innerHTML = '<p class="empty">Loading documents…</p>';
    try {
      var list = await fetchDocs(sb);
      if (!list.length) {
        t.innerHTML = '<p class="empty">No documents yet. Create the first one below.</p>';
        return;
      }
      t.innerHTML = list.map(rowHtml).join("");
      t.querySelectorAll("[data-edit]").forEach(function (b) {
        b.onclick = function () {
          var d = list.find(function (x) { return String(x.id) === b.dataset.edit; });
          if (d) fill(d);
        };
      });
      t.querySelectorAll("[data-pub]").forEach(function (b) {
        b.onclick = async function () {
          var d = list.find(function (x) { return String(x.id) === b.dataset.pub; });
          if (!d) return;
          var r = await sb.rpc("officer_set_document_published", { p_id: d.id, p_published: !d.is_published });
          if (r.error || (r.data && r.data.ok === false)) {
            alert("Could not update: " + ((r.error && r.error.message) || (r.data && r.data.error) || "unknown"));
            return;
          }
          refresh(sb);
        };
      });
      t.querySelectorAll("[data-egg]").forEach(function (b) {
        b.onclick = async function () {
          var link = eggLink(b.dataset.egg);
          var ok = await copyText(link);
          if (ok) { b.textContent = "Copied!"; setTimeout(function () { b.textContent = "Copy egg link"; }, 1500); }
          else window.prompt("Copy the egg link:", link);
        };
      });
      t.querySelectorAll("[data-del]").forEach(function (b) {
        b.onclick = async function () {
          var d = list.find(function (x) { return String(x.id) === b.dataset.del; });
          if (!d) return;
          if (!window.confirm('Delete "' + (d.title || "this document") + '" from the library? ' +
            "Members lose access immediately. Prefer Unpublish if you may want it back.")) return;
          var r = await sb.rpc("officer_delete_document", { p_id: d.id });
          if (r.error || (r.data && r.data.ok === false)) {
            alert("Could not delete: " + ((r.error && r.error.message) || (r.data && r.data.error) || "unknown"));
            return;
          }
          if (d.storage_path) {
            try { await sb.storage.from(BUCKET).remove([d.storage_path]); } catch (e) {}
          }
          if (val("hubDocId") === String(d.id)) clearForm();
          refresh(sb);
        };
      });
    } catch (e) {
      t.innerHTML = '<p class="empty">Couldn’t load documents. ' + esc(e.message || "Try again in a moment.") + "</p>";
    }
  }

  async function save(sb) {
    var b = document.getElementById("hubDocSave");
    var title = val("hubDocTitle");
    if (!title) { msg("Title is required."); return; }
    var storagePath = val("hubDocStoragePath") || null;
    var pageUrl = val("hubDocPageUrl") || null;
    if (storagePath && pageUrl) { msg("Choose ONE source: clear the page address, or remove the uploaded file."); return; }
    if (!storagePath && !pageUrl) { msg("Upload a file or fill the page address first."); return; }
    var isSurprise = !!(document.getElementById("hubDocSurprise") || {}).checked;
    var slug = val("hubDocSlug");
    if (isSurprise && !/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug)) {
      msg("Easter eggs need a slug: 3–40 lowercase letters, numbers, or dashes (e.g. tampa-parades).");
      return;
    }
    var fileType = val("hubDocFileType") || (pageUrl ? pageUrlType(pageUrl) : null);
    var fileSize = val("hubDocFileSize");
    var params = {
      p_id: val("hubDocId") || null,
      p_title: title,
      p_description: val("hubDocDescription") || null,
      p_category: val("hubDocCategory") || "general",
      p_storage_path: storagePath,
      p_page_url: pageUrl,
      p_file_type: fileType,
      p_file_size: fileSize === "" ? null : Number(fileSize),
      p_is_surprise: isSurprise,
      p_surprise_slug: isSurprise ? slug : null,
      p_sort_order: parseInt(val("hubDocSort") || "100", 10) || 100
    };
    b.disabled = true; b.textContent = "Saving…"; msg("");
    try {
      var r = await sb.rpc("officer_upsert_document", params);
      if (r.error) throw r.error;
      if (r.data && r.data.ok === false) throw Error(r.data.error || "Could not save.");
      // A replacement upload leaves the old file behind — tidy it up now.
      var oldPath = val("hubDocOldPath");
      if (oldPath && storagePath && oldPath !== storagePath) {
        try { await sb.storage.from(BUCKET).remove([oldPath]); } catch (e) {}
      }
      msg(isSurprise
        ? "Saved. Remember: easter eggs stay invisible to members until you Publish, and the clover links go live in Phase 5."
        : "Saved." );
      clearForm();
      await refresh(sb);
    } catch (e) {
      msg("Couldn't save: " + (e.message || e));
    }
    b.disabled = false; b.textContent = "☘ Save document";
  }

  function cardHtml() {
    var cats = CATEGORY_OPTIONS.map(function (c) {
      return '<option value="' + c[0] + '">' + esc(c[1]) + "</option>";
    }).join("");
    return '<div class="app-head"><span class="ic">📜</span><div><h2>Document Studio</h2>' +
      "<small>Upload, publish, and hide library documents</small></div></div>" +
      '<div class="app-body">' +
      '<p style="font-size:14px;color:var(--muted);margin:0 0 12px">Documents appear on every member’s ' +
      "<b>Documents</b> card once published. Uploaded files live in private storage — members get " +
      "temporary signed links, never a public address. Prefer <b>Unpublish</b> over Delete.</p>" +
      '<div class="hub-doc-list"><h3 style="font-family:var(--display);color:var(--green-800);margin:0 0 10px;font-size:18px;">Library</h3>' +
      '<div id="hubDocList"><p class="empty">Loading documents…</p></div></div>' +
      '<div class="hub-docstudio-form" id="hubDocFormWrap"><h3 id="hubDocFormTitle">New document</h3>' +
      '<form id="hubDocForm">' +
      '<input type="hidden" id="hubDocId"/><input type="hidden" id="hubDocStoragePath"/>' +
      '<input type="hidden" id="hubDocOldPath"/><input type="hidden" id="hubDocFileType"/>' +
      '<input type="hidden" id="hubDocFileSize"/>' +
      '<div class="hub-docstudio-grid">' +
      '<div class="wide"><label for="hubDocTitle">Title *</label><input id="hubDocTitle" required/></div>' +
      '<div class="wide"><label for="hubDocDescription">Description (one friendly sentence)</label><textarea id="hubDocDescription" rows="2"></textarea></div>' +
      '<div><label for="hubDocCategory">Category</label><select id="hubDocCategory">' + cats + "</select></div>" +
      '<div><label for="hubDocSort">Sort order (lower = higher on the shelf)</label><input id="hubDocSort" type="number" step="1" value="100"/></div>' +
      '<div class="wide"><label for="hubDocFile">Upload a file (PDF, Word, or image — 20 MB max)</label>' +
      '<input id="hubDocFile" type="file" accept="application/pdf,.docx,image/jpeg,image/png,image/webp"/>' +
      '<p class="hub-docstudio-note" id="hubDocFileNote">Upload a file OR fill the page address — one or the other, not both.</p></div>' +
      '<div class="wide"><label for="hubDocPageUrl">…or a page on this website (starts with /)</label>' +
      '<input id="hubDocPageUrl" placeholder="/assets/docs/example.html"/></div>' +
      '<div class="wide"><label style="display:flex;align-items:center;gap:8px;margin-top:12px;">' +
      '<input id="hubDocSurprise" type="checkbox" style="width:auto;"/> This is a hidden easter egg 🥚</label>' +
      '<div class="hub-docstudio-egg" id="hubDocEggBox" style="display:none;">' +
      '<label for="hubDocSlug">Egg slug (for the secret link)</label>' +
      '<input id="hubDocSlug" placeholder="tampa-parades"/>' +
      '<p class="hub-docstudio-note">Members who follow the egg link get a celebration, +10 Clovers (first find only), ' +
      "and the document appears in their Fun finds. Hide the link behind a small clover on a public page.</p>" +
      "</div></div>" +
      "</div>" +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">' +
      '<button class="btn btn-primary" type="submit" id="hubDocSave">☘ Save document</button>' +
      '<button class="btn" type="button" id="hubDocNew">New / clear</button>' +
      '<button class="btn btn-danger" type="button" id="hubDocDelete" style="display:none">Delete document</button>' +
      "</div>" +
      '<p class="hub-docstudio-msg" id="hubDocMsg" aria-live="polite"></p>' +
      "</form></div></div>";
  }

  function build(sb) {
    var panel = document.getElementById("hubOfficer");
    if (!panel) return;
    var card = document.getElementById("hubDocStudio");
    if (!card) {
      card = document.createElement("section");
      card.className = "app-card";
      card.id = "hubDocStudio";
      var after = document.getElementById("hubQrStudio") || document.getElementById("hubShopStudio");
      if (after && after.nextSibling) panel.insertBefore(card, after.nextSibling);
      else panel.appendChild(card);
    }
    card.innerHTML = cardHtml();

    document.getElementById("hubDocForm").onsubmit = function (e) { e.preventDefault(); save(sb); };
    document.getElementById("hubDocNew").onclick = clearForm;
    document.getElementById("hubDocSurprise").onchange = toggleEgg;
    document.getElementById("hubDocDelete").onclick = function () {
      var id = val("hubDocId");
      if (!id) return;
      var btn = document.querySelector('#hubDocList [data-del="' + id + '"]');
      if (btn) btn.click();
    };
    var file = document.getElementById("hubDocFile");
    file.onchange = async function () {
      var note = document.getElementById("hubDocFileNote");
      var f = file.files && file.files[0];
      if (!f) return;
      if (val("hubDocPageUrl")) {
        note.textContent = "This document points at a page. Clear the page address first if you want an uploaded file instead.";
        file.value = "";
        return;
      }
      file.disabled = true;
      note.textContent = "Uploading…";
      try {
        var up = await upload(sb, f, val("hubDocCategory") || "general");
        setVal("hubDocStoragePath", up.path);
        setVal("hubDocFileType", up.kind);
        setVal("hubDocFileSize", up.size);
        note.textContent = "Uploaded: " + up.path + " — press ☘ Save document to add it to the library.";
      } catch (e) {
        note.textContent = "Upload failed: " + (e.message || e);
      }
      file.disabled = false;
      file.value = "";
    };
    clearForm();
    refresh(sb);
  }

  async function boot() {
    css();
    var sb = window.__kosSb || null;
    for (var i = 0; i < 40 && !sb; i++) {
      await new Promise(function (r) { setTimeout(r, 150); });
      sb = window.__kosSb || null;
    }
    if (!sb) return;
    var officer = false;
    try { var o = await sb.rpc("is_krewe_officer"); officer = !!o.data; } catch (e) {}
    if (!officer) return;
    build(sb);
  }

  var old = window.kosUnlock;
  window.kosUnlock = function () {
    if (typeof old === "function") old();
    setTimeout(boot, 120);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 500); });
  } else {
    setTimeout(boot, 500);
  }
})();
