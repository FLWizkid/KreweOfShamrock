/* QR Code Studio — Officer desk: meeting check-in + handy link QRs.
   Split out of Reports so QR tools are a first-class officer feature. */
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

    card.innerHTML =
      '<div class="app-head"><span class="ic">▦</span><div><h2>QR Code Studio</h2>' +
      "<small>Meeting check-in and handy deep-link QR codes</small></div></div>" +
      '<div class="app-body">' +
      '<p style="font-size:14px;color:var(--muted);margin:0 0 14px;line-height:1.45;">' +
      "A QR code is just a link drawn as a square. Create the thing first, then make its square. " +
      "<b>Event Studio</b> has RSVP / door QR. <b>Shop Studio</b> has product QR. " +
      "This studio covers meeting check-in and tonight&rsquo;s handy links.</p>" +
      '<div style="margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid rgba(168,128,28,.25);">' +
      '<h3 style="font-family:var(--display);color:var(--green-800);margin:0 0 10px;">➕ Schedule a meeting</h3>' +
      '<div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:10px;">' +
      '<div><label for="hubQrMtName" style="display:block;font-size:13px;color:var(--muted);margin-bottom:4px;">Meeting name</label>' +
      '<input id="hubQrMtName" placeholder="e.g. February parade briefing" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(168,128,28,.4);font:inherit;box-sizing:border-box;" /></div>' +
      '<div><label for="hubQrMtWhen" style="display:block;font-size:13px;color:var(--muted);margin-bottom:4px;">Date &amp; time</label>' +
      '<input id="hubQrMtWhen" type="datetime-local" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(168,128,28,.4);font:inherit;box-sizing:border-box;" /></div></div>' +
      '<label style="display:flex;align-items:center;gap:8px;font-weight:400;margin-bottom:10px;"><input type="checkbox" id="hubQrMtMand" checked style="width:auto;" /> Mandatory (counts toward Parade Ready)</label>' +
      '<button type="button" class="btn btn-primary" id="hubQrMtCreate">☘ Create meeting</button>' +
      '<p id="hubQrMtMsg" style="font-size:14px;min-height:1.2em;margin:8px 0 0;" aria-live="polite"></p>' +
      '<h3 style="font-family:var(--display);color:var(--green-800);margin:18px 0 8px;">📲 Upcoming meetings</h3>' +
      '<div id="hubQrMeetingList"></div></div>' +
      '<h3 style="font-family:var(--display);color:var(--green-800);margin:0 0 8px;">Tonight&rsquo;s handy squares</h3>' +
      quickRow("Pay member dues", "Meeting slide / postcard", dues) +
      quickRow("Log volunteer hours", "Warehouse door → login → form", hours) +
      quickRow("Krewe store", "Whole shop, not one product", store) +
      quickRow("Members Facebook group", "Welcome packet", fbMem) +
      quickRow("Help / secretary", "Report a problem", help) +
      '<p style="font-size:13px;color:var(--muted);margin:14px 0 0;">Raffle basket QRs stay on the <a href="' +
      esc(raffle) +
      '" target="_blank" rel="noopener">raffle print sheet</a>.</p>' +
      "</div>";

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
