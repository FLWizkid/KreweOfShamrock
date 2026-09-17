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

  function officerRank(title) {
    var t = String(title || "").toLowerCase();
    var i;
    for (i = 0; i < OFFICER_TITLES.length; i++) {
      if (OFFICER_TITLES[i].title.toLowerCase() === t) return i;
    }
    return 99;
  }

  function committeeRank(name) {
    var n = String(name || "").toLowerCase();
    var i;
    for (i = 0; i < COMMITTEES.length; i++) {
      if (COMMITTEES[i].toLowerCase() === n) return i;
    }
    return 99;
  }

  function byLastFirst(a, b) {
    return String(a.last_name || "").localeCompare(String(b.last_name || "")) ||
      String(a.first_name || "").localeCompare(String(b.first_name || ""));
  }

  function sortOfficers(list) {
    return (list || []).slice().sort(function (a, b) {
      var rank = officerRank(a.title) - officerRank(b.title);
      return rank || byLastFirst(a, b);
    });
  }

  function sortBoard(list) {
    return (list || []).slice().sort(byLastFirst);
  }

  function sortChairs(list) {
    return (list || []).slice().sort(function (a, b) {
      var rank = committeeRank(a.committee) - committeeRank(b.committee);
      if (rank) return rank;
      if (!!a.vacant !== !!b.vacant) return a.vacant ? 1 : -1;
      return byLastFirst(a, b);
    });
  }

  function leaderInitials(item) {
    var a = String((item && item.first_name) || "").charAt(0);
    var b = String((item && item.last_name) || "").charAt(0);
    return ((a + b).toUpperCase() || "☘");
  }

  function avatarHtml(item) {
    if (item.vacant) {
      return '<span class="leaders-av leaders-av-open" aria-hidden="true">☘</span>';
    }
    if (item.photo_url) {
      return '<span class="leaders-av"><img src="' + esc(item.photo_url) + '" alt="" /></span>';
    }
    return '<span class="leaders-av" aria-hidden="true">' + esc(leaderInitials(item)) + '</span>';
  }

  function wrapPerson(item, inner) {
    var cls = "leaders-line" + (item.vacant ? " leaders-vacant" : "");
    if (item.member_id && !item.vacant) {
      return '<li class="' + cls + '">' +
        '<button type="button" class="leaders-person" data-mid="' + esc(item.member_id) + '">' + inner + "</button></li>";
    }
    var label = item.vacant && item.committee
      ? esc(item.committee) + " chair seat is open"
      : "";
    return '<li class="' + cls + '">' +
      '<div class="leaders-person"' + (label ? ' aria-label="' + label + '"' : "") + ">" + inner + "</div></li>";
  }

  function listHtml(items, rowFn) {
    if (!items.length) return '<p class="leaders-empty">None listed yet.</p>';
    return '<ul class="leaders-list">' + items.map(rowFn).join("") + "</ul>";
  }

  function officerRow(item) {
    var inner = avatarHtml(item) +
      '<span class="leaders-copy">' +
        '<span class="leaders-role">' + esc(item.title || "") + "</span>" +
        '<span class="leaders-name">' + esc(item.name || "") + "</span>" +
      "</span>";
    return wrapPerson(item, inner);
  }

  function boardRow(item) {
    var inner = avatarHtml(item) +
      '<span class="leaders-copy"><span class="leaders-name">' + esc(item.name || "") + "</span></span>";
    return wrapPerson(item, inner);
  }

  function chairRow(item) {
    var inner = avatarHtml(item) +
      '<span class="leaders-copy"><span class="leaders-name">' + esc(item.name || "Open") + "</span></span>" +
      '<span class="leaders-committee">' + esc(item.committee || "") + "</span>";
    return wrapPerson(item, inner);
  }

  function renderLeadersHtml(groups) {
    groups = groups || { officers: [], board: [], chairs: [] };
    var officers = sortOfficers(groups.officers);
    var board = sortBoard(groups.board);
    var chairs = sortChairs(groups.chairs);
    return (
      '<header class="leaders-head">' +
        '<p class="leaders-kicker">With gratitude</p>' +
        '<h3 id="leadersBoardTitle">Shamrock Leaders</h3>' +
        '<p class="leaders-intro">Officers, board members, and committee chairs who serve the Krewe of Shamrock.</p>' +
      "</header>" +
      '<div class="leaders-grid">' +
        '<section class="leaders-col leaders-officers" aria-labelledby="leadersOfficersTitle">' +
          '<h4 id="leadersOfficersTitle">Officers</h4>' +
          listHtml(officers, officerRow) +
        "</section>" +
        '<section class="leaders-col leaders-col-board" aria-labelledby="leadersBoardColTitle">' +
          '<h4 id="leadersBoardColTitle">Board</h4>' +
          listHtml(board, boardRow) +
        "</section>" +
        '<section class="leaders-col leaders-chairs" aria-labelledby="leadersChairsTitle">' +
          '<h4 id="leadersChairsTitle">Committee Chairs</h4>' +
          listHtml(chairs, chairRow) +
        "</section>" +
      "</div>" +
      '<p class="leaders-thanks">Thank you for the time, care, and craic you give this krewe.</p>'
    );
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
    groupLeaders: groupLeaders,
    renderLeadersHtml: renderLeadersHtml
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountQuestionnaire);
  } else {
    mountQuestionnaire();
  }
})(window);
