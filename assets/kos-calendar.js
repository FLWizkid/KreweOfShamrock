/* Personal calendar (.ics) downloads for Hub cards and RSVP confirm.
   LOCATION is always the public teaser. Never write member_address or
   meeting_url into a file someone might forward. */
(function () {
  "use strict";

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function icsEscape(value) {
    return String(value == null ? "" : value)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function toUtcStamp(value) {
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) + "T" +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) + "Z";
  }

  function foldLine(line) {
    var out = "";
    var rest = String(line || "");
    while (rest.length > 74) {
      out += rest.slice(0, 74) + "\r\n ";
      rest = rest.slice(74);
    }
    return out + rest;
  }

  function teaserLocation(ev) {
    if (!ev) return "";
    var loc = ev.location != null ? String(ev.location).trim() : "";
    if (ev.member_address && loc && loc === String(ev.member_address).trim()) return "";
    return loc;
  }

  function publicDescription(ev) {
    var bits = [];
    if (ev && ev.description) bits.push(String(ev.description).trim());
    bits.push("Krewe of Shamrock. Full staging and member details stay in the Member Hub.");
    return bits.filter(Boolean).join(" ");
  }

  function buildIcs(ev) {
    ev = ev || {};
    var start = toUtcStamp(ev.start_time);
    if (!start) return "";
    var end = toUtcStamp(ev.end_time);
    if (!end) {
      var plus = new Date(ev.start_time);
      if (!isNaN(plus.getTime())) {
        plus.setHours(plus.getHours() + 2);
        end = toUtcStamp(plus);
      } else {
        end = start;
      }
    }
    var uid = String(ev.uid || ev.id || ("kos-" + start)).replace(/[^a-zA-Z0-9@._-]/g, "") + "@kreweofshamrock.com";
    var stamp = toUtcStamp(new Date());
    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Krewe of Shamrock//Member Hub//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + uid,
      "DTSTAMP:" + stamp,
      "DTSTART:" + start,
      "DTEND:" + end,
      "SUMMARY:" + icsEscape(ev.name || "Krewe of Shamrock event")
    ];
    var loc = teaserLocation(ev);
    if (loc) lines.push("LOCATION:" + icsEscape(loc));
    lines.push("DESCRIPTION:" + icsEscape(publicDescription(ev)));
    lines.push("END:VEVENT");
    lines.push("END:VCALENDAR");
    return lines.map(foldLine).join("\r\n") + "\r\n";
  }

  function filename(ev) {
    var base = String((ev && ev.name) || "krewe-event")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "krewe-event";
    return base + ".ics";
  }

  function download(ev) {
    var body = buildIcs(ev);
    if (!body) return false;
    var blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename(ev);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    return true;
  }

  window.kosCalendar = {
    buildIcs: buildIcs,
    download: download,
    teaserLocation: teaserLocation
  };
})();
