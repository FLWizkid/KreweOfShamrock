/* QR Code Studio — Officer desk: the QR Library (tracked squares with
   anonymous scan counts), meeting check-in, and handy link QRs.
   Phase 3 of QR_LIBRARY_BUILD_PLAN.md, on top of the kos_qr_registry
   migration (Phase 2) and the shared kosQR generator (Phase 1). */
(function () {
  "use strict";

  function esc(v) {
    return (v == null ? "" : String(v)).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function fmtDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch (e) {
      return String(iso);
    }
  }

  function abs(path) {
    var o = (location.origin || "").replace(/\/$/, "");
    return o + "/" + String(path || "").replace(/^\//, "");
  }

  function showMsg(id, text, kind) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || "";
    el.style.color = kind === "error" ? "#b91c1c" : "var(--muted)";
  }

  /* ================= QR LIBRARY (the registry) ================= */

  var PURPOSES = [
    ["link", "Link"],
    ["event_rsvp", "Event RSVP"],
    ["checkin", "Check-in"],
    ["shop", "Shop"],
    ["dues", "Dues"],
    ["hours", "Volunteer hours"]
  ];
  var libCodes = [];
  var libEditing = null;

  function slugify(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  }

  function libVal(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function libSetForm(code) {
    libEditing = code ? code.id : null;
    document.getElementById("hubQrLibLabel").value = code ? code.label : "";
    document.getElementById("hubQrLibSlug").value = code ? code.slug : "";
    document.getElementById("hubQrLibTarget").value = code ? code.target_url : "";
    document.getElementById("hubQrLibPurpose").value = code ? code.purpose : "link";
    document.getElementById("hubQrLibSave").textContent = code ? "☘ Save changes" : "☘ Create QR code";
    document.getElementById("hubQrLibCancel").style.display = code ? "" : "none";
    showMsg("hubQrLibMsg", code ? "Editing “" + code.label + "”. Change the destination and save — printed squares keep working." : "");
    if (code) document.getElementById("hubQrLibLabel").focus();
  }

  function libScanLine(c) {
    var total = Number(c.scan_count || 0);
    var recent = Number(c.scans_30d || 0);
    var last = c.last_scan_at ? fmtDate(c.last_scan_at) : "never";
    return total + " scan" + (total === 1 ? "" : "s") + " · " + recent + " in the last 30 days · last: " + last;
  }

  async function loadLibrary(client) {
    var el = document.getElementById("hubQrLibList");
    if (!el) return;
    el.innerHTML = '<p class="empty">Loading the QR library…</p>';
    try {
      var res = await client.rpc("officer_list_qr_codes");
      if (res.error) throw res.error;
      libCodes = res.data || [];
      renderLibrary(client);
    } catch (e) {
      el.innerHTML =
        '<p class="empty">Couldn&rsquo;t load the QR library. ' +
        esc((e && e.message) || e) +
        " If this mentions a missing function, run sql/kos_qr_registry.sql in the Supabase SQL editor first.</p>";
    }
  }

  function renderLibrary(client) {
    var el = document.getElementById("hubQrLibList");
    if (!el) return;
    if (!libCodes.length) {
      el.innerHTML = '<p class="empty">No tracked QR codes yet. Create the first one above — try “Pay member dues”.</p>';
      return;
    }
    el.innerHTML = libCodes
      .map(function (c) {
        var purpose = (PURPOSES.find(function (p) { return p[0] === c.purpose; }) || ["", c.purpose])[1];
        var hop = abs("go.html?c=" + encodeURIComponent(c.slug));
        return (
          '<div style="padding:12px 0;border-bottom:1px dashed rgba(168,128,28,.3);' + (c.active ? "" : "opacity:.65;") + '">' +
          '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
          '<label style="display:flex;align-items:center;gap:6px;font-weight:400;margin:0;">' +
          '<input type="checkbox" data-lib-pick="' + esc(c.id) + '" style="width:auto;" /></label>' +
          '<b style="font-family:var(--display);color:var(--green-800);">' + esc(c.label) + "</b>" +
          (c.active ? "" : '<span class="rank-pill">retired</span>') +
          "</div>" +
          '<div style="font-size:13px;color:var(--muted);margin:4px 0 2px;word-break:break-all;">' +
          '<a href="' + esc(hop) + '" target="_blank" rel="noopener">go.html?c=' + esc(c.slug) + "</a> · " + esc(purpose) +
          " · " + esc(libScanLine(c)) + "</div>" +
          '<div style="font-size:13px;color:var(--muted);margin:0 0 8px;word-break:break-all;">→ ' +
          '<a href="' + esc(c.target_url) + '" target="_blank" rel="noopener">' + esc(c.target_url) + "</a></div>" +
          '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">' +
          '<button type="button" class="btn" data-lib-qr="' + esc(c.id) + '">▦ Show QR</button>' +
          '<button type="button" class="btn" data-lib-edit="' + esc(c.id) + '">Edit</button>' +
          '<button type="button" class="btn" data-lib-active="' + esc(c.id) + '">' + (c.active ? "Retire" : "Reactivate") + "</button>" +
          '<button type="button" class="btn btn-danger" data-lib-del="' + esc(c.id) + '">Delete</button>' +
          '</div><div class="qr-slot" style="flex-basis:100%;margin-top:8px;"></div></div>'
        );
      })
      .join("");

    el.querySelectorAll("[data-lib-qr]").forEach(function (b) {
      b.onclick = function () {
        var c = libCodes.find(function (x) { return String(x.id) === b.getAttribute("data-lib-qr"); });
        if (!c) return;
        var slot = b.parentElement.parentElement.querySelector(".qr-slot");
        if (window.kosQR) kosQR.paint(slot, abs("go.html?c=" + encodeURIComponent(c.slug)), c.label);
      };
    });
    el.querySelectorAll("[data-lib-edit]").forEach(function (b) {
      b.onclick = function () {
        var c = libCodes.find(function (x) { return String(x.id) === b.getAttribute("data-lib-edit"); });
        if (c) libSetForm(c);
      };
    });
    el.querySelectorAll("[data-lib-active]").forEach(function (b) {
      b.onclick = async function () {
        var c = libCodes.find(function (x) { return String(x.id) === b.getAttribute("data-lib-active"); });
        if (!c) return;
        try {
          var res = await client.rpc("officer_set_qr_active", { p_id: c.id, p_active: !c.active });
          if (res.error) throw res.error;
          await loadLibrary(client);
        } catch (e) {
          alert("Could not update the code. " + ((e && e.message) || e));
        }
      };
    });
    el.querySelectorAll("[data-lib-del]").forEach(function (b) {
      b.onclick = async function () {
        var c = libCodes.find(function (x) { return String(x.id) === b.getAttribute("data-lib-del"); });
        if (!c) return;
        if (!confirm('Delete "' + c.label + '"? Its scan history is deleted too. (Retire keeps the history.)')) return;
        try {
          var res = await client.rpc("officer_delete_qr_code", { p_id: c.id });
          if (res.error) throw res.error;
          if (libEditing === c.id) libSetForm(null);
          await loadLibrary(client);
        } catch (e) {
          alert("Could not delete the code. " + ((e && e.message) || e));
        }
      };
    });
  }

  async function saveLibraryCode(client) {
    var label = libVal("hubQrLibLabel");
    var slug = libVal("hubQrLibSlug") || slugify(label);
    var target = libVal("hubQrLibTarget");
    var purpose = libVal("hubQrLibPurpose") || "link";
    if (label.length < 2) { showMsg("hubQrLibMsg", "Give the QR code a label, e.g. Dues postcard 2026.", "error"); return; }
    if (!/^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/.test(slug)) {
      showMsg("hubQrLibMsg", "Short code: 1-40 lowercase letters, numbers, or dashes (no dash at the ends).", "error");
      return;
    }
    if (!/^(https:\/\/|mailto:)/i.test(target)) {
      showMsg("hubQrLibMsg", "Destination must start with https:// or mailto:.", "error");
      return;
    }
    showMsg("hubQrLibMsg", "Saving…");
    try {
      var res = await client.rpc("officer_upsert_qr_code", {
        p_slug: slug,
        p_label: label,
        p_target_url: target,
        p_purpose: purpose,
        p_id: libEditing
      });
      if (res.error) throw res.error;
      libSetForm(null);
      showMsg("hubQrLibMsg", "Saved. Squares for “" + slug + "” now point at that destination.");
      await loadLibrary(client);
    } catch (e) {
      showMsg("hubQrLibMsg", "Could not save. " + ((e && e.message) || e), "error");
    }
  }

  /* Print-sheet builder: tick codes, get a raffle-sheet-style page of cards. */
  function printLibrarySheet() {
    var pickedIds = Array.prototype.map.call(
      document.querySelectorAll("[data-lib-pick]:checked"),
      function (cb) { return cb.getAttribute("data-lib-pick"); }
    );
    var picked = libCodes.filter(function (c) { return pickedIds.indexOf(String(c.id)) !== -1; });
    if (!picked.length) { alert("Tick the checkbox on each code you want on the sheet first."); return; }
    if (!window.QRCode) { alert("QR library unavailable — refresh and try again."); return; }
    Promise.all(picked.map(function (c) {
      return new Promise(function (resolve) {
        QRCode.toDataURL(abs("go.html?c=" + encodeURIComponent(c.slug)), {
          width: 600, margin: 1, color: { dark: "#0c3b21", light: "#ffffff" }
        }, function (err, dataUrl) { resolve({ code: c, dataUrl: err ? null : dataUrl }); });
      });
    })).then(function (items) {
      var w = window.open("", "_blank");
      if (!w) { alert("Pop-up blocked. Allow pop-ups for this site to print the sheet."); return; }
      var cards = items.map(function (it) {
        return (
          '<div class="card"><h2>' + esc(it.code.label) + "</h2>" +
          (it.dataUrl
            ? '<img alt="QR code" src="' + it.dataUrl + '" />'
            : '<p>Could not draw this square — use ' + esc(abs("go.html?c=" + it.code.slug)) + "</p>") +
          '<div class="scan">📷 Scan with your phone camera</div>' +
          '<div class="url">' + esc(abs("go.html?c=" + it.code.slug)) + "</div></div>"
        );
      }).join("");
      w.document.write(
        '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><title>Krewe of Shamrock · QR sheet</title>' +
        "<style>body{font-family:Georgia,serif;margin:24px;}" +
        ".grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;max-width:900px;margin:0 auto;}" +
        ".card{border:2px solid #14532d;border-radius:16px;padding:18px;text-align:center;break-inside:avoid;}" +
        "h2{color:#14532d;font-size:22px;margin:0 0 8px;}" +
        "img{width:230px;height:230px;}" +
        ".scan{color:#14532d;font-size:15px;margin-top:8px;}" +
        ".url{font-size:11px;color:#666;word-break:break-all;margin-top:8px;}</style></head><body>" +
        '<div class="grid">' + cards + "</div>" +
        "<script>window.onload=function(){window.print();};<\/script></body></html>"
      );
      w.document.close();
    });
  }

  /* ================= MEETING CHECK-IN ================= */

  async function loadMeetings(client, listEl) {
    listEl.innerHTML = '<p class="empty">Loading meetings…</p>';
    try {
      var since = new Date(Date.now() - 86400000).toISOString();
      var res = await client
        .from("events")
        .select("id,name,start_time,is_mandatory")
        .eq("event_type", "meeting")
        .gte("start_time", since)
        .order("start_time", { ascending: true });
      if (res.error) throw res.error;
      var rows = res.data || [];
      if (!rows.length) {
        listEl.innerHTML = '<p class="empty">No upcoming meetings yet. Create one above.</p>';
        return;
      }
      listEl.innerHTML = rows
        .map(function (r) {
          return (
            '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 0;border-bottom:1px dashed rgba(168,128,28,.3);">' +
            "<b>" +
            esc(r.name) +
            "</b> <span>" +
            esc(fmtDate(r.start_time)) +
            "</span> " +
            (r.is_mandatory ? '<span class="rank-pill">mandatory</span>' : "") +
            '<button class="btn" type="button" data-checkin-id="' +
            esc(r.id) +
            '">Show check-in QR</button>' +
            '<div class="qr-slot" style="flex-basis:100%;"></div></div>'
          );
        })
        .join("");
      listEl.querySelectorAll("[data-checkin-id]").forEach(function (btn) {
        btn.onclick = function () {
          if (typeof window.kosShowCheckinQR === "function") {
            window.kosShowCheckinQR(btn.getAttribute("data-checkin-id"), btn);
          } else {
            enableCheckinInline(client, btn.getAttribute("data-checkin-id"), btn);
          }
        };
      });
    } catch (e) {
      listEl.innerHTML =
        '<p class="empty">Couldn&rsquo;t load meetings. ' +
        esc((e && e.message) || e) +
        "</p>";
    }
  }

  async function enableCheckinInline(client, eventId, btn) {
    try {
      var res = await client.rpc("officer_enable_checkin", { p_event: eventId });
      if (res.error || !res.data) throw res.error || new Error("No check-in code");
      var url = location.origin + location.pathname + "?checkin=" + res.data;
      var slot = btn.parentElement.querySelector(".qr-slot");
      if (window.kosQR) kosQR.paint(slot, url, "Members scan this, or use the link");
    } catch (e) {
      alert("Could not get a check-in code. " + ((e && e.message) || e));
    }
  }

  async function createMeeting(client, listEl) {
    var name = ((document.getElementById("hubQrMtName") || {}).value || "").trim();
    var when = (document.getElementById("hubQrMtWhen") || {}).value;
    var mand = !!(document.getElementById("hubQrMtMand") || {}).checked;
    if (name.length < 3 || !when) {
      showMsg("hubQrMtMsg", "Give the meeting a name and a date.", "error");
      return;
    }
    showMsg("hubQrMtMsg", "Creating…");
    try {
      var res = await client.rpc("officer_upsert_meeting", {
        p_name: name,
        p_start: new Date(when).toISOString(),
        p_mandatory: mand
      });
      if (res.error) throw res.error;
      showMsg("hubQrMtMsg", "Meeting saved. QR list refreshed.");
      document.getElementById("hubQrMtName").value = "";
      await loadMeetings(client, listEl);
    } catch (e) {
      showMsg("hubQrMtMsg", "Could not create the meeting. " + ((e && e.message) || e), "error");
    }
  }

  /* ================= HANDY LINK SQUARES ================= */

  function paintLinkQR(btn) {
    if (typeof window.kosShowLinkQR === "function") {
      window.kosShowLinkQR(btn);
      return;
    }
    var url = btn.getAttribute("data-qr-url") || "";
    var slot = btn.parentElement.querySelector(".qr-slot");
    if (!url || !slot) return;
    if (window.kosQR) kosQR.paint(slot, url, "Scan or open");
  }

  function quickRow(title, note, url) {
    return (
      '<div style="padding:12px 0;border-bottom:1px dashed rgba(168,128,28,.3);">' +
      '<b style="font-family:var(--display);color:var(--green-800);">' +
      esc(title) +
      "</b>" +
      '<div style="font-size:14px;color:var(--muted);margin:4px 0 8px;">' +
      esc(note) +
      "</div>" +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">' +
      '<button type="button" class="btn" data-qr-url="' +
      esc(url) +
      '">▦ Show QR</button>' +
      '<a href="' +
      esc(url) +
      '" target="_blank" rel="noopener" style="font-size:13px;">Open link</a>' +
      '<div class="qr-slot" style="flex-basis:100%;"></div></div></div>'
    );
  }

  /* ================= CARD ================= */

  function loadCard(client) {
    var panel = document.getElementById("hubOfficer");
    if (!panel) return;
    var card = document.getElementById("hubQrStudio");
    if (!card) {
      card = document.createElement("section");
      card.className = "app-card";
      card.id = "hubQrStudio";
      var after =
        document.getElementById("hubShopStudio") ||
        document.getElementById("hubEventStudio") ||
        document.getElementById("hubPayments");
      if (after && after.nextSibling) panel.insertBefore(card, after.nextSibling);
      else panel.appendChild(card);
    }

    var dues = "https://www.zeffy.com/en-US/ticketing/krewe-of-shamrock-membership";
    var hours = abs("members.html?hub=hours#hours");
    var store = abs("store.html");
    var fbMem = "https://www.facebook.com/groups/1790675004521855";
    var help = "mailto:secretary@kreweofshamrock.com";
    var raffle = abs("raffle-qr-sheet.html");

    var inputStyle = "width:100%;padding:10px;border-radius:8px;border:1px solid rgba(168,128,28,.4);font:inherit;box-sizing:border-box;";
    var labelStyle = "display:block;font-size:13px;color:var(--muted);margin-bottom:4px;";

    card.innerHTML =
      '<div class="app-head"><span class="ic">▦</span><div><h2>QR Code Studio</h2>' +
      "<small>The QR library, meeting check-in, and handy deep-link QR codes</small></div></div>" +
      '<div class="app-body">' +
      '<p style="font-size:14px;color:var(--muted);margin:0 0 14px;line-height:1.45;">' +
      "A QR code is just a link drawn as a square. <b>Library squares</b> below are tracked: they encode " +
      "go.html?c=CODE, count scans anonymously, and can be re-pointed after printing. " +
      "<b>Event Studio</b> has RSVP / door QR. <b>Shop Studio</b> has product QR.</p>" +

      /* ---- QR Library ---- */
      '<div style="margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid rgba(168,128,28,.25);">' +
      '<h3 style="font-family:var(--display);color:var(--green-800);margin:0 0 10px;">📚 QR library — tracked squares</h3>' +
      '<div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:10px;">' +
      '<div><label for="hubQrLibLabel" style="' + labelStyle + '">Label</label>' +
      '<input id="hubQrLibLabel" placeholder="e.g. Dues postcard 2026" style="' + inputStyle + '" /></div>' +
      '<div><label for="hubQrLibSlug" style="' + labelStyle + '">Short code (goes in the square)</label>' +
      '<input id="hubQrLibSlug" placeholder="e.g. dues2026 — leave blank to auto-fill" style="' + inputStyle + '" /></div>' +
      '<div><label for="hubQrLibTarget" style="' + labelStyle + '">Destination (https:// or mailto:)</label>' +
      '<input id="hubQrLibTarget" placeholder="https://www.zeffy.com/…" style="' + inputStyle + '" /></div>' +
      '<div><label for="hubQrLibPurpose" style="' + labelStyle + '">Purpose</label>' +
      '<select id="hubQrLibPurpose" style="' + inputStyle + '">' +
      PURPOSES.map(function (p) { return '<option value="' + p[0] + '">' + p[1] + "</option>"; }).join("") +
      "</select></div></div>" +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">' +
      '<button type="button" class="btn btn-primary" id="hubQrLibSave">☘ Create QR code</button>' +
      '<button type="button" class="btn" id="hubQrLibCancel" style="display:none;">Cancel edit</button>' +
      '<button type="button" class="btn" id="hubQrLibPrint">🖨️ Print sheet of ticked codes</button></div>' +
      '<p id="hubQrLibMsg" style="font-size:14px;min-height:1.2em;margin:8px 0 0;" aria-live="polite"></p>' +
      '<div id="hubQrLibList"></div></div>' +

      /* ---- Meetings ---- */
      '<div style="margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid rgba(168,128,28,.25);">' +
      '<h3 style="font-family:var(--display);color:var(--green-800);margin:0 0 10px;">➕ Schedule a meeting</h3>' +
      '<div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:10px;">' +
      '<div><label for="hubQrMtName" style="' + labelStyle + '">Meeting name</label>' +
      '<input id="hubQrMtName" placeholder="e.g. February parade briefing" style="' + inputStyle + '" /></div>' +
      '<div><label for="hubQrMtWhen" style="' + labelStyle + '">Date &amp; time</label>' +
      '<input id="hubQrMtWhen" type="datetime-local" style="' + inputStyle + '" /></div></div>' +
      '<label style="display:flex;align-items:center;gap:8px;font-weight:400;margin-bottom:10px;"><input type="checkbox" id="hubQrMtMand" checked style="width:auto;" /> Mandatory (counts toward Parade Ready)</label>' +
      '<button type="button" class="btn btn-primary" id="hubQrMtCreate">☘ Create meeting</button>' +
      '<p id="hubQrMtMsg" style="font-size:14px;min-height:1.2em;margin:8px 0 0;" aria-live="polite"></p>' +
      '<h3 style="font-family:var(--display);color:var(--green-800);margin:18px 0 8px;">📲 Upcoming meetings</h3>' +
      '<div id="hubQrMeetingList"></div></div>' +

      /* ---- Handy squares ---- */
      '<h3 style="font-family:var(--display);color:var(--green-800);margin:0 0 8px;">Tonight&rsquo;s handy squares</h3>' +
      '<p style="font-size:13px;color:var(--muted);margin:0 0 8px;">Untracked one-taps. To count scans on one of these, create it in the library above instead.</p>' +
      quickRow("Pay member dues", "Meeting slide / postcard", dues) +
      quickRow("Log volunteer hours", "Warehouse door → login → form", hours) +
      quickRow("Krewe store", "Whole shop, not one product", store) +
      quickRow("Members Facebook group", "Welcome packet", fbMem) +
      quickRow("Help / secretary", "Report a problem", help) +
      '<p style="font-size:13px;color:var(--muted);margin:14px 0 0;">Raffle basket QRs stay on the <a href="' +
      esc(raffle) +
      '" target="_blank" rel="noopener">raffle print sheet</a>.</p>' +
      "</div>";

    /* Library wiring */
    document.getElementById("hubQrLibSave").onclick = function () { saveLibraryCode(client); };
    document.getElementById("hubQrLibCancel").onclick = function () { libSetForm(null); };
    document.getElementById("hubQrLibPrint").onclick = printLibrarySheet;
    document.getElementById("hubQrLibLabel").addEventListener("input", function () {
      var slugEl = document.getElementById("hubQrLibSlug");
      if (!libEditing && slugEl && !slugEl.dataset.touched) slugEl.value = slugify(this.value);
    });
    document.getElementById("hubQrLibSlug").addEventListener("input", function () {
      this.dataset.touched = "1";
    });
    loadLibrary(client);
    window.kosRefreshQrLibrary = function () { loadLibrary(client); };

    /* Meeting wiring */
    var listEl = document.getElementById("hubQrMeetingList");
    document.getElementById("hubQrMtCreate").onclick = function () {
      createMeeting(client, listEl);
    };
    card.querySelectorAll("[data-qr-url]").forEach(function (btn) {
      btn.onclick = function () {
        paintLinkQR(btn);
      };
    });
    loadMeetings(client, listEl);
    window.kosRefreshQrMeetings = function () {
      loadMeetings(client, listEl);
    };
    if (typeof window.kosRefreshOfficerDesk === "function") window.kosRefreshOfficerDesk();
  }

  async function boot() {
    var client = window.__kosSb || window.supabase || null;
    for (var i = 0; i < 40 && !client; i++) {
      await new Promise(function (r) {
        setTimeout(r, 150);
      });
      client = window.__kosSb || window.supabase || null;
    }
    if (!client) return;
    var officer = false;
    try {
      var res = await client.rpc("is_krewe_officer");
      officer = !!res.data;
    } catch (e) {
      officer = false;
    }
    if (!officer) return;
    loadCard(client);
  }

  var _unlock = window.kosUnlock;
  window.kosUnlock = function () {
    if (typeof _unlock === "function") _unlock();
    setTimeout(boot, 100);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 500);
    });
  } else setTimeout(boot, 500);
})();
