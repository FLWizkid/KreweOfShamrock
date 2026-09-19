/* All Krewe Messages — Officer desk compose + history.
   Queues via send_all_krewe_message → queue_broadcast (branded wrap) → outbound_emails. */
(function () {
  var CSS =
    ".hub-akm-form label{display:block;font-size:13px;color:var(--muted);margin:0 0 4px;}" +
    ".hub-akm-form input[type=text],.hub-akm-form textarea{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid rgba(168,128,28,.35);background:#fff;font:inherit;}" +
    ".hub-akm-form textarea{min-height:140px;resize:vertical;}" +
    ".hub-akm-form .hub-akm-grid{display:grid;gap:12px;margin-top:8px;}" +
    ".hub-akm-confirm{display:flex;gap:10px;align-items:flex-start;margin:12px 0 4px;font-size:14px;line-height:1.4;}" +
    ".hub-akm-confirm input{margin-top:3px;}" +
    ".hub-akm-msg{margin:10px 0 0;font-size:14px;min-height:1.2em;}" +
    ".hub-akm-msg.ok{color:#1d6b3e;}" +
    ".hub-akm-msg.err{color:#b3261e;}" +
    ".hub-akm-history{margin-top:22px;border-top:1px solid rgba(168,128,28,.25);padding-top:14px;}" +
    ".hub-akm-history h3{margin:0 0 10px;font-family:var(--display);font-size:18px;}" +
    ".hub-akm-row{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;padding:10px 0;border-top:1px solid rgba(168,128,28,.2);}" +
    ".hub-akm-row:first-of-type{border-top:0;}" +
    ".hub-akm-row .muted{font-size:13px;color:var(--muted);margin-top:4px;}" +
    ".hub-akm-row .count{white-space:nowrap;font-size:13px;color:var(--muted);}" +
    ".hub-akm-note{margin:8px 0 0;font-size:13px;color:var(--muted);line-height:1.45;}" +
    ".hub-akm-preview-wrap{margin-top:14px;}" +
    ".hub-akm-preview-wrap h4{margin:0 0 8px;font-size:14px;color:var(--muted);font-weight:600;}" +
    ".hub-akm-preview{border:1px solid rgba(168,128,28,.4);border-radius:10px;overflow:hidden;" +
    "background:#f6efdd;max-width:420px;font-size:13px;line-height:1.45;}" +
    ".hub-akm-prev-hdr{display:flex;gap:10px;align-items:center;padding:10px 12px;" +
    "background:linear-gradient(180deg,#14532d,#0c3b21);border-bottom:3px solid #d4af37;color:#fff;}" +
    ".hub-akm-prev-hdr img{width:36px;height:36px;border-radius:50%;background:#fff;}" +
    ".hub-akm-prev-hdr .t{font-family:var(--display);font-size:14px;line-height:1.2;}" +
    ".hub-akm-prev-hdr .s{font-size:10px;color:#ecd07e;margin-top:2px;}" +
    ".hub-akm-prev-gold{height:3px;background:linear-gradient(90deg,#a9801c,#d4af37,#ecd07e,#d4af37,#a9801c);}" +
    ".hub-akm-prev-body{background:#fff;padding:14px 14px 12px;color:#23291f;}" +
    ".hub-akm-prev-body h1{margin:0 0 10px;font-family:var(--display);font-size:16px;color:#14532d;}" +
    ".hub-akm-prev-body .hub-akm-prev-content{font-size:13px;max-height:120px;overflow:auto;}" +
    ".hub-akm-prev-body .hub-akm-prev-content p{margin:0 0 8px;}" +
    ".hub-akm-prev-ftr{background:#e9f3ea;padding:8px 12px;border-top:1px solid #ecd07e;" +
    "font-size:11px;color:#5f6b5a;text-align:center;}";

  function injectCss() {
    if (document.getElementById("kosAllKreweCss")) return;
    var s = document.createElement("style");
    s.id = "kosAllKreweCss";
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
    return el ? el.value.trim() : "";
  }

  /** Plain text → simple HTML paragraphs; leave existing markup alone. */
  function toHtml(body) {
    var t = (body || "").trim();
    if (!t) return "";
    if (/<[a-z][\s\S]*>/i.test(t)) return t;
    return t.split(/\n{2,}/).map(function (p) {
      return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }


  var LOGO = "https://www.kreweofshamrock.com/assets/img/emblem-shamrock.png";

  function updatePreview() {
    var box = document.getElementById("hubAkmPreview");
    if (!box) return;
    var subject = val("hubAkmSubject") || "Your subject here";
    var bodyHtml = toHtml(val("hubAkmBody")) || "<p class=\"muted\"><em>Message preview…</em></p>";
    box.innerHTML =
      '<div class="hub-akm-prev-hdr">' +
      '<img src="' + LOGO + '" alt="" />' +
      '<div><div class="t">Krewe of Shamrock</div><div class="s">Since 1999</div></div></div>' +
      '<div class="hub-akm-prev-gold"></div>' +
      '<div class="hub-akm-prev-body"><h1>' + esc(subject) + '</h1>' +
      '<div class="hub-akm-prev-content">' + bodyHtml + "</div></div>" +
      '<div class="hub-akm-prev-ftr"><div style="font-weight:600;color:var(--green-800);margin-bottom:6px;">Krewe of Shamrock · Office</div>' +
      '<div><a href="mailto:patrick@kreweofshamrock.com">patrick@kreweofshamrock.com</a><br>' +
      '<a href="mailto:secretary@kreweofshamrock.com">secretary@kreweofshamrock.com</a><br>' +
      '<a href="mailto:treasurer@kreweofshamrock.com">treasurer@kreweofshamrock.com</a><br>' +
      '<a href="mailto:digital@kreweofshamrock.com">digital@kreweofshamrock.com</a></div>' +
      '<div style="margin-top:8px;"><a href="https://www.kreweofshamrock.com/" target="_blank" rel="noopener">kreweofshamrock.com</a></div></div>';
  }

  function setMsg(text, kind) {
    var el = document.getElementById("hubAkmMsg");
    if (!el) return;
    el.textContent = text || "";
    el.className = "hub-akm-msg" + (kind ? " " + kind : "");
  }

  function renderHistory(list) {
    var target = document.getElementById("hubAkmHistory");
    if (!target) return;
    if (!list || !list.length) {
      target.innerHTML = '<p class="empty">No all-krewe messages sent yet.</p>';
      return;
    }
    var html = "";
    list.forEach(function (m) {
      var count = m.recipient_count != null ? m.recipient_count + " recipients" : "recipients unknown";
      var seg = m.segment ? " · " + m.segment : "";
      html +=
        '<div class="hub-akm-row"><div><b>' + esc(m.subject || "(no subject)") + "</b>" +
        '<div class="muted">' + esc(when(m.created_at)) + esc(seg) + "</div>" +
        (m.body_html
          ? '<div class="muted" style="max-height:3.6em;overflow:hidden;">' +
            esc(String(m.body_html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180)) +
            "</div>"
          : "") +
        '</div><div class="count">' + esc(count) + "</div></div>";
    });
    target.innerHTML = html;
  }

  async function refreshHistory(client) {
    var target = document.getElementById("hubAkmHistory");
    if (!target) return;
    target.innerHTML = '<p class="empty">Loading history…</p>';
    try {
      var res = await client.rpc("list_all_krewe_messages", { p_limit: 50 });
      if (res.error) throw res.error;
      var data = res.data || {};
      if (data.ok === false) throw new Error(data.message || "Not authorized.");
      var list = Array.isArray(data.messages) ? data.messages : [];
      renderHistory(list);
    } catch (e) {
      target.innerHTML =
        '<p class="empty">Couldn&rsquo;t load history. ' +
        esc((e && e.message) || "Try again in a moment.") +
        "</p>";
    }
  }

  async function sendMessage(client) {
    var subject = val("hubAkmSubject");
    var bodyRaw = val("hubAkmBody");
    var confirm = document.getElementById("hubAkmConfirm");
    var btn = document.getElementById("hubAkmSend");
    if (!subject) {
      setMsg("Subject is required.", "err");
      return;
    }
    if (!bodyRaw) {
      setMsg("Message body is required.", "err");
      return;
    }
    if (!confirm || !confirm.checked) {
      setMsg('Please confirm this emails ALL current members.', "err");
      return;
    }
    if (!window.confirm("Send this message to ALL current (active) members? It will queue through the krewe email pipeline.")) {
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Sending…";
    }
    setMsg("");
    try {
      var res = await client.rpc("send_all_krewe_message", {
        p_subject: subject,
        p_body_html: toHtml(bodyRaw),
        p_segment: "active"
      });
      if (res.error) throw res.error;
      var data = res.data || {};
      if (data.ok === false) throw new Error(data.message || "Could not send.");
      var n = data.recipient_count;
      setMsg(
        "Queued successfully" +
          (n != null ? " for " + n + " recipient" + (n === 1 ? "" : "s") : "") +
          ". Delivery runs via the outbound email queue (Resend).",
        "ok"
      );
      document.getElementById("hubAkmSubject").value = "";
      document.getElementById("hubAkmBody").value = "";
      confirm.checked = false;
      await refreshHistory(client);
    } catch (e) {
      setMsg("Couldn't send: " + ((e && e.message) || e), "err");
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = "☘ Send to all members";
    }
  }

  async function loadCard(client) {
    var panel = document.getElementById("hubOfficer");
    if (!panel) return;
    var card = document.getElementById("hubAllKrewe");
    if (!card) {
      card = document.createElement("section");
      card.className = "app-card";
      card.id = "hubAllKrewe";
      var after =
        document.getElementById("hubApprovals") ||
        document.getElementById("hubPayments") ||
        document.getElementById("hubEventStudio");
      if (after && after.nextSibling) panel.insertBefore(card, after.nextSibling);
      else if (after) panel.appendChild(card);
      else panel.appendChild(card);
    }
    card.innerHTML =
      '<div class="app-head"><span class="ic">📣</span><div><h2>All Krewe Messages</h2>' +
      "<small>Email the entire current membership; every send also lives in the Members Hub</small></div></div>" +
      '<div class="app-body">' +
      '<div class="hub-akm-form" id="hubAkmFormWrap">' +
      "<h3>Compose</h3>" +
      '<p class="hub-akm-note">Messages send in a branded Shamrock template (deep green header, crest, gold accents, and footer). Recipients see the framed version; history below keeps your original wording.</p>' +
      '<p class="hub-akm-note">Every send is also posted for members on the Hub Home tab under <b>📜 Word from the Board</b> (latest up top, full archive behind “See all announcements”) — so information you email here lives in the Members Hub too.</p>' +
      '<div class="hub-akm-grid">' +
      '<div><label for="hubAkmSubject">Subject *</label><input id="hubAkmSubject" type="text" maxlength="200" placeholder="e.g. Parade lineup is set!" /></div>' +
      '<div><label for="hubAkmBody">Message *</label><textarea id="hubAkmBody" placeholder="Write your note to the krewe. Plain text is fine; short HTML is OK."></textarea></div>' +
      "</div>" +
      '<div class="hub-akm-preview-wrap"><h4>Branded preview</h4><div class="hub-akm-preview" id="hubAkmPreview" aria-live="polite"></div></div>' +
      '<label class="hub-akm-confirm"><input type="checkbox" id="hubAkmConfirm" /> ' +
      "<span>I understand this <b>emails ALL current members</b> (active roster) through the krewe outbound email queue.</span></label>" +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">' +
      '<button class="btn btn-primary" type="button" id="hubAkmSend">☘ Send to all members</button></div>' +
      '<p class="hub-akm-msg" id="hubAkmMsg" aria-live="polite"></p></div>' +
      '<div class="hub-akm-history"><h3>Prior all-krewe messages</h3>' +
      '<div id="hubAkmHistory"><p class="empty">Loading history…</p></div></div></div>';

    document.getElementById("hubAkmSend").addEventListener("click", function () {
      sendMessage(client);
    });
    ["hubAkmSubject", "hubAkmBody"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", updatePreview);
      el.addEventListener("change", updatePreview);
    });
    updatePreview();
    await refreshHistory(client);
    if (typeof window.kosRefreshOfficerDesk === "function") window.kosRefreshOfficerDesk();
  }

  async function boot() {
    injectCss();
    var client = window.__kosSb || null;
    for (var i = 0; i < 40 && !client; i++) {
      await new Promise(function (r) {
        setTimeout(r, 150);
      });
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
    await loadCard(client);
  }

  var _unlock = window.kosUnlock;
  window.kosUnlock = function () {
    if (typeof _unlock === "function") _unlock();
    setTimeout(boot, 140);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 550);
    });
  } else {
    setTimeout(boot, 550);
  }
})();
