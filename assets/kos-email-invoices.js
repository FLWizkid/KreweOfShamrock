/* Officer desk: Email members + Send invoices.
   Uses officer_* RPCs → outbound_emails (Resend) / dues_payments. */
(function () {
  var CSS =
    ".hub-ei label{display:block;font-size:13px;color:var(--muted);margin:0 0 4px;}" +
    ".hub-ei input[type=text],.hub-ei input[type=number],.hub-ei input[type=search],.hub-ei textarea,.hub-ei select{" +
    "width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;border:1px solid rgba(168,128,28,.35);" +
    "background:#fff;font:inherit;font-size:16px;min-height:48px;}" +
    ".hub-ei textarea{min-height:140px;resize:vertical;}" +
    ".hub-ei .hub-ei-grid{display:grid;gap:14px;margin-top:8px;}" +
    ".hub-ei .hub-ei-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px;}" +
    ".hub-ei .hub-ei-row .btn{min-height:48px;padding:12px 18px;font-size:16px;}" +
    ".hub-ei .hub-ei-msg{margin:10px 0 0;font-size:14px;min-height:1.2em;}" +
    ".hub-ei .hub-ei-msg.ok{color:#1d6b3e;}" +
    ".hub-ei .hub-ei-msg.err{color:#b3261e;}" +
    ".hub-ei .hub-ei-note{margin:8px 0 0;font-size:13px;color:var(--muted);line-height:1.45;}" +
    ".hub-ei .hub-ei-pills{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 4px;}" +
    ".hub-ei .hub-ei-pill{appearance:none;border:1px solid rgba(168,128,28,.4);background:#fff;border-radius:999px;" +
    "padding:10px 14px;font:inherit;font-size:14px;min-height:44px;cursor:pointer;}" +
    ".hub-ei .hub-ei-pill.on{background:#14532d;color:#fff;border-color:#14532d;}" +
    ".hub-ei .hub-ei-list{max-height:240px;overflow:auto;border:1px solid rgba(168,128,28,.25);border-radius:12px;" +
    "background:#fff;margin-top:8px;}" +
    ".hub-ei .hub-ei-item{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;" +
    "border-top:1px solid rgba(168,128,28,.18);font-size:15px;}" +
    ".hub-ei .hub-ei-item:first-child{border-top:0;}" +
    ".hub-ei .hub-ei-item input{margin-top:3px;width:20px;height:20px;}" +
    ".hub-ei .hub-ei-item .meta{font-size:12px;color:var(--muted);margin-top:2px;}" +
    ".hub-ei .hub-ei-preview{border:1px solid rgba(168,128,28,.4);border-radius:10px;overflow:hidden;" +
    "background:#f6efdd;max-width:420px;font-size:13px;line-height:1.45;margin-top:8px;}" +
    ".hub-ei .hub-ei-prev-hdr{display:flex;gap:10px;align-items:center;padding:10px 12px;" +
    "background:linear-gradient(180deg,#14532d,#0c3b21);border-bottom:3px solid #d4af37;color:#fff;}" +
    ".hub-ei .hub-ei-prev-hdr img{width:36px;height:36px;border-radius:50%;background:#fff;}" +
    ".hub-ei .hub-ei-prev-body{background:#fff;padding:14px;color:#23291f;}" +
    ".hub-ei .hub-ei-prev-body h1{margin:0 0 10px;font-family:var(--display);font-size:16px;color:#14532d;}" +
    ".hub-ei .hub-ei-history{margin-top:22px;border-top:1px solid rgba(168,128,28,.25);padding-top:14px;}" +
    ".hub-ei .hub-ei-history h3{margin:0 0 10px;font-family:var(--display);font-size:17px;}" +
    ".hub-ei .hub-ei-hrow{padding:10px 0;border-top:1px solid rgba(168,128,28,.2);font-size:14px;}" +
    ".hub-ei .hub-ei-hrow:first-of-type{border-top:0;}" +
    ".hub-ei .hub-ei-confirm{display:flex;gap:10px;align-items:flex-start;margin:12px 0 4px;font-size:14px;line-height:1.4;}" +
    ".hub-ei .hub-ei-confirm input{margin-top:3px;width:20px;height:20px;}";

  var LOGO = "https://www.kreweofshamrock.com/assets/img/emblem-shamrock.png";
  var ZEFFY_DUES = "https://www.zeffy.com/en-US/ticketing/krewe-of-shamrock-membership";
  var ZEFFY_LOA = "https://www.zeffy.com/en-US/ticketing/krewe-of-shamrock-membership-2";

  var emailState = { audience: "active", selected: {}, counts: {} };
  var invState = { filter: "unpaid", selected: {}, targets: [] };

  function injectCss() {
    if (document.getElementById("kosEmailInvoicesCss")) return;
    var s = document.createElement("style");
    s.id = "kosEmailInvoicesCss";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(v) {
    return (v == null ? "" : String(v)).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function when(value) {
    if (!value) return "";
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function toHtml(body) {
    var t = (body || "").trim();
    if (!t) return "";
    if (/<[a-z][\s\S]*>/i.test(t)) return t;
    return t.split(/\n{2,}/).map(function (p) {
      return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }

  function selectedIds(map) {
    return Object.keys(map).filter(function (k) { return map[k]; });
  }

  function setMsg(id, text, kind) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || "";
    el.className = "hub-ei-msg" + (kind ? " " + kind : "");
  }

  function ensureCard(id, title, desc, icon) {
    var panel = document.getElementById("hubOfficer");
    if (!panel) return null;
    var card = document.getElementById(id);
    if (!card) {
      card = document.createElement("section");
      card.className = "app-card";
      card.id = id;
      panel.appendChild(card);
    }
    return card;
  }

  function updateEmailPreview() {
    var box = document.getElementById("hubEmPreview");
    if (!box) return;
    var subject = val("hubEmSubject") || "Your subject here";
    var bodyHtml = toHtml(val("hubEmBody")) || "<p><em>Message preview…</em></p>";
    box.innerHTML =
      '<div class="hub-ei-prev-hdr"><img src="' + LOGO + '" alt="" />' +
      '<div><div style="font-family:var(--display);font-size:14px;">Krewe of Shamrock</div>' +
      '<div style="font-size:10px;color:#ecd07e;margin-top:2px;">Since 1999</div></div></div>' +
      '<div class="hub-ei-prev-body"><h1>' + esc(subject) + "</h1>" + bodyHtml + "</div>";
  }

  function renderPickList(targetId, rows, stateMap, opts) {
    var target = document.getElementById(targetId);
    if (!target) return;
    opts = opts || {};
    if (!rows || !rows.length) {
      target.innerHTML = '<p class="empty" style="padding:12px;">No members match.</p>';
      return;
    }
    var html = "";
    rows.forEach(function (m) {
      var id = m.id;
      var checked = stateMap[id] ? " checked" : "";
      var extra = opts.extra ? opts.extra(m) : "";
      html +=
        '<label class="hub-ei-item"><input type="checkbox" data-id="' + esc(id) + '"' + checked + " />" +
        "<div><b>" + esc(m.first_name || "") + " " + esc(m.last_name || "") + "</b>" +
        '<div class="meta">' + esc(m.email || "") +
        (m.officer_title ? " · " + esc(m.officer_title) : "") +
        extra +
        "</div></div></label>";
    });
    target.innerHTML = html;
    target.querySelectorAll("input[type=checkbox]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var mid = cb.getAttribute("data-id");
        if (cb.checked) stateMap[mid] = true;
        else delete stateMap[mid];
        if (typeof opts.onChange === "function") opts.onChange();
      });
    });
  }

  async function loadEmailHistory(client) {
    var target = document.getElementById("hubEmHistory");
    if (!target) return;
    try {
      var res = await client.rpc("officer_list_outreach_log", { p_kind: "email", p_limit: 30 });
      if (res.error) throw res.error;
      var items = (res.data && res.data.items) || [];
      if (!items.length) {
        target.innerHTML = '<p class="empty">No officer emails logged yet.</p>';
        return;
      }
      target.innerHTML = items.map(function (m) {
        return (
          '<div class="hub-ei-hrow"><b>' + esc(m.subject || "(no subject)") + "</b>" +
          '<div class="meta" style="color:var(--muted);font-size:13px;margin-top:2px;">' +
          esc(when(m.created_at)) + " · " + esc(m.audience || "") +
          " · " + (m.recipient_count != null ? m.recipient_count + " recipients" : "") +
          "</div></div>"
        );
      }).join("");
    } catch (e) {
      target.innerHTML = '<p class="empty">Could not load history.</p>';
    }
  }

  async function refreshAudienceCounts(client) {
    try {
      var res = await client.rpc("officer_email_audience_counts");
      if (res.error) throw res.error;
      emailState.counts = res.data || {};
      var cActive = document.getElementById("hubEmCountActive");
      var cOff = document.getElementById("hubEmCountOfficers");
      var cCh = document.getElementById("hubEmCountChairs");
      if (cActive) cActive.textContent = emailState.counts.active != null ? "(" + emailState.counts.active + ")" : "";
      if (cOff) cOff.textContent = emailState.counts.officers != null ? "(" + emailState.counts.officers + ")" : "";
      if (cCh) cCh.textContent = emailState.counts.chairs != null ? "(" + emailState.counts.chairs + ")" : "";
    } catch (e) {}
  }

  function setAudience(aud) {
    emailState.audience = aud;
    ["active", "officers", "chairs", "selected"].forEach(function (a) {
      var btn = document.getElementById("hubEmAud_" + a);
      if (btn) btn.classList.toggle("on", a === aud);
    });
    var pick = document.getElementById("hubEmPickWrap");
    if (pick) pick.style.display = aud === "selected" ? "" : "none";
  }

  async function searchRoster(client) {
    var q = val("hubEmSearch");
    var res = await client.rpc("officer_search_roster", { p_q: q, p_limit: 50 });
    if (res.error) throw res.error;
    var members = (res.data && res.data.members) || [];
    renderPickList("hubEmPickList", members, emailState.selected);
  }

  async function sendEmail(client) {
    var subject = val("hubEmSubject");
    var bodyRaw = val("hubEmBody");
    var confirm = document.getElementById("hubEmConfirm");
    var btn = document.getElementById("hubEmSend");
    if (!subject) { setMsg("hubEmMsg", "Subject is required.", "err"); return; }
    if (!bodyRaw) { setMsg("hubEmMsg", "Message body is required.", "err"); return; }
    if (!confirm || !confirm.checked) {
      setMsg("hubEmMsg", "Please confirm you are ready to queue this email.", "err");
      return;
    }
    var ids = selectedIds(emailState.selected);
    if (emailState.audience === "selected" && !ids.length) {
      setMsg("hubEmMsg", "Pick at least one member from the roster.", "err");
      return;
    }
    var who =
      emailState.audience === "active" ? "ALL active members" :
      emailState.audience === "officers" ? "officers and board" :
      emailState.audience === "chairs" ? "chairs / officers / board" :
      ids.length + " selected member(s)";
    if (!window.confirm("Queue this email for " + who + "?")) return;
    if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
    setMsg("hubEmMsg", "");
    try {
      var res = await client.rpc("officer_send_member_email", {
        p_subject: subject,
        p_body_html: toHtml(bodyRaw),
        p_audience: emailState.audience,
        p_member_ids: emailState.audience === "selected" ? ids : null
      });
      if (res.error) throw res.error;
      var data = res.data || {};
      if (data.ok === false) throw new Error(data.message || "Could not send.");
      setMsg(
        "hubEmMsg",
        "Queued for " + (data.recipient_count != null ? data.recipient_count : "?") +
          " recipient(s). Delivery runs through the outbound email queue (Resend).",
        "ok"
      );
      document.getElementById("hubEmSubject").value = "";
      document.getElementById("hubEmBody").value = "";
      confirm.checked = false;
      emailState.selected = {};
      updateEmailPreview();
      await loadEmailHistory(client);
    } catch (e) {
      setMsg("hubEmMsg", "Could not send: " + ((e && e.message) || e), "err");
    }
    if (btn) { btn.disabled = false; btn.textContent = "Send email"; }
  }

  async function loadEmailCard(client) {
    var card = ensureCard("hubEmailMembers");
    if (!card) return;
    card.innerHTML =
      '<div class="app-head"><span class="ic">✉️</span><div><h2>Email members</h2>' +
      "<small>Write once, choose who gets it, preview, then send</small></div></div>" +
      '<div class="app-body hub-ei">' +
      '<p class="hub-ei-note">Uses the same branded Shamrock template and outbound queue as All Krewe Messages. Officers and secretary only.</p>' +
      '<div class="hub-ei-grid">' +
      "<div><label>Audience</label>" +
      '<div class="hub-ei-pills" role="group" aria-label="Email audience">' +
      '<button type="button" class="hub-ei-pill on" id="hubEmAud_active">All active <span id="hubEmCountActive"></span></button>' +
      '<button type="button" class="hub-ei-pill" id="hubEmAud_officers">Officers &amp; board <span id="hubEmCountOfficers"></span></button>' +
      '<button type="button" class="hub-ei-pill" id="hubEmAud_chairs">Chairs / officers <span id="hubEmCountChairs"></span></button>' +
      '<button type="button" class="hub-ei-pill" id="hubEmAud_selected">Pick from roster</button>' +
      "</div></div>" +
      '<div id="hubEmPickWrap" style="display:none;">' +
      '<label for="hubEmSearch">Search roster</label>' +
      '<input id="hubEmSearch" type="search" placeholder="Name or email" autocomplete="off" />' +
      '<div class="hub-ei-list" id="hubEmPickList"><p class="empty" style="padding:12px;">Type to search…</p></div></div>' +
      '<div><label for="hubEmSubject">Subject</label><input id="hubEmSubject" type="text" maxlength="200" placeholder="e.g. Meeting reminder" /></div>' +
      '<div><label for="hubEmBody">Message</label><textarea id="hubEmBody" placeholder="Plain text is fine. Keep it warm and clear."></textarea></div>' +
      '<div><label>Preview</label><div class="hub-ei-preview" id="hubEmPreview" aria-live="polite"></div></div>' +
      "</div>" +
      '<label class="hub-ei-confirm"><input type="checkbox" id="hubEmConfirm" />' +
      "<span>I understand this will queue email for the audience I chose.</span></label>" +
      '<div class="hub-ei-row"><button class="btn btn-primary" type="button" id="hubEmSend">Send email</button></div>' +
      '<p class="hub-ei-msg" id="hubEmMsg" aria-live="polite"></p>' +
      '<div class="hub-ei-history"><h3>Recent emails</h3><div id="hubEmHistory"><p class="empty">Loading…</p></div></div>' +
      "</div>";

    ["active", "officers", "chairs", "selected"].forEach(function (a) {
      var btn = document.getElementById("hubEmAud_" + a);
      if (btn) btn.addEventListener("click", function () { setAudience(a); });
    });
    var search = document.getElementById("hubEmSearch");
    var searchTimer = null;
    if (search) {
      search.addEventListener("input", function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          searchRoster(client).catch(function () {});
        }, 220);
      });
    }
    document.getElementById("hubEmSend").addEventListener("click", function () { sendEmail(client); });
    ["hubEmSubject", "hubEmBody"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", updateEmailPreview);
    });
    setAudience("active");
    updateEmailPreview();
    await refreshAudienceCounts(client);
    await loadEmailHistory(client);
  }

  async function loadInvoiceTargets(client) {
    var yearEl = document.getElementById("hubInvYear");
    var year = yearEl && yearEl.value ? parseInt(yearEl.value, 10) : new Date().getFullYear();
    var q = val("hubInvSearch");
    var filter = invState.filter;
    var res = await client.rpc("officer_list_invoice_targets", {
      p_filter: filter === "search" ? "search" : filter,
      p_year: year,
      p_q: q,
      p_limit: 100
    });
    if (res.error) throw res.error;
    invState.targets = (res.data && res.data.targets) || [];
    function refreshSelCount() {
      var count = document.getElementById("hubInvSelCount");
      if (count) count.textContent = selectedIds(invState.selected).length + " selected";
    }
    renderPickList("hubInvList", invState.targets, invState.selected, {
      extra: function (m) {
        var bits = [];
        if (m.membership_year) bits.push("year " + m.membership_year);
        if (m.amount != null) bits.push("$" + Number(m.amount).toFixed(2));
        if (m.paid) bits.push("paid");
        else bits.push("unpaid");
        return bits.length ? " · " + bits.join(" · ") : "";
      },
      onChange: refreshSelCount
    });
    refreshSelCount();
  }

  function setInvFilter(f) {
    invState.filter = f;
    ["unpaid", "active", "search"].forEach(function (a) {
      var btn = document.getElementById("hubInvFilt_" + a);
      if (btn) btn.classList.toggle("on", a === f);
    });
    var sw = document.getElementById("hubInvSearchWrap");
    if (sw) sw.style.display = f === "search" ? "" : "none";
  }

  async function loadInvoiceHistory(client) {
    var target = document.getElementById("hubInvHistory");
    if (!target) return;
    try {
      var res = await client.rpc("officer_list_outreach_log", { p_kind: "invoice", p_limit: 30 });
      if (res.error) throw res.error;
      var items = (res.data && res.data.items) || [];
      if (!items.length) {
        target.innerHTML = '<p class="empty">No invoices logged yet.</p>';
        return;
      }
      target.innerHTML = items.map(function (m) {
        var meta = m.meta || {};
        return (
          '<div class="hub-ei-hrow"><b>' + esc(m.subject || "Invoices") + "</b>" +
          '<div style="color:var(--muted);font-size:13px;margin-top:2px;">' +
          esc(when(m.created_at)) +
          " · " + (m.recipient_count != null ? m.recipient_count + " members" : "") +
          (meta.emailed != null ? " · emailed " + meta.emailed : "") +
          "</div></div>"
        );
      }).join("");
    } catch (e) {
      target.innerHTML = '<p class="empty">Could not load history.</p>';
    }
  }

  async function sendInvoices(client) {
    var ids = selectedIds(invState.selected);
    var btn = document.getElementById("hubInvSend");
    var confirm = document.getElementById("hubInvConfirm");
    if (!ids.length) { setMsg("hubInvMsg", "Select at least one member.", "err"); return; }
    if (!confirm || !confirm.checked) {
      setMsg("hubInvMsg", "Please confirm before creating invoices.", "err");
      return;
    }
    var year = parseInt(val("hubInvYear") || String(new Date().getFullYear()), 10);
    var type = val("hubInvType") || "dues_year";
    var amountRaw = val("hubInvAmount");
    var amount = amountRaw ? Number(amountRaw) : null;
    var note = val("hubInvNote");
    var sendEmail = !!(document.getElementById("hubInvEmail") && document.getElementById("hubInvEmail").checked);
    var payChoice = val("hubInvPayLink") || "full";
    var payUrl = payChoice === "loa" ? ZEFFY_LOA : ZEFFY_DUES;
    if (type === "custom" && !(amount > 0)) {
      setMsg("hubInvMsg", "Enter a positive custom amount.", "err");
      return;
    }
    if (!window.confirm(
      "Create invoices for " + ids.length + " member(s)" +
      (sendEmail ? " and email pay links" : "") + "?"
    )) return;
    if (btn) { btn.disabled = true; btn.textContent = "Working…"; }
    setMsg("hubInvMsg", "");
    try {
      var res = await client.rpc("officer_create_and_send_invoices", {
        p_member_ids: ids,
        p_year: year,
        p_amount: amount,
        p_note: note || null,
        p_invoice_type: type,
        p_send_email: sendEmail,
        p_pay_url: payUrl
      });
      if (res.error) throw res.error;
      var data = res.data || {};
      if (data.ok === false) throw new Error(data.message || "Could not create invoices.");
      setMsg("hubInvMsg", data.message || "Done.", "ok");
      invState.selected = {};
      await loadInvoiceTargets(client);
      await loadInvoiceHistory(client);
    } catch (e) {
      setMsg("hubInvMsg", "Could not create: " + ((e && e.message) || e), "err");
    }
    if (btn) { btn.disabled = false; btn.textContent = "Create invoices"; }
  }

  async function loadInvoiceCard(client) {
    var card = ensureCard("hubSendInvoices");
    if (!card) return;
    var y = new Date().getFullYear();
    card.innerHTML =
      '<div class="app-head"><span class="ic">🧾</span><div><h2>Send invoices</h2>' +
      "<small>Create dues invoices and optionally email a Zeffy pay link</small></div></div>" +
      '<div class="app-body hub-ei">' +
      '<p class="hub-ei-note">No card numbers are collected here. Members pay on Zeffy (or the Hub pay-dues path). Paid dues rows are never re-emailed.</p>' +
      '<div class="hub-ei-grid">' +
      "<div><label>Who to invoice</label>" +
      '<div class="hub-ei-pills">' +
      '<button type="button" class="hub-ei-pill on" id="hubInvFilt_unpaid">Unpaid dues</button>' +
      '<button type="button" class="hub-ei-pill" id="hubInvFilt_active">All active</button>' +
      '<button type="button" class="hub-ei-pill" id="hubInvFilt_search">Search roster</button>' +
      "</div></div>" +
      '<div id="hubInvSearchWrap" style="display:none;">' +
      '<label for="hubInvSearch">Search</label>' +
      '<input id="hubInvSearch" type="search" placeholder="Name or email" /></div>' +
      '<div><label for="hubInvYear">Membership year</label>' +
      '<input id="hubInvYear" type="number" min="2020" max="2100" value="' + y + '" /></div>' +
      '<div class="hub-ei-list" id="hubInvList"><p class="empty" style="padding:12px;">Loading…</p></div>' +
      '<p class="hub-ei-note" id="hubInvSelCount">0 selected</p>' +
      '<div><label for="hubInvType">Invoice type</label>' +
      '<select id="hubInvType"><option value="dues_year">Dues for year</option>' +
      '<option value="custom">Custom amount + note</option></select></div>' +
      '<div><label for="hubInvAmount">Amount (optional; default $375 for new rows)</label>' +
      '<input id="hubInvAmount" type="number" min="1" step="0.01" placeholder="375.00" /></div>' +
      '<div><label for="hubInvNote">Note (optional)</label>' +
      '<input id="hubInvNote" type="text" maxlength="300" placeholder="e.g. 2026 full membership" /></div>' +
      '<div><label for="hubInvPayLink">Pay link in email</label>' +
      '<select id="hubInvPayLink">' +
      '<option value="full">Full membership (Zeffy $375)</option>' +
      '<option value="loa">Leave of absence (Zeffy $100)</option></select></div>' +
      "</div>" +
      '<label class="hub-ei-confirm"><input type="checkbox" id="hubInvEmail" checked />' +
      "<span>Also email each member a pay link / invoice notice</span></label>" +
      '<label class="hub-ei-confirm"><input type="checkbox" id="hubInvConfirm" />' +
      "<span>I confirm these invoice records and any emails look right.</span></label>" +
      '<div class="hub-ei-row"><button class="btn btn-primary" type="button" id="hubInvSend">Create invoices</button></div>' +
      '<p class="hub-ei-msg" id="hubInvMsg" aria-live="polite"></p>' +
      '<div class="hub-ei-history"><h3>Recent invoice batches</h3><div id="hubInvHistory"><p class="empty">Loading…</p></div></div>' +
      "</div>";

    ["unpaid", "active", "search"].forEach(function (f) {
      var btn = document.getElementById("hubInvFilt_" + f);
      if (!btn) return;
      btn.addEventListener("click", function () {
        setInvFilter(f);
        invState.selected = {};
        loadInvoiceTargets(client).catch(function (e) {
          setMsg("hubInvMsg", (e && e.message) || "Could not load list.", "err");
        });
      });
    });
    var searchTimer = null;
    var search = document.getElementById("hubInvSearch");
    if (search) {
      search.addEventListener("input", function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          loadInvoiceTargets(client).catch(function () {});
        }, 220);
      });
    }
    var yearEl = document.getElementById("hubInvYear");
    if (yearEl) {
      yearEl.addEventListener("change", function () {
        loadInvoiceTargets(client).catch(function () {});
      });
    }
    document.getElementById("hubInvSend").addEventListener("click", function () { sendInvoices(client); });
    setInvFilter("unpaid");
    await loadInvoiceTargets(client);
    await loadInvoiceHistory(client);
  }

  async function boot() {
    injectCss();
    var client = window.__kosSb || null;
    for (var i = 0; i < 40 && !client; i++) {
      await new Promise(function (r) { setTimeout(r, 150); });
      client = window.__kosSb || null;
    }
    if (!client) return;
    var isOfficer = false;
    try {
      var res = await client.rpc("is_krewe_officer");
      isOfficer = !!res.data;
    } catch (e) {
      isOfficer = false;
    }
    if (!isOfficer) return;
    await loadEmailCard(client);
    await loadInvoiceCard(client);
    if (typeof window.kosRefreshOfficerDesk === "function") window.kosRefreshOfficerDesk();
  }

  var _unlock = window.kosUnlock;
  window.kosUnlock = function () {
    if (typeof _unlock === "function") _unlock();
    setTimeout(boot, 160);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 600); });
  } else {
    setTimeout(boot, 600);
  }
})();
