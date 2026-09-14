/* Reports — companion to members-desk.js and kos-event-studio.js.
   Officers, board members, and committee chairs run attendance and
   fundraising reports. Data comes from three security-definer functions
   (see sql/kos_legacy_import_and_reports.sql); each re-checks
   can_manage_events() server-side, so the UI is not the security boundary. */
(function () {
  "use strict";

  var CSS = [
    ".hub-report-controls{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin:10px 0 14px;}",
    ".hub-report-controls label{display:block;font-size:13px;color:var(--muted);margin-bottom:3px;}",
    ".hub-report-controls select,.hub-report-controls input{padding:8px 10px;border:1px solid rgba(168,128,28,.4);border-radius:8px;font:inherit;background:#fff;}",
    ".hub-report-totals{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0;}",
    ".hub-report-chip{background:#fffdf4;border:1px solid rgba(168,128,28,.35);border-radius:12px;padding:10px 16px;}",
    ".hub-report-chip b{display:block;font-family:var(--display);font-size:22px;color:var(--green-800);}",
    ".hub-report-chip span{font-size:12px;color:var(--muted);}",
    ".hub-report-tablewrap{overflow-x:auto;border:1px solid rgba(168,128,28,.3);border-radius:12px;}",
    ".hub-report-table{width:100%;border-collapse:collapse;font-size:14px;min-width:560px;}",
    ".hub-report-table th{background:linear-gradient(180deg,var(--green-700),var(--green-800));color:#fff;text-align:left;padding:8px 10px;font-family:var(--display);font-weight:600;font-size:13px;}",
    ".hub-report-table td{padding:7px 10px;border-top:1px solid rgba(168,128,28,.18);vertical-align:top;}",
    ".hub-report-table tr:nth-child(even) td{background:#fffdf4;}",
    ".hub-report-msg{min-height:1.2em;color:var(--green-800);font-size:14px;margin:8px 0 0;}",
    ".hub-report-section{margin-top:20px;padding-top:16px;border-top:1px dashed rgba(168,128,28,.4);}",
    ".hub-report-section h3{font-family:var(--display);color:var(--green-800);margin:0 0 4px;font-size:18px;}",
    ".hub-report-section .sub{font-size:13px;color:var(--muted);margin:0 0 8px;}",
  ].join("");

  function injectCss() {
    if (document.getElementById("kosReportsCss")) return;
    var s = document.createElement("style");
    s.id = "kosReportsCss";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(v) {
    return (v == null ? "" : String(v)).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function dollars(cents) {
    return "$" + (Number(cents || 0) / 100).toLocaleString([], {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  function when(value) {
    if (!value) return "";
    var d = new Date(value);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
  }

  // Build a CSV file in the browser and hand it to the officer as a download.
  function downloadCsv(filename, headers, rows) {
    function cell(v) {
      v = v == null ? "" : String(v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }
    var text = [headers].concat(rows).map(function (r) { return r.map(cell).join(","); }).join("\r\n");
    var blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function slug(s) {
    return (s || "report").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
  }

  var lastEventReport = null;
  var lastMoneyReport = null;

  function renderEventReport(report) {
    var target = document.getElementById("hubReportEventOut");
    if (!target) return;
    var t = report.totals || {};
    var rows = (report.attendees || []).map(function (a) {
      var guestCell = a.guests ? esc(a.guests) : "";
      if (a.guest_names) guestCell = (guestCell ? guestCell + " · " : "") + esc(String(a.guest_names).slice(0, 80));
      var raffleCell = (a.raffle_tickets != null && Number(a.raffle_tickets) > 0) ? esc(a.raffle_tickets) : "";
      return '<tr><td>' + esc(a.name) + '</td><td>' + esc(a.email || "") + '</td>' +
        '<td>' + esc(a.detail || "") + '</td><td>' + esc(a.status || "") + '</td>' +
        '<td style="text-align:center;">' + guestCell + '</td>' +
        '<td style="text-align:center;">' + raffleCell + '</td>' +
        '<td style="text-align:right;">' + (a.amount_cents != null ? dollars(a.amount_cents) : "") + '</td>' +
        '<td style="text-align:center;">' + (a.checked_in ? "✔" : "") + '</td>' +
        '<td>' + esc(a.source || "") + '</td></tr>';
    }).join("");
    target.innerHTML =
      '<div class="hub-report-totals">' +
      '<div class="hub-report-chip"><b>' + esc(t.expected_headcount || 0) + '</b><span>expected attendees (incl. guests)</span></div>' +
      '<div class="hub-report-chip"><b>' + dollars(t.raised_cents) + '</b><span>raised for this event</span></div>' +
      (Number(t.pending_cents || 0) > 0 ? '<div class="hub-report-chip"><b>' + dollars(t.pending_cents) + '</b><span>still unpaid</span></div>' : '') +
      (Number(t.pending_zeffy_signups || 0) > 0 ? '<div class="hub-report-chip"><b>' + esc(t.pending_zeffy_signups) + '</b><span>pending Zeffy checkout</span></div>' : '') +
      '<div class="hub-report-chip"><b>' + esc(t.checked_in || 0) + '</b><span>checked in</span></div>' +
      '</div>' +
      (rows
        ? '<div class="hub-report-tablewrap"><table class="hub-report-table"><thead><tr>' +
          '<th>Name</th><th>Email</th><th>Ticket / role</th><th>Status</th><th>Guests</th><th>Raffle</th><th>Paid</th><th>In</th><th>Source</th>' +
          '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
          '<div style="margin-top:10px;"><button class="btn" type="button" id="hubReportEventCsv">⬇ Download attendee list (CSV)</button></div>'
        : '<p class="empty">No sign-ups recorded for this event yet.</p>');
    var csvBtn = document.getElementById("hubReportEventCsv");
    if (csvBtn) csvBtn.addEventListener("click", function () {
      downloadCsv(slug((report.event || {}).title) + "-attendees.csv",
        ["Name", "Email", "Ticket/role", "Status", "Guests", "Guest names", "Raffle", "Paid", "Checked in", "Source"],
        (report.attendees || []).map(function (a) {
          return [a.name, a.email || "", a.detail || "", a.status || "", a.guests || 0,
            a.guest_names || "", a.raffle_tickets || 0,
            a.amount_cents != null ? (a.amount_cents / 100).toFixed(2) : "", a.checked_in ? "yes" : "", a.source || ""];
        }));
    });
  }

  function renderMoneyReport(report) {
    var target = document.getElementById("hubReportMoneyOut");
    if (!target) return;
    var cats = (report.by_category || []).map(function (c) {
      return '<tr><td>' + esc(c.category) + '</td><td style="text-align:right;">' + dollars(c.total_cents) +
        '</td><td style="text-align:right;">' + esc(c.payments) + '</td></tr>';
    }).join("");
    var evs = (report.by_event || []).map(function (e) {
      return '<tr><td>' + esc(e.title) + '</td><td>' + esc(when(e.start_time)) +
        '</td><td style="text-align:right;">' + dollars(e.raised_cents) +
        '</td><td style="text-align:right;">' + esc(e.headcount) + '</td></tr>';
    }).join("");
    target.innerHTML =
      '<div class="hub-report-totals"><div class="hub-report-chip"><b>' + dollars(report.total_cents) +
      '</b><span>total received in this period</span></div></div>' +
      '<div class="hub-report-tablewrap"><table class="hub-report-table"><thead><tr>' +
      '<th>Category</th><th style="text-align:right;">Received</th><th style="text-align:right;">Payments</th>' +
      '</tr></thead><tbody>' + (cats || '<tr><td colspan="3">No payments in this period.</td></tr>') + '</tbody></table></div>' +
      '<h3 style="font-family:var(--display);color:var(--green-800);font-size:16px;margin:16px 0 8px;">By event</h3>' +
      '<div class="hub-report-tablewrap"><table class="hub-report-table"><thead><tr>' +
      '<th>Event</th><th>Date</th><th style="text-align:right;">Raised</th><th style="text-align:right;">Attendees</th>' +
      '</tr></thead><tbody>' + (evs || '<tr><td colspan="4">No events in this period.</td></tr>') + '</tbody></table></div>' +
      '<div style="margin-top:10px;"><button class="btn" type="button" id="hubReportMoneyCsv">⬇ Download fundraising summary (CSV)</button></div>';
    var csvBtn = document.getElementById("hubReportMoneyCsv");
    if (csvBtn) csvBtn.addEventListener("click", function () {
      var rows = [["BY CATEGORY", "", "", ""]]
        .concat((report.by_category || []).map(function (c) {
          return [c.category, "", (c.total_cents / 100).toFixed(2), c.payments];
        }))
        .concat([["", "", "", ""], ["BY EVENT", "", "", ""]])
        .concat((report.by_event || []).map(function (e) {
          return [e.title, when(e.start_time), (e.raised_cents / 100).toFixed(2), e.headcount];
        }))
        .concat([["", "", "", ""], ["TOTAL", "", (Number(report.total_cents || 0) / 100).toFixed(2), ""]]);
      downloadCsv("kos-fundraising-summary.csv", ["Item", "Date", "Dollars", "Count"], rows);
    });
  }

  async function loadOptions(client) {
    var select = document.getElementById("hubReportEvent");
    var msg = document.getElementById("hubReportMsg");
    try {
      var res = await client.rpc("officer_report_options");
      if (res.error) throw res.error;
      if (!res.data || res.data.ok === false) throw new Error((res.data && res.data.message) || "Not authorized.");
      var events = res.data.events || [];
      select.innerHTML = '<option value="">Select an event…</option>';
      events.forEach(function (ev) {
        var opt = document.createElement("option");
        opt.value = ev.key;
        var count = Number(ev.site_rsvps || 0) + Number(ev.legacy_regs || 0);
        opt.textContent = (ev.title || "Untitled event") +
          (ev.start_time ? " (" + when(ev.start_time) + ")" : "") +
          (count ? " · " + count + " sign-up" + (count === 1 ? "" : "s") : "");
        select.appendChild(opt);
      });
    } catch (e) {
      if (msg) msg.textContent = "Couldn't load the event list: " + ((e && e.message) || e);
    }
  }

  async function runEventReport(client) {
    var key = (document.getElementById("hubReportEvent") || {}).value;
    var msg = document.getElementById("hubReportMsg");
    var out = document.getElementById("hubReportEventOut");
    if (!key) { if (msg) msg.textContent = "Choose an event first."; return; }
    if (msg) msg.textContent = "Running report…";
    try {
      var res = await client.rpc("officer_event_report", { p_key: key });
      if (res.error) throw res.error;
      if (!res.data || res.data.ok === false) throw new Error((res.data && res.data.message) || "Report failed.");
      lastEventReport = res.data;
      if (msg) msg.textContent = "";
      renderEventReport(res.data);
    } catch (e) {
      if (out) out.innerHTML = "";
      if (msg) msg.textContent = "Couldn't run the report: " + ((e && e.message) || e);
    }
  }

  async function runMoneyReport(client) {
    var from = (document.getElementById("hubReportFrom") || {}).value || null;
    var to = (document.getElementById("hubReportTo") || {}).value || null;
    var msg = document.getElementById("hubReportMoneyMsg");
    var out = document.getElementById("hubReportMoneyOut");
    if (msg) msg.textContent = "Running summary…";
    try {
      var res = await client.rpc("officer_fundraising_report", { p_from: from, p_to: to });
      if (res.error) throw res.error;
      if (!res.data || res.data.ok === false) throw new Error((res.data && res.data.message) || "Report failed.");
      lastMoneyReport = res.data;
      if (msg) msg.textContent = "";
      renderMoneyReport(res.data);
    } catch (e) {
      if (out) out.innerHTML = "";
      if (msg) msg.textContent = "Couldn't run the summary: " + ((e && e.message) || e);
    }
  }

  async function loadReports(client) {
    var panel = document.getElementById("hubOfficer");
    if (!panel) return;
    var card = document.getElementById("hubReports");
    if (!card) {
      card = document.createElement("section");
      card.className = "app-card";
      card.id = "hubReports";
      var studio = document.getElementById("hubEventStudio");
      if (studio && studio.nextSibling) panel.insertBefore(card, studio.nextSibling);
      else panel.appendChild(card);
    }
    card.innerHTML =
      '<div class="app-head"><span class="ic">📊</span><div><h2>Reports</h2>' +
      '<small>Who is coming and how much has been raised</small></div></div>' +
      '<div class="app-body">' +
      '<div class="hub-report-section" style="border-top:0;padding-top:0;margin-top:0;">' +
      '<h3>Event report</h3>' +
      '<p class="sub">Website RSVPs and old-site (Wild Apricot) registrations together: attendees, guests, check-ins, and money raised.</p>' +
      '<div class="hub-report-controls">' +
      '<div style="flex:1;min-width:240px;"><label for="hubReportEvent">Event</label>' +
      '<select id="hubReportEvent" style="width:100%;"><option value="">Loading events…</option></select></div>' +
      '<button class="btn btn-primary" type="button" id="hubReportRun">☘ Run report</button>' +
      '</div><p class="hub-report-msg" id="hubReportMsg" aria-live="polite"></p>' +
      '<div id="hubReportEventOut"></div></div>' +
      '<div class="hub-report-section">' +
      '<h3>Fundraising summary</h3>' +
      '<p class="sub">Money received by category and by event. Leave the dates blank for all time.</p>' +
      '<div class="hub-report-controls">' +
      '<div><label for="hubReportFrom">From</label><input id="hubReportFrom" type="date" /></div>' +
      '<div><label for="hubReportTo">To</label><input id="hubReportTo" type="date" /></div>' +
      '<button class="btn btn-primary" type="button" id="hubReportMoneyRun">☘ Run summary</button>' +
      '</div><p class="hub-report-msg" id="hubReportMoneyMsg" aria-live="polite"></p>' +
      '<div id="hubReportMoneyOut"></div></div></div>';
    document.getElementById("hubReportRun").addEventListener("click", function () { runEventReport(client); });
    document.getElementById("hubReportMoneyRun").addEventListener("click", function () { runMoneyReport(client); });
    await loadOptions(client);
    if (typeof window.kosRefreshOfficerDesk === "function") window.kosRefreshOfficerDesk();
  }

  async function bootReports() {
    injectCss();
    var client = window.__kosSb || null;
    for (var i = 0; i < 40 && !client; i++) {
      await new Promise(function (r) { setTimeout(r, 150); });
      client = window.__kosSb || null;
    }
    if (!client) return;
    var can = false;
    try {
      var res = await client.rpc("can_manage_events");
      can = !!res.data;
    } catch (e) { can = false; }
    if (!can) return;
    await loadReports(client);
    if (typeof window.kosRefreshOfficerDesk === "function") window.kosRefreshOfficerDesk();
  }

  var _unlock = window.kosUnlock;
  window.kosUnlock = function () {
    if (typeof _unlock === "function") _unlock();
    setTimeout(bootReports, 120);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(bootReports, 500); });
  else setTimeout(bootReports, 500);
})();
