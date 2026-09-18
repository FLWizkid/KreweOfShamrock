/* Event Studio — companion to members-desk.js
   Lets board/officers/chairs create & edit events (optional Zeffy ticket links). */
(function () {
  "use strict";

  var CSS = [
    ".hub-event-form h3,.hub-event-list h3{font-family:var(--display);color:var(--green-800);margin:0 0 10px;font-size:18px;}",
    ".hub-event-form label{display:block;font-size:13px;color:var(--muted);margin:10px 0 3px;}",
    ".hub-event-form input,.hub-event-form textarea,.hub-event-form select{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid rgba(168,128,28,.4);border-radius:8px;font:inherit;background:#fff;}",
    ".hub-event-form textarea{min-height:76px;resize:vertical;}",
    ".hub-event-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 12px;}",
    ".hub-event-grid .wide{grid-column:1 / -1;}",
    ".hub-event-checks{display:flex;flex-wrap:wrap;gap:16px;margin:12px 0;}",
    ".hub-event-checks label{display:flex;align-items:center;gap:7px;margin:0;color:var(--green-800);cursor:pointer;}",
    ".hub-event-checks input{width:auto;}",
    ".hub-event-row{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;border:1px solid rgba(168,128,28,.3);border-radius:12px;padding:11px 12px;margin:8px 0;background:#fffdf4;}",
    ".hub-event-row b{font-family:var(--display);color:var(--green-800);}",
    ".hub-event-row .muted{color:var(--muted);font-size:13px;line-height:1.45;}",
    ".hub-event-row .hub-appr-btns{flex:none;}",
    ".hub-event-msg{min-height:1.2em;color:var(--green-800);font-size:14px;margin:8px 0 0;}",
    ".hub-event-form{margin-top:18px;padding-top:16px;border-top:1px dashed rgba(168,128,28,.4);}",
    ".hub-flyer-note{font-size:12px;color:var(--muted);margin:4px 0 0;}",
    ".hub-flyer-preview{margin-top:10px;display:none;align-items:center;gap:12px;flex-wrap:wrap;}",
    ".hub-flyer-preview.show{display:flex;}",
    ".hub-flyer-preview img{max-width:160px;max-height:120px;border-radius:10px;border:1px solid rgba(168,128,28,.35);object-fit:cover;background:#fff;}",
    ".hub-flyer-preview a{font-size:13px;}",
    ".hub-event-thumb{width:54px;height:54px;border-radius:10px;object-fit:cover;border:1px solid rgba(168,128,28,.35);background:#f3efe2;flex:none;}",
    ".hub-event-thumb.ph{display:grid;place-items:center;font-size:11px;color:var(--muted);text-align:center;padding:4px;}",
    "@media(max-width:620px){.hub-event-grid{grid-template-columns:1fr;}.hub-event-grid .wide{grid-column:auto;}.hub-event-row{flex-direction:column;}}",
  ].join("");

  function injectCss() {
    if (document.getElementById("kosEventStudioCss")) return;
    var s = document.createElement("style");
    s.id = "kosEventStudioCss";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) {
    return (s == null ? "" : String(s)).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function showOfficerTab() {
    document.querySelectorAll('[data-hub-tab="officer"]').forEach(function (btn) {
      btn.style.display = "";
    });
    var home = document.querySelector("[data-hub-panel='hub']") || document.getElementById("hubHome");
    // Ensure officer card exists on home if desk already rendered without it
    var wrap = document.querySelector(".hub-welcome");
    if (wrap && !document.querySelector("[data-hub-action='officer']")) {
      var card = document.createElement("div");
      card.className = "hub-officer-card";
      card.setAttribute("data-hub-action", "officer");
      card.innerHTML = '<div><b style="font-family:var(--display);font-size:18px;">Officer desk</b><div style="opacity:.9;font-size:14px;margin-top:4px;">Event Studio and officer tools</div></div><div class="go">Open →</div>';
      card.addEventListener("click", function () {
        if (typeof window.kosShowHub === "function") window.kosShowHub("officer");
      });
      wrap.appendChild(card);
    }
  }


  // ---- Event Studio: authorized event creation and editing ----
  function eventLocalInput(value) {
    if (!value) return "";
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value).slice(0, 16);
    function pad(n) { return n < 10 ? "0" + n : String(n); }
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function eventLocalDisplay(value) {
    if (!value) return "";
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  }

  function eventStudioFormHtml() {
    return '<div class="hub-event-form" id="hubEventFormWrap">' +
      '<h3 id="hubEventFormTitle">New event</h3>' +
      '<form id="hubEventForm"><input type="hidden" id="hubEventId" />' +
      '<div class="hub-event-grid">' +
      '<div><label for="hubEventName">Name *</label><input id="hubEventName" required /></div>' +
      '<div><label for="hubEventType">Event type</label><select id="hubEventType">' +
      '<option value="social">Social</option><option value="parade">Parade</option><option value="meeting">Meeting</option>' +
      '<option value="fundraiser">Fundraiser</option><option value="other">Other</option></select></div>' +
      '<div><label for="hubEventStart">Start time *</label><input id="hubEventStart" type="datetime-local" required /></div>' +
      '<div><label for="hubEventEnd">End time</label><input id="hubEventEnd" type="datetime-local" /></div>' +
      '<div><label for="hubEventRegCloses">Close registrations on</label><input id="hubEventRegCloses" type="datetime-local" /></div>' +
      '<div class="wide" style="margin-top:-4px;"><p style="font-size:12px;color:var(--muted);margin:0 0 6px;line-height:1.4;">Optional. After this date/time, public signup shows Registration closed and blocks new RSVPs and ticket checkout. Leave blank to stay open. You can edit address, dates, and this close date. Saving stores a draft and does not publish.</p></div>' +
      '<div><label for="hubEventLocation">Location / address</label><input id="hubEventLocation" placeholder="Venue name and street address" /></div>' +
      '<div><label for="hubEventCapacity">Capacity</label><input id="hubEventCapacity" type="number" min="0" step="1" /></div>' +
      '<div class="wide"><label for="hubEventDescription">Description</label><textarea id="hubEventDescription"></textarea></div></div>' +
      '<div class="hub-event-checks"><label><input type="checkbox" id="hubEventPublic" checked /> Public event</label>' +
      '<label><input type="checkbox" id="hubEventMandatory" /> Mandatory meeting</label>' +
      '<label><input type="checkbox" id="hubEventFeatured" /> Featured Event</label></div>' +
      '<div class="hub-event-grid">' +
      '<div><label for="hubEventStatus">Status</label><select id="hubEventStatus"><option value="draft">Draft</option><option value="cancelled">Cancelled</option></select></div>' +
      '<div><label for="hubEventTicketLabel">Ticket label</label><input id="hubEventTicketLabel" placeholder="e.g. Member ticket" /></div>' +
      '<div><label for="hubEventTicketPrice">Ticket price (dollars)</label><input id="hubEventTicketPrice" type="number" min="0" step="0.01" placeholder="0.00" /></div>' +
      '<div><label for="hubEventPaymentUrl">Ticket payment URL</label><input id="hubEventPaymentUrl" type="url" placeholder="https://www.zeffy.com/en-US/ticketing/..." /></div>' +
      '<div class="wide" style="grid-column:1/-1;"><div class="hub-event-checks" style="margin:0;">' +
      '<label><input type="checkbox" id="hubEventCollectGuests" checked /> Ask for guest count</label>' +
      '<label><input type="checkbox" id="hubEventCollectGuestNames" checked /> Ask for guest names</label>' +
      '<label><input type="checkbox" id="hubEventCollectRaffle" checked /> Ask for raffle ticket qty</label></div>' +
      '<p style="font-size:12px;color:var(--muted);margin:6px 0 0;line-height:1.4;">Defaults match Mini Golf style (guests + raffle). Collected on the website before Zeffy checkout so officer reports show the same data Wild Apricot had.</p></div>' +
      '<div><label for="hubEventRaffleOptions">Raffle qty choices</label><input id="hubEventRaffleOptions" placeholder="0,1,5,15" value="0,1,5,15" /></div>' +
      '<div class="wide"><label for="hubEventFlyerUrl">Event image / PDF URL</label><input id="hubEventFlyerUrl" type="url" placeholder="https://… or upload a file below" /></div>' +
      '<div class="wide"><label for="hubEventFlyerFile">Upload event image or PDF</label>' +
      '<input id="hubEventFlyerFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" />' +
      '<p class="hub-flyer-note" id="hubEventFlyerNote" aria-live="polite">' + FLYER_NOTE_DEFAULT + '</p>' +
      '<div class="hub-flyer-preview" id="hubEventFlyerPreview" aria-live="polite"></div>' +
      '<button class="btn" type="button" id="hubEventFlyerClear" style="margin-top:8px;">Clear image / PDF</button></div></div>' +
      '<p style="font-size:13px;color:var(--muted);margin:10px 0 0;">For paid tickets, create a Zeffy ticketing campaign and paste the public share link here. Sign me up / RSVP will open that checkout. See PAYMENTS_SETUP.md. Save stores a draft and does not publish. After a successful save, review the saved name, date and time, location, and ticket price. Publish appears only after you confirm those details. Cancel that review and the event is not published and nobody is notified. If the event was already public, saving moves it back to a draft until you publish again. Each paid event needs its own Zeffy link.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;"><button class="btn btn-primary" type="submit" id="hubEventSave">☘ Save event</button>' +
      '<button class="btn btn-primary" type="button" id="hubEventPublish" hidden style="display:none">Publish</button>' +
      '<button class="btn" type="button" id="hubEventNew">New / clear</button></div><p class="hub-event-msg" id="hubEventMsg" aria-live="polite"></p></form></div>';
  }

  // Uploads a flyer file to the public "event-flyers" storage bucket and
  // returns its public URL. Storage RLS only lets can_manage_events() write.
  var FLYER_NOTE_DEFAULT = "Upload fills the URL above. Published public events show on the Events page. Check Featured Event to pin one in the Featured spot (only one at a time).";
  var FLYER_MAX_BYTES = 10 * 1024 * 1024;
  var FLYER_TYPES = {
    "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"
  };
  async function uploadEventFlyer(client, file) {
    var ext = FLYER_TYPES[file.type];
    if (!ext) throw new Error("Please choose a PDF, JPG, PNG, or WEBP file.");
    if (file.size > FLYER_MAX_BYTES) throw new Error("Flyer files must be 10 MB or smaller.");
    var base = (file.name || "flyer").replace(/\.[^.]*$/, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "flyer";
    var path = Date.now() + "-" + base + "." + ext;
    var up = await client.storage.from("event-flyers").upload(path, file, {
      upsert: false, contentType: file.type, cacheControl: "3600"
    });
    if (up.error) throw up.error;
    return client.storage.from("event-flyers").getPublicUrl(path).data.publicUrl;
  }


  function syncFlyerPreview() {
    var urlEl = document.getElementById("hubEventFlyerUrl");
    var preview = document.getElementById("hubEventFlyerPreview");
    if (!preview) return;
    var url = urlEl ? urlEl.value.trim() : "";
    if (!url) {
      preview.className = "hub-flyer-preview";
      preview.innerHTML = "";
      return;
    }
    preview.className = "hub-flyer-preview show";
    if (/\.pdf(?:$|[?#])/i.test(url)) {
      preview.innerHTML = '<span class="hub-event-thumb ph">PDF</span><a href="' + esc(url) + '" target="_blank" rel="noopener">Open PDF ↗</a>';
    } else {
      preview.innerHTML = '<img src="' + esc(url) + '" alt="Event media preview" /><a href="' + esc(url) + '" target="_blank" rel="noopener">Open image ↗</a>';
    }
  }

  function clearEventForm() {
    var form = document.getElementById("hubEventForm");
    if (!form) return;
    form.reset();
    document.getElementById("hubEventId").value = "";
    document.getElementById("hubEventPublic").checked = true;
    document.getElementById("hubEventMandatory").checked = false;
    var feat = document.getElementById("hubEventFeatured"); if (feat) feat.checked = false;
    var cg = document.getElementById("hubEventCollectGuests"); if (cg) cg.checked = true;
    var cn = document.getElementById("hubEventCollectGuestNames"); if (cn) cn.checked = true;
    var cr = document.getElementById("hubEventCollectRaffle"); if (cr) cr.checked = true;
    var ro = document.getElementById("hubEventRaffleOptions"); if (ro) ro.value = "0,1,5,15";
    var rcClear = document.getElementById("hubEventRegCloses"); if (rcClear) rcClear.value = "";
    document.getElementById("hubEventStatus").value = "draft";
    var payClear = document.getElementById("hubEventPaymentUrl"); if (payClear) payClear.value = "";
    document.getElementById("hubEventType").value = "social";
    document.getElementById("hubEventFormTitle").textContent = "New event";
    document.getElementById("hubEventMsg").textContent = "";
    hidePublishButton();
    var note = document.getElementById("hubEventFlyerNote");
    if (note) note.textContent = FLYER_NOTE_DEFAULT;
    syncFlyerPreview();
  }

  function fillEventForm(event) {
    hidePublishButton();
    function get(id) { return document.getElementById(id); }
    get("hubEventId").value = event.id || "";
    get("hubEventName").value = event.name || "";
    get("hubEventType").value = event.event_type || "other";
    get("hubEventStart").value = eventLocalInput(event.start_time);
    get("hubEventEnd").value = eventLocalInput(event.end_time);
    var rc = get("hubEventRegCloses"); if (rc) rc.value = eventLocalInput(event.registration_closes_at);
    get("hubEventLocation").value = event.location || "";
    get("hubEventCapacity").value = event.capacity == null ? "" : event.capacity;
    get("hubEventDescription").value = event.description || "";
    get("hubEventPublic").checked = event.is_public !== false;
    get("hubEventMandatory").checked = !!event.is_mandatory;
    var featEl = get("hubEventFeatured"); if (featEl) featEl.checked = !!event.is_featured;
    get("hubEventStatus").value = String(event.status || "").toLowerCase() === "cancelled" ? "cancelled" : "draft";
    get("hubEventTicketLabel").value = event.ticket_label || "";
    get("hubEventTicketPrice").value = event.ticket_price_cents == null ? "" : (Number(event.ticket_price_cents) / 100).toFixed(2);
    get("hubEventPaymentUrl").value = event.ticket_payment_url || "";
    var cg = get("hubEventCollectGuests"); if (cg) cg.checked = event.collect_guests !== false;
    var cn = get("hubEventCollectGuestNames"); if (cn) cn.checked = event.collect_guest_names !== false;
    var cr = get("hubEventCollectRaffle"); if (cr) cr.checked = event.collect_raffle !== false;
    var ro = get("hubEventRaffleOptions"); if (ro) ro.value = event.raffle_options || "0,1,5,15";
    get("hubEventFlyerUrl").value = event.flyer_url || "";
    syncFlyerPreview();
    get("hubEventFormTitle").textContent = "Edit event";
    get("hubEventMsg").textContent = "";
    var wrap = document.getElementById("hubEventFormWrap");
    if (wrap) wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function renderEventList(list) {
    var target = document.getElementById("hubEventList");
    if (!target) return;
    if (!list.length) {
      target.innerHTML = '<p class="empty">No Krewe events yet. Create the first one below.</p>';
      return;
    }
    var html = "";
    list.forEach(function (event) {
      var details = [];
      if (event.start_time) details.push(eventLocalDisplay(event.start_time) + (event.end_time ? " - " + eventLocalDisplay(event.end_time) : ""));
      if (event.location) details.push(event.location);
      if (event.registration_closes_at) details.push("Regs close " + eventLocalDisplay(event.registration_closes_at));
      var ticket = event.ticket_price_cents != null ? " · $" + (Number(event.ticket_price_cents) / 100).toFixed(2) : "";
      var readOnly = String(event.source || "").toLowerCase() === "ikc";
      var flyer = event.flyer_url || "";
      var thumb = flyer
        ? (/\.pdf(?:$|[?#])/i.test(flyer)
            ? '<div class="hub-event-thumb ph">PDF</div>'
            : '<img class="hub-event-thumb" src="' + esc(flyer) + '" alt="" />')
        : '<div class="hub-event-thumb ph">No image</div>';
      html += '<div class="hub-event-row">' + thumb + '<div style="flex:1;min-width:0;"><b>' + esc(event.name) + '</b>' +
        '<div class="muted">' + esc(details.join(" · ") || "Date to be announced") + '</div>' +
        '<div class="muted">' + esc(event.status || "published") + (event.event_type ? " · " + esc(event.event_type) : "") + esc(ticket) +
        (event.is_featured ? " · Featured" : "") +
        (flyer ? " · has image/PDF" : " · add image/PDF") +
        (readOnly ? " · IKC event (read-only)" : "") + '</div></div>' +
        (readOnly ? "" : '<div class="hub-appr-btns"><button class="btn btn-primary" type="button" data-event-edit="' + esc(event.id) + '">Edit event</button></div>') + '</div>';
    });
    target.innerHTML = html;
    target.querySelectorAll("[data-event-edit]").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-event-edit");
        var event = list.find(function (row) { return String(row.id) === String(id); });
        if (event && String(event.source || "").toLowerCase() !== "ikc") fillEventForm(event);
      });
    });
  }

  async function refreshEventStudio(client) {
    var target = document.getElementById("hubEventList");
    if (!target) return;
    target.innerHTML = '<p class="empty">Loading events…</p>';
    try {
      var res = await client.rpc("officer_list_events");
      if (res.error) throw res.error;
      var data = res.data || {};
      var list = Array.isArray(data) ? data : (data.events || []);
      if (data.ok === false) throw new Error(data.message || "Not authorized.");
      renderEventList(list);
    } catch (e) {
      target.innerHTML = '<p class="empty">Couldn&rsquo;t load events. ' + esc((e && e.message) || "Try again in a moment.") + '</p>';
    }
  }

  var reviewedPublish = null;

  function hidePublishButton() {
    reviewedPublish = null;
    var btn = document.getElementById("hubEventPublish");
    if (!btn) return;
    btn.hidden = true;
    btn.style.display = "none";
    btn.disabled = false;
    btn.textContent = "Publish";
  }

  function showPublishButton() {
    var btn = document.getElementById("hubEventPublish");
    if (!btn) return;
    btn.hidden = false;
    btn.style.display = "";
    btn.disabled = false;
    btn.textContent = "Publish";
  }

  function onEventFormEdited() {
    if (!reviewedPublish) return;
    hidePublishButton();
    var msg = document.getElementById("hubEventMsg");
    if (msg) msg.textContent = "Details changed. Save and review again before publishing.";
  }

  function ticketPriceLabel(cents) {
    if (cents == null || cents === "") return "Not set";
    var n = Number(cents);
    if (isNaN(n)) return "Not set";
    return "$" + (n / 100).toFixed(2);
  }

  function confirmSavedReview(event, clearedNote) {
    var row = event || {};
    var when = eventLocalDisplay(row.start_time) || "Not set";
    var where = row.location && String(row.location).trim() ? String(row.location).trim() : "Not set";
    var note = clearedNote ? "\n" + clearedNote + "\n" : "";
    return window.confirm(
      "Review the saved event. Confirm these details are correct.\n\n" +
      "Name: " + (row.name || "Not set") + "\n" +
      "Date and time: " + when + "\n" +
      "Location: " + where + "\n" +
      "Ticket price: " + ticketPriceLabel(row.ticket_price_cents) + "\n" +
      note + "\n" +
      "OK means the saved details are correct. It does not publish and does not notify anyone. A Publish button appears after OK.\n" +
      "Cancel keeps this save. It does not publish and does not notify anyone."
    );
  }

  function finishSavedReview(msg, res, payload, cleared, extra) {
    var saved = (res && res.data && res.data.event && res.data.event.id) ? res.data.event : null;
    var sent = String((payload && payload.status) || "draft").toLowerCase();
    if (saved && String(saved.status || "").toLowerCase() === "published" && sent !== "published") {
      hidePublishButton();
      if (msg) msg.textContent = "Saved, but the server marked this event published. It was not left as a draft." + (cleared || "");
      return;
    }
    if (saved && saved.id) {
      var idEl = document.getElementById("hubEventId");
      if (idEl) idEl.value = saved.id;
      var title = document.getElementById("hubEventFormTitle");
      if (title) title.textContent = "Edit event";
    }
    if (res && res.data && res.data.ticket_url_cleared) {
      var pay = document.getElementById("hubEventPaymentUrl");
      if (pay) pay.value = (saved && saved.ticket_payment_url) ? String(saved.ticket_payment_url) : "";
    }
    var keptStatus = String((saved && saved.status) || sent || "draft").toLowerCase();
    var statusEl = document.getElementById("hubEventStatus");
    if (statusEl) statusEl.value = keptStatus === "cancelled" ? "cancelled" : "draft";
    hidePublishButton();
    var kept = keptStatus === "cancelled" ? "cancelled" : "a draft";
    var reviewSource = saved || {
      name: payload.name,
      start_time: payload.start_time,
      location: payload.location,
      ticket_price_cents: payload.ticket_price_cents
    };
    var clearedNote = cleared ? String(cleared).trim() : "";
    if (!confirmSavedReview(reviewSource, clearedNote)) {
      if (msg) msg.textContent = "Saved as " + kept + ". Not published. Nobody was notified." + (cleared || "");
      return;
    }
    if (!saved || !saved.id || !saved.name || !saved.start_time) {
      if (msg) msg.textContent = "Saved as " + kept + ". The review was confirmed, but Publish is not available until the saved event can be found." + (cleared || "");
      return;
    }
    reviewedPublish = {
      id: saved.id,
      name: saved.name,
      start_time: saved.start_time
    };
    showPublishButton();
    var tail = extra ? " " + extra : "";
    if (msg) msg.textContent = "Saved as " + kept + ". Details confirmed. Use Publish to make this event public." + tail + (cleared || "");
  }

  async function publishReviewedEvent(client) {
    var msg = document.getElementById("hubEventMsg");
    var btn = document.getElementById("hubEventPublish");
    var save = document.getElementById("hubEventSave");
    var snap = reviewedPublish;
    if (!snap || !snap.id || !snap.name || !snap.start_time) {
      hidePublishButton();
      if (msg) msg.textContent = "Save the event and confirm the review before publishing.";
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = "Publishing…"; }
    if (save) save.disabled = true;
    try {
      var res = await client.rpc("officer_upsert_event", {
        p: {
          id: snap.id,
          name: snap.name,
          start_time: snap.start_time,
          status: "published"
        }
      });
      if (res.error) throw res.error;
      if (res.data && res.data.ok === false) throw new Error(res.data.message || "Could not publish event.");
      var cleared = res.data && res.data.ticket_url_cleared
        ? " The ticket payment link was cleared because another event already uses it. Paste this event's own Zeffy link."
        : "";
      clearEventForm();
      if (msg) msg.textContent = "Published." + cleared;
      await refreshEventStudio(client);
    } catch (e) {
      if (msg) msg.textContent = "Couldn't publish: " + ((e && e.message) || e);
      if (btn && reviewedPublish) { btn.disabled = false; btn.textContent = "Publish"; }
    }
    if (save) save.disabled = false;
  }


  async function saveEventStudio(client) {
    var msg = document.getElementById("hubEventMsg");
    var save = document.getElementById("hubEventSave");
    function value(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
    var startValue = value("hubEventStart");
    var start = startValue ? new Date(startValue) : null;
    if (!start || isNaN(start.getTime())) { if (msg) msg.textContent = "A valid start time is required."; return; }
    var endValue = value("hubEventEnd");
    var end = endValue ? new Date(endValue) : null;
    if (endValue && (!end || isNaN(end.getTime()))) { if (msg) msg.textContent = "Please check the end time."; return; }
    var regCloseValue = value("hubEventRegCloses");
    var regClose = regCloseValue ? new Date(regCloseValue) : null;
    if (regCloseValue && (!regClose || isNaN(regClose.getTime()))) { if (msg) msg.textContent = "Please check the registration close date/time."; return; }
    var capacityValue = value("hubEventCapacity");
    var ticketValue = value("hubEventTicketPrice");
    var capacity = capacityValue === "" ? null : parseInt(capacityValue, 10);
    var dollars = ticketValue === "" ? null : Number(ticketValue);
    if (capacityValue !== "" && (isNaN(capacity) || capacity < 0)) { if (msg) msg.textContent = "Capacity must be a whole number."; return; }
    if (ticketValue !== "" && (isNaN(dollars) || dollars < 0)) { if (msg) msg.textContent = "Ticket price must be zero or more."; return; }
    var payload = {
      id: value("hubEventId") || null, name: value("hubEventName"), start_time: start.toISOString(),
      end_time: end ? end.toISOString() : null, location: value("hubEventLocation") || null,
      description: value("hubEventDescription") || null, event_type: value("hubEventType") || "other",
      capacity: capacity, is_public: !!document.getElementById("hubEventPublic").checked,
      is_mandatory: !!document.getElementById("hubEventMandatory").checked,
      is_featured: !!(document.getElementById("hubEventFeatured") && document.getElementById("hubEventFeatured").checked),
      status: value("hubEventStatus") === "cancelled" ? "cancelled" : "draft",
      ticket_label: value("hubEventTicketLabel") || null,
      ticket_price_cents: ticketValue === "" ? null : Math.round(dollars * 100),
      ticket_payment_url: value("hubEventPaymentUrl") || null, flyer_url: value("hubEventFlyerUrl") || null,
      collect_guests: !!(document.getElementById("hubEventCollectGuests") && document.getElementById("hubEventCollectGuests").checked),
      collect_guest_names: !!(document.getElementById("hubEventCollectGuestNames") && document.getElementById("hubEventCollectGuestNames").checked),
      collect_raffle: !!(document.getElementById("hubEventCollectRaffle") && document.getElementById("hubEventCollectRaffle").checked),
      raffle_options: value("hubEventRaffleOptions") || "0,1,5,15",
      registration_closes_at: (function () {
        var rv = value("hubEventRegCloses");
        if (!rv) return null;
        var rd = new Date(rv);
        if (isNaN(rd.getTime())) return null;
        return rd.toISOString();
      })()
    };
    if (!payload.name) { if (msg) msg.textContent = "Event name is required."; return; }
    if (save) { save.disabled = true; save.textContent = "Saving…"; }
    if (msg) msg.textContent = "";
    try {
      var res = await client.rpc("officer_upsert_event", { p: payload });
      if (res.error) throw res.error;
      if (res.data && res.data.ok === false) throw new Error(res.data.message || "Could not save event.");
      var cleared = res.data && res.data.ticket_url_cleared
        ? " The ticket payment link was cleared because another event already uses it. Paste this event's own Zeffy link."
        : "";
      await refreshEventStudio(client);
      if (save) { save.disabled = false; save.textContent = "☘ Save event"; }
      finishSavedReview(msg, res, payload, cleared, "");
    } catch (e) { if (msg) msg.textContent = "Couldn't save: " + ((e && e.message) || e); }
    if (save) { save.disabled = false; save.textContent = "☘ Save event"; }
  }
  async function loadEventStudio(client) {
    var panel = document.getElementById("hubOfficer");
    if (!panel) return;
    var card = document.getElementById("hubEventStudio");
    if (!card) {
      card = document.createElement("section");
      card.className = "app-card";
      card.id = "hubEventStudio";
      var payments = document.getElementById("hubPayments");
      var approvals = document.getElementById("hubApprovals");
      var after = payments || approvals;
      if (after && after.nextSibling) panel.insertBefore(card, after.nextSibling);
      else if (after) panel.appendChild(card);
    if (typeof window.kosRefreshOfficerDesk === "function") window.kosRefreshOfficerDesk();

      else panel.appendChild(card);
    }
    card.innerHTML =
      '<div class="app-head"><span class="ic">📅</span><div><h2>Event Studio</h2><small>Create and edit krewe events. Save stores a draft. Publish only after you review.</small></div></div>' +
      '<div class="app-body"><p style="font-size:14px;color:var(--muted);margin:0 0 12px;line-height:1.45;">Tap <b>Edit event</b> to change location, dates, or Close registrations on. Then Save event. Saving stores a draft and does not publish.</p><div class="hub-event-list"><h3>Events</h3><div id="hubEventList"><p class="empty">Loading events…</p></div></div>' +
      eventStudioFormHtml() + '</div>';
    document.getElementById("hubEventForm").addEventListener("submit", function (e) {
      e.preventDefault(); saveEventStudio(client);
    });
    document.getElementById("hubEventNew").addEventListener("click", clearEventForm);
    var publishBtn = document.getElementById("hubEventPublish");
    if (publishBtn) publishBtn.addEventListener("click", function () { publishReviewedEvent(client); });
    var eventForm = document.getElementById("hubEventForm");
    if (eventForm) {
      eventForm.addEventListener("input", onEventFormEdited);
      eventForm.addEventListener("change", onEventFormEdited);
    }
    var flyerFile = document.getElementById("hubEventFlyerFile");
    flyerFile.addEventListener("change", async function () {
      var note = document.getElementById("hubEventFlyerNote");
      var file = flyerFile.files && flyerFile.files[0];
      if (!file) return;
      if (note) note.textContent = "Uploading…";
      flyerFile.disabled = true;
      try {
        var url = await uploadEventFlyer(client, file);
        document.getElementById("hubEventFlyerUrl").value = url;
        syncFlyerPreview();
        if (note) note.textContent = "Uploaded. Press ☘ Save event to attach it to this event.";
      } catch (e) {
        if (note) note.textContent = "Upload failed: " + ((e && e.message) || e);
      }
      flyerFile.disabled = false;
      flyerFile.value = "";
    });
    var flyerUrl = document.getElementById("hubEventFlyerUrl");
    if (flyerUrl) flyerUrl.addEventListener("input", syncFlyerPreview);
    var flyerClear = document.getElementById("hubEventFlyerClear");
    if (flyerClear) flyerClear.addEventListener("click", function () {
      if (flyerUrl) flyerUrl.value = "";
      syncFlyerPreview();
      var note = document.getElementById("hubEventFlyerNote");
      if (note) note.textContent = "Cleared. Save the event to remove it from the public page.";
    });
    clearEventForm();
    await refreshEventStudio(client);
  }


  async function bootEventStudio() {
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
    showOfficerTab();
    await loadEventStudio(client);
  }

  var _unlock = window.kosUnlock;
  window.kosUnlock = function () {
    if (typeof _unlock === "function") _unlock();
    setTimeout(bootEventStudio, 80);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(bootEventStudio, 400); });
  else setTimeout(bootEventStudio, 400);
})();
