/* Krewe of Shamrock — canonical officer / board / committee-chair titles.
   Source of truth for directory display language, the first-login
   questionnaire, and the role → RBAC mapping. Access grants still use the
   existing member_roles enums (officer, board, treasurer, secretary, committee). */
(function (root) {
  "use strict";

  var COMMITTEES = [
    "Finance",
    "Bylaws",
    "Charity",
    "Technology",
    "Membership",
    "Social",
    "Float",
    "Parade",
    "Merchandise"
  ];

  var OFFICER_TITLES = [
    { title: "President", roles: ["officer"] },
    { title: "Vice President", roles: ["officer"] },
    { title: "Treasurer", roles: ["treasurer", "officer"] },
    { title: "Secretary", roles: ["secretary", "officer"] }
  ];

  var BOARD_TITLE = { title: "Board Member", roles: ["board"] };

  function chairTitle(committee) {
    return "Committee Chair of " + committee;
  }

  function esc(s) {
    return (s == null ? "" : String(s)).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function splitTitles(raw) {
    return String(raw || "")
      .split(/\s*[·|,;]\s*|\s+and\s+/i)
      .map(function (t) { return t.trim(); })
      .filter(Boolean);
  }

  function committeeFromChairTitle(title) {
    var t = String(title || "").trim();
    var m = t.match(/^committee\s+chair\s+of\s+(.+)$/i);
    if (m) return m[1].trim();
    m = t.match(/^(?:committee\s+)?co[- ]?chair\s+of\s+(.+)$/i);
    if (m) return m[1].trim();
    m = t.match(/^chair\s+of\s+(.+)$/i);
    if (m) return m[1].trim();
    m = t.match(/^(.+?)\s+committee\s+chair$/i);
    if (m) return m[1].trim();
    m = t.match(/^(.+?)\s+chair$/i);
    if (m) return m[1].trim();
    return "";
  }

  function isChairTitle(title) {
    return !!committeeFromChairTitle(title);
  }

  function isOfficerTitle(title) {
    var t = String(title || "").trim().toLowerCase();
    return t === "president" || t === "vice president" || t === "treasurer" || t === "secretary";
  }

  function isBoardTitle(title) {
    var t = String(title || "").trim().toLowerCase();
    return t === "board member" || t === "board";
  }

  function rolesForTitle(title) {
    var t = String(title || "").trim();
    var i;
    for (i = 0; i < OFFICER_TITLES.length; i++) {
      if (OFFICER_TITLES[i].title.toLowerCase() === t.toLowerCase()) {
        return OFFICER_TITLES[i].roles.slice();
      }
    }
    if (isBoardTitle(t)) return BOARD_TITLE.roles.slice();
    if (isChairTitle(t)) return ["committee"];
    return [];
  }

  function highestMemberRole(roles) {
    var set = {};
    (roles || []).forEach(function (r) { set[String(r || "").toLowerCase()] = true; });
    if (set.officer || set.captain || set.treasurer || set.secretary) return "officer";
    if (set.board) return "board";
    return "member";
  }

  function collectChecked(rootEl) {
    var boxes = (rootEl || document).querySelectorAll(".pfRole:checked");
    var roles = [];
    var titles = [];
    var committees = [];
    var seenRole = {};
    boxes.forEach(function (cb) {
      var title = (cb.getAttribute("data-title") || "").trim();
      var committee = (cb.getAttribute("data-committee") || "").trim();
      var roleList = String(cb.getAttribute("data-roles") || cb.value || "")
        .split(",")
        .map(function (r) { return r.trim(); })
        .filter(Boolean);
      if (title) titles.push(title);
      if (committee) committees.push(committee);
      roleList.forEach(function (r) {
        if (!seenRole[r]) {
          seenRole[r] = true;
          roles.push(r);
        }
      });
    });
    return {
      roles: roles,
      titles: titles,
      committees: committees,
      committee: committees[0] || null
    };
  }

  function mountQuestionnaire() {
    var panel = document.getElementById("pfRolePanel");
    if (!panel) return;
    var host = document.getElementById("pfRoleChoices");
    if (!host) {
      host = document.createElement("div");
      host.id = "pfRoleChoices";
      panel.insertBefore(host, panel.firstChild);
    }
    var html = "";
    html += '<p style="font-size:13px;color:var(--muted);margin:0 0 8px;">Pick every title you hold. An officer confirms access — you can use the hub right away. Highest role wins when you hold more than one.</p>';
    html += '<p style="font-size:13px;font-weight:700;color:var(--green-800);margin:10px 0 6px;">Officers</p>';
    OFFICER_TITLES.forEach(function (o) {
      html += '<label style="display:flex;gap:8px;align-items:center;cursor:pointer;">' +
        '<input type="checkbox" class="pfRole" data-title="' + esc(o.title) + '" data-roles="' + esc(o.roles.join(",")) + '" /> ' +
        esc(o.title) + "</label>";
    });
    html += '<p style="font-size:13px;font-weight:700;color:var(--green-800);margin:12px 0 6px;">Board</p>';
    html += '<label style="display:flex;gap:8px;align-items:center;cursor:pointer;">' +
      '<input type="checkbox" class="pfRole" data-title="' + esc(BOARD_TITLE.title) + '" data-roles="' + esc(BOARD_TITLE.roles.join(",")) + '" /> ' +
      esc(BOARD_TITLE.title) + "</label>";
    html += '<p style="font-size:13px;font-weight:700;color:var(--green-800);margin:12px 0 6px;">Committee Chair of</p>';
    COMMITTEES.forEach(function (c) {
      var title = chairTitle(c);
      html += '<label style="display:flex;gap:8px;align-items:center;cursor:pointer;">' +
        '<input type="checkbox" class="pfRole" data-title="' + esc(title) + '" data-roles="committee" data-committee="' + esc(c) + '" /> ' +
        esc(c) + "</label>";
    });
    html += '<p style="font-size:12px;color:var(--muted);margin:8px 0 0;line-height:1.4;">After an officer approves: <b>Merchandise</b> unlocks Shop Studio; <b>Social</b> and <b>Charity</b> unlock Raffles, Event Studio, and related reports. Officers and board keep the Officer desk. Treasurer (and board) can see payments.</p>';
    host.innerHTML = html;
  }

  function groupLeaders(rows) {
    var officers = [];
    var board = [];
    var chairs = [];
    var held = {};
    (rows || []).forEach(function (m) {
      var titles = splitTitles(m.officer_title);
      if (!titles.length) return;
      var name = [m.first_name, m.last_name].filter(Boolean).join(" ").trim();
      titles.forEach(function (title) {
        var card = {
          member_id: m.member_id,
          first_name: m.first_name,
          last_name: m.last_name,
          name: name,
          title: title,
          photo_url: m.photo_url,
          vacant: false
        };
        if (isOfficerTitle(title)) officers.push(card);
        else if (isBoardTitle(title)) board.push(card);
        else if (isChairTitle(title)) {
          var committee = committeeFromChairTitle(title);
          card.committee = committee;
          chairs.push(card);
          if (committee) held[committee.toLowerCase()] = true;
        }
      });
    });
    COMMITTEES.forEach(function (committee) {
      if (held[committee.toLowerCase()]) return;
      chairs.push({
        member_id: null,
        first_name: "Open",
        last_name: "",
        name: "Open",
        title: chairTitle(committee),
        committee: committee,
        photo_url: null,
        vacant: true
      });
    });
    return { officers: officers, board: board, chairs: chairs };
  }

  root.KOS_LEADERSHIP = {
    COMMITTEES: COMMITTEES,
    OFFICER_TITLES: OFFICER_TITLES,
    BOARD_TITLE: BOARD_TITLE,
    chairTitle: chairTitle,
    splitTitles: splitTitles,
    rolesForTitle: rolesForTitle,
    highestMemberRole: highestMemberRole,
    collectChecked: collectChecked,
    mountQuestionnaire: mountQuestionnaire,
    groupLeaders: groupLeaders
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountQuestionnaire);
  } else {
    mountQuestionnaire();
  }
})(window);
