/* Krewe of Shamrock - member profiles, officer titles, role-aware home.
   Loaded only on members.html. Comments are for a beginner reading the file. */
(function () {
  "use strict";

  var SB_URL = "https://oazwkwflgbthojvnclfc.supabase.co";
  var SB_KEY = "sb_publishable_aMCyVxkiolMuBt9_R990CA_xQmXLaaS";

  /* Display titles the krewe can assign. Access still comes from member_role
     plus member_roles grants. Language matches the Shamrock Leaders directory. */
  var TITLE_CHOICES = [
    "",
    "President",
    "Vice President",
    "Treasurer",
    "Secretary",
    "Board Member",
    "Board",
    "Committee Chair of Finance",
    "Committee Chair of Bylaws",
    "Committee Chair of Charity",
    "Committee Chair of Technology",
    "Chair of Technology",
    "Committee Chair of Membership",
    "Committee Chair of Social",
    "Committee Chair of Float",
    "Committee Chair of Parade",
    "Committee Chair of Merchandise",
    "Chair of Merchandise",
    "Co-Chair of Merchandise"
  ];

  var ACCESS_LABEL = {
    member: "Member",
    officer: "Officer",
    captain: "Captain",
    board: "Board",
    prospect: "Prospect"
  };

  function esc(s) {
    return (s == null ? "" : String(s)).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function initials(first, last) {
    var a = (first || "").trim().charAt(0);
    var b = (last || "").trim().charAt(0);
    return ((a + b) || "?").toUpperCase();
  }

  function prettyRole(role, title) {
    if (title && String(title).trim()) return String(title).trim();
    return ACCESS_LABEL[String(role || "member").toLowerCase()] || "Member";
  }

  function isLeadership(role, title) {
    var r = String(role || "").toLowerCase();
    if (r === "officer" || r === "captain" || r === "board") return true;
    return !!(title && String(title).trim());
  }

  function profileOf() {
    return window.kosProfile || {};
  }

  function waitForUnlock(fn) {
    if (window.__kosInit || (document.getElementById("memberContent") && document.getElementById("memberContent").style.display === "block")) {
      fn();
      return;
    }
    var n = 0;
    var t = setInterval(function () {
      n += 1;
      if (window.__kosInit || (document.getElementById("memberContent") && document.getElementById("memberContent").style.display === "block")) {
        clearInterval(t);
        fn();
      } else if (n > 80) {
        clearInterval(t);
      }
    }, 250);
  }

  function client() {
    if (window.__kosProfileSb) return window.__kosProfileSb;
    if (!window.supabase || !window.supabase.createClient) return null;
    window.__kosProfileSb = window.supabase.createClient(SB_URL, SB_KEY);
    return window.__kosProfileSb;
  }

  async function getSb() {
    var existing = client();
    if (existing) return existing;
    var mod = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    window.supabase = window.supabase || { createClient: mod.createClient };
    window.__kosProfileSb = mod.createClient(SB_URL, SB_KEY);
    return window.__kosProfileSb;
  }

  async function officerFlag(sb) {
    if (window.__kosIsOfficer === true || window.__kosIsOfficer === false) return window.__kosIsOfficer;
    try {
      var res = await sb.rpc("is_krewe_officer");
      window.__kosIsOfficer = !!res.data;
    } catch (e) {
      window.__kosIsOfficer = false;
    }
    return window.__kosIsOfficer;
  }

  function avatarHtml(photo, first, last, sizeClass) {
    var cls = sizeClass || "mp-av";
    if (photo) {
      return '<img class="' + cls + '" src="' + esc(photo) + '" alt="" />';
    }
    return '<div class="' + cls + ' mp-av-fallback" aria-hidden="true">' + esc(initials(first, last)) + "</div>";
  }

  async function loadDirectory(sb) {
    var grid = document.getElementById("dirGrid");
    if (!grid) return [];
    var rows = [];
    var rich = await sb.from("v_member_profiles")
      .select("member_id,first_name,last_name,member_role,officer_title,bio,hometown,parade_since,interests,photo_url,join_date")
      .order("last_name", { ascending: true });
    if (!rich.error && rich.data) {
      rows = rich.data;
    } else {
      var plain = await sb.from("member_directory")
        .select("first_name,last_name,member_role")
      .order("last_name", { ascending: true });
      rows = plain.data || [];
    }
    window.__kosDirRows = rows;
    renderDirectory();
    if (typeof renderLeadership === "function") renderLeadership(rows);
    return rows;
  }

  function renderDirectory() {
    var grid = document.getElementById("dirGrid");
    if (!grid) return;
    var q = ((document.getElementById("dirSearch") && document.getElementById("dirSearch").value) || "").toLowerCase();
    var filter = (document.getElementById("dirFilter") && document.getElementById("dirFilter").value) || "all";
    var rows = window.__kosDirRows || [];
    var shown = rows.filter(function (m) {
      var name = ((m.first_name || "") + " " + (m.last_name || "")).toLowerCase();
      var title = (m.officer_title || "").toLowerCase();
      if (q && name.indexOf(q) === -1 && title.indexOf(q) === -1) return false;
      if (filter === "leaders") return isLeadership(m.member_role, m.officer_title);
      if (filter === "members") return !isLeadership(m.member_role, m.officer_title);
      return true;
    });
    if (!shown.length) {
      grid.innerHTML = '<p class="empty">No members match that search.</p>';
      return;
    }
    grid.innerHTML = shown.map(function (m) {
      var idAttr = m.member_id ? ' data-mid="' + esc(m.member_id) + '"' : "";
      var clickable = m.member_id ? " mp-dir-click" : "";
      return (
        '<button type="button" class="dir-card mp-dir-card' + clickable + '"' + idAttr + ">" +
          avatarHtml(m.photo_url, m.first_name, m.last_name, "mp-av-sm") +
          '<div class="mp-dir-copy">' +
            '<div class="nm">' + esc(m.first_name) + " " + esc(m.last_name) + "</div>" +
            '<div class="rl">' + esc(prettyRole(m.member_role, m.officer_title)) + "</div>" +
          "</div>" +
        "</button>"
      );
    }).join("");
    grid.querySelectorAll(".mp-dir-click").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openProfile(btn.getAttribute("data-mid"));
      });
    });
  }

  window.renderDir = renderDirectory;
  window.kosOpenProfile = function () {};
  waitForUnlock(async function () {
    var sb = await getSb();
    var off = await officerFlag(sb);
    var rows = await loadDirectory(sb);
    var hero = document.getElementById("mpHero");
    var p = profileOf();
    if (hero) {
      hero.innerHTML =
        '<div class="mp-hero-card">' +
          avatarHtml(p.photo_url, p.first_name, p.last_name, "mp-av-lg") +
          '<div class="mp-hero-copy"><h2>' + esc((p.first_name || "") + " " + (p.last_name || "")).trim() + '</h2></div></div>';
    }
    var desk = document.getElementById("officerDeskCard");
    if (desk) desk.style.display = off ? "block" : "none";
  });
})();
