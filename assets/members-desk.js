/* Member Hub: personal home + tabbed sections. Preserves existing feature cards. */
(function () {
  "use strict";

  var TAB_HOME = "hub";
  var CSS = [
    ".hub-wrap{margin:0 0 18px;}",
    ".hub-welcome{position:relative;overflow:hidden;background:#fff;border:1px solid rgba(168,128,28,.28);border-radius:18px;padding:20px 22px;box-shadow:var(--shadow-sm);}",
    ".hub-welcome::before{content:'☘';position:absolute;top:-8px;right:10px;font-size:64px;opacity:.12;pointer-events:none;transform:rotate(12deg);}",
    ".hub-welcome h2{font-family:var(--display);color:var(--green-800);margin:0 0 12px;font-size:26px;}",
    ".hub-craic{position:relative;overflow:hidden;background:linear-gradient(165deg,#1d6b3e 0%,#14532d 55%,#0f3d22 100%);color:#f6efdc;border-radius:20px;padding:22px 22px 18px;box-shadow:var(--shadow-sm);border:1px solid rgba(212,175,55,.45);}",
    ".hub-craic::before,.hub-craic::after{content:'☘';position:absolute;pointer-events:none;line-height:1;opacity:.16;z-index:0;}",
    ".hub-craic::before{top:-6px;left:8px;font-size:72px;transform:rotate(-18deg);}",
    ".hub-craic::after{bottom:-10px;right:6px;font-size:84px;transform:rotate(22deg);opacity:.14;}",
    ".hub-craic > *{position:relative;z-index:1;}",
    ".hub-craic h2{font-family:var(--display);margin:0 0 4px;font-size:28px;color:#fff;}",
    ".hub-craic .tag{opacity:.9;font-size:16px;margin:0 0 14px;}",
    ".hub-craic-grid{display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center;}",
    ".hub-craic .rank-big{font-size:52px;line-height:1;}",
    ".hub-craic .clovers{font-size:34px;font-family:var(--display);font-weight:700;}",
    ".hub-craic .meta{font-size:16px;opacity:.92;}",
    ".hub-craic .prog{height:12px;background:rgba(255,255,255,.2);border-radius:999px;overflow:hidden;margin-top:8px;box-shadow:inset 0 1px 2px rgba(0,0,0,.18);}",
    ".hub-craic .prog>i{display:block;height:100%;background:linear-gradient(90deg,#fff6c8 0%,#f0d78c 35%,#d4af37 70%,#f7e7a1 100%);box-shadow:0 0 10px rgba(240,215,140,.55);position:relative;}",
    ".hub-craic .prog>i::after{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.45) 50%,transparent 60%);background-size:200% 100%;animation:hubSparkle 2.8s ease-in-out infinite;}",
    "@keyframes hubSparkle{0%,100%{background-position:100% 0}50%{background-position:0 0}}",
    ".hub-quest{margin-top:14px;}",
    ".hub-quest-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 10px;}",
    ".hub-quest-head b{font-family:var(--display);font-size:18px;}",
    ".hub-quest-head span{font-size:15px;opacity:.88;}",
    ".hub-quest-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;}",
    ".hub-quest-card{background:rgba(255,255,255,.12);border:1px solid rgba(240,215,140,.35);border-radius:14px;padding:12px 13px;display:flex;flex-direction:column;gap:6px;min-height:118px;}",
    ".hub-quest-card .date{display:inline-block;align-self:flex-start;background:rgba(240,215,140,.22);border:1px solid rgba(240,215,140,.45);color:#f6efdc;border-radius:999px;padding:3px 9px;font-size:14px;font-family:var(--display);letter-spacing:.02em;}",
    ".hub-quest-card .title{font-family:var(--display);font-size:17px;line-height:1.25;color:#fff;}",
    ".hub-quest-card .meta{font-size:14px;opacity:.88;line-height:1.35;}",
    ".hub-quest-card .hint{font-size:14px;color:#f0d78c;font-weight:700;}",
    ".hub-quest-card .btn{margin-top:auto;background:#f0d78c;color:#14532d;border:0;text-decoration:none;display:inline-block;padding:7px 12px;border-radius:999px;font-weight:700;font-size:15px;align-self:flex-start;}",
    ".hub-quest-empty{background:rgba(255,255,255,.12);border:1px solid rgba(240,215,140,.35);border-radius:14px;padding:12px 14px;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;}",
    ".hub-quest-empty .btn{background:#f0d78c;color:#14532d;border:0;text-decoration:none;display:inline-block;padding:8px 14px;border-radius:999px;font-weight:700;}",
    ".hub-soft-desk{margin-top:14px;background:#fff;border:1px solid rgba(168,128,28,.28);border-radius:16px;padding:14px 16px;color:var(--green-800);}",
    ".hub-soft-desk h3{font-family:var(--display);margin:0 0 8px;font-size:19px;}",
    ".hub-soft-desk .hub-chips{margin:0 0 8px;}",
    ".hub-chips{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 4px;}",
    ".hub-chip{display:inline-flex;align-items:center;gap:8px;background:#fbf7ec;border:1px solid rgba(168,128,28,.35);border-radius:999px;padding:8px 14px;font-family:var(--display);font-size:16px;color:var(--green-800);}",
    ".hub-chip.ok{background:var(--green-800);color:#f6efdc;border-color:var(--green-800);}",
    ".hub-chip.warn{background:#f0e2bd;color:#7a5b00;border-color:#d4b45a;}",
    ".hub-actions{margin-top:16px;}",
    ".hub-actions h3{font-family:var(--display);color:var(--green-800);margin:0 0 10px;font-size:19px;}",
    ".hub-action-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;}",
    ".hub-action{text-align:left;background:#fffdf4;border:1px dashed rgba(168,128,28,.55);border-radius:14px;padding:12px 14px;cursor:pointer;font:inherit;}",
    ".hub-action:hover{background:#f7efd8;}",
    ".hub-action b{display:block;color:var(--green-800);font-family:var(--display);margin-bottom:4px;}",
    ".hub-action span{font-size:15px;color:var(--muted);line-height:1.35;}",
    ".hub-find{margin-top:14px;background:#fff;border:1px solid rgba(168,128,28,.28);border-radius:16px;padding:14px 16px;}",
    ".hub-find h3{font-family:var(--display);color:var(--green-800);margin:0 0 10px;font-size:19px;}",
    ".hub-find-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;}",
    ".hub-find .hub-action{width:100%;}",
    ".hub-officer-card{margin-top:16px;background:linear-gradient(145deg,#fff4c2 0%,#f0d078 38%,#d4a017 100%);color:#14532d;border-radius:20px;padding:22px 24px;display:flex;flex-direction:column;gap:14px;cursor:pointer;border:2px solid #a67c00;box-shadow:0 6px 18px rgba(166,124,0,.22);}",
    ".hub-officer-card:hover{filter:brightness(1.03);}",
    ".hub-officer-card .go{margin-left:auto;color:#7a5b00;font-family:var(--display);}",
    ".hub-officer-picker{background:#fff;border:1px solid rgba(168,128,28,.35);border-radius:16px;padding:14px 16px;margin:0 0 14px;}",
    ".hub-officer-picker label{display:block;font-family:var(--display);color:var(--green-800);font-size:17px;margin:0 0 8px;}",
    ".hub-officer-picker select{width:100%;box-sizing:border-box;font:inherit;font-size:17px;padding:12px 14px;border-radius:10px;border:1px solid rgba(168,128,28,.5);background:#fbf7ec;color:var(--green-800);}",
    ".hub-officer-picker .hint{margin:8px 0 0;font-size:15px;color:var(--muted);line-height:1.35;}",
    "#hubOfficer > .app-card.hub-officer-hidden,#hubOfficer > section.app-card.hub-officer-hidden{display:none !important;}",
    ".hub-tabs{position:sticky;top:0;z-index:40;display:flex;flex-wrap:wrap;gap:8px;padding:10px 0 14px;background:linear-gradient(180deg,#fbf7ec 70%,rgba(251,247,236,0));}",
    ".hub-tabs button{border:1px solid rgba(168,128,28,.4);background:#fff;color:var(--green-800);border-radius:999px;padding:8px 14px;font-family:var(--display);font-size:16px;cursor:pointer;}",
    ".hub-tabs button.on{background:var(--green-800);color:#f6efdc;border-color:var(--green-800);}",
    ".hub-panel{display:none !important;}",
    ".hub-panel.hub-on{display:block !important;}",
    ".hub-panel > .member-grid{display:grid;gap:26px;}",
    ".hub-docs{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;}",
    ".hub-docs a{display:inline-block;background:#f0e8d2;border:1px solid rgba(168,128,28,.3);color:var(--green-800);border-radius:999px;padding:6px 13px;font-size:16px;font-family:var(--display);text-decoration:none;}",
    ".hub-docs a:hover{background:#e8ddc0;}",
    ".hub-profile{background:#fff;border:1px solid rgba(168,128,28,.28);border-radius:16px;padding:16px 18px;margin-bottom:14px;}",
    ".hub-profile h3{margin:0 0 6px;font-family:var(--display);color:var(--green-800);}",
    ".hub-fb-members{margin-top:12px;padding:12px 14px;background:#fbf7ec;border:1px solid rgba(168,128,28,.35);border-radius:12px;}",
    ".hub-fb-members a{color:var(--green-800);font-weight:700;text-decoration:none;}",
    ".hub-fb-members a:hover{text-decoration:underline;}",
    ".hub-badge{display:inline-block;margin-left:6px;min-width:20px;padding:1px 6px;border-radius:999px;background:#b3261e;color:#fff;font-size:14px;text-align:center;}",
    ".hub-avatar{width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);flex:none;}",
    ".hub-avatar-blank{display:flex;align-items:center;justify-content:center;background:var(--green-800);color:#f6efdc;font-family:var(--display);font-size:24px;}",
    ".hub-prof-head{display:flex;gap:14px;align-items:center;margin:6px 0 10px;}",
    ".hub-prof-line{margin:6px 0;font-size:16px;}",
    ".hub-prof-form label{display:block;font-size:15px;color:var(--muted);margin:10px 0 3px;}",
    ".hub-prof-form input,.hub-prof-form textarea{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid rgba(168,128,28,.4);border-radius:8px;font:inherit;background:#fff;}",
    ".hub-prof-form textarea{min-height:70px;resize:vertical;}",
    ".hub-prof-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 12px;}",
    "@media (max-width:520px){.hub-prof-grid{grid-template-columns:1fr;}}",
    ".hub-appr{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;border:1px solid rgba(168,128,28,.3);border-radius:12px;padding:10px 12px;margin:8px 0;background:#fffdf4;flex-wrap:wrap;}",
    ".hub-appr .muted{color:var(--muted);font-size:15px;}",
    ".hub-appr-btns{display:flex;gap:8px;flex-wrap:wrap;}",
    ".hub-appr-h{font-family:var(--display);color:var(--green-800);margin:14px 0 6px;font-size:18px;}",
    ".hub-claim{margin-top:0;}",
    ".hub-claim label{display:block;font-size:15px;color:var(--muted);margin:10px 0 3px;}",
    ".hub-claim select,.hub-claim input,.hub-claim textarea{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid rgba(168,128,28,.4);border-radius:8px;font:inherit;background:#fff;}",
    ".hub-claim textarea{min-height:64px;resize:vertical;}",
    ".hub-claim-row{display:none;}",
    ".hub-claim-row.on{display:block;}",
    ".hub-claim-msg{margin:10px 0 0;font-size:16px;color:var(--green-800);}",
    ".hub-claim-list{margin:14px 0 0;padding:0;list-style:none;}",
    ".hub-claim-list li{border-top:1px solid rgba(168,128,28,.22);padding:8px 0;font-size:16px;}",
    ".hub-claim-list .st{font-size:14px;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);}",
    ".hub-claim-list .st.pending{color:#7a5b00;}",
    ".hub-claim-list .st.approved{color:var(--green-800);}",
    ".hub-claim-list .st.denied{color:#b3261e;}",
    "#memberContent > .member-grid{display:none !important;}",
    ".hub-event-form h3,.hub-event-list h3{font-family:var(--display);color:var(--green-800);margin:0 0 10px;font-size:19px;}",
    ".hub-event-form label{display:block;font-size:15px;color:var(--muted);margin:10px 0 3px;}",
    ".hub-event-form input,.hub-event-form textarea,.hub-event-form select{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid rgba(168,128,28,.4);border-radius:8px;font:inherit;background:#fff;}",
    ".hub-event-form textarea{min-height:76px;resize:vertical;}",
    ".hub-event-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 12px;}",
    ".hub-event-grid .wide{grid-column:1 / -1;}",
    ".hub-event-checks{display:flex;flex-wrap:wrap;gap:16px;margin:12px 0;}",
    ".hub-event-checks label{display:flex;align-items:center;gap:7px;margin:0;color:var(--green-800);cursor:pointer;}",
    ".hub-event-checks input{width:auto;}",
    "#hubEventStudio,.hub-event-list,.hub-event-form{width:100%;max-width:100%;box-sizing:border-box;}",
    ".hub-event-row{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;border:1px solid rgba(168,128,28,.3);border-radius:12px;padding:11px 12px;margin:8px 0;background:#fffdf4;width:100%;box-sizing:border-box;}",
    ".hub-event-row b{font-family:var(--display);color:var(--green-800);}",
    ".hub-event-row .muted{color:var(--muted);font-size:15px;line-height:1.45;}",
    ".hub-event-copy{flex:1 1 220px;min-width:0;}",
    ".hub-event-row .hub-appr-btns{flex:1 1 auto;justify-content:flex-end;}",
    ".hub-event-row .qr-slot{flex:1 1 100%;width:100%;}",
    ".hub-event-msg{min-height:1.2em;color:var(--green-800);font-size:16px;margin:8px 0 0;}",
    ".hub-event-form{margin-top:18px;padding-top:16px;border-top:1px dashed rgba(168,128,28,.4);}",
    ".hub-flyer-note{font-size:14px;color:var(--muted);margin:4px 0 0;}",
    ".hub-flyer-preview{margin-top:10px;display:none;align-items:center;gap:12px;flex-wrap:wrap;}",
    ".hub-flyer-preview.show{display:flex;}",
    ".hub-flyer-preview img{max-width:160px;max-height:120px;border-radius:10px;border:1px solid rgba(168,128,28,.35);object-fit:cover;background:#fff;}",
    ".hub-event-thumb{width:54px;height:54px;border-radius:10px;object-fit:cover;border:1px solid rgba(168,128,28,.35);background:#f3efe2;flex:none;}",
    ".hub-event-thumb.ph{display:grid;place-items:center;font-size:13px;color:var(--muted);text-align:center;padding:4px;}",
    "@media(max-width:620px){.hub-event-grid{grid-template-columns:1fr;}.hub-event-grid .wide{grid-column:auto;}.hub-event-row{flex-direction:column;}}",
    "@keyframes kosHoursFlash{0%,100%{box-shadow:none}40%{box-shadow:0 0 0 4px rgba(29,107,62,.45)}}",
    "#vhForm.kos-hours-flash{animation:kosHoursFlash 1.6s ease;border-radius:12px;}",
    /* ---- Signed-in + Officer desk discoverability ---- */
    ".hub-member-bar{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:10px;padding:8px 2px 12px;}",
    ".hub-signed-pill{display:none;align-items:center;gap:8px;background:var(--green-800);color:#f6efdc;border:1px solid rgba(212,175,55,.55);border-radius:999px;padding:8px 14px;font-family:var(--display);font-size:15px;line-height:1.2;box-shadow:var(--shadow-sm);}",
    ".hub-signed-pill.is-on{display:inline-flex;}",
    ".hub-signed-pill .dot{width:8px;height:8px;border-radius:50%;background:#7dcea0;box-shadow:0 0 0 3px rgba(125,206,160,.35);flex:none;}",
    ".hub-signout-btn{cursor:pointer;border:1px solid rgba(168,128,28,.5);background:#fff;color:var(--green-800);border-radius:999px;padding:8px 14px;font-size:14px;font-weight:600;font-family:var(--display);}",
    ".hub-officer-chip{display:none;align-items:center;gap:8px;margin-right:auto;background:linear-gradient(180deg,#1d6b3e,var(--green-900));color:#fff;border:2px solid var(--gold);border-radius:999px;padding:9px 16px;font-family:var(--display);font-size:16px;font-weight:700;cursor:pointer;box-shadow:var(--shadow-sm);}",
    ".hub-officer-chip.show{display:inline-flex;}",
    ".hub-officer-chip:hover{filter:brightness(1.06);}",
    ".hub-officer-chip .ic{font-size:18px;line-height:1;}",
    ".hub-tabs button[data-hub-tab=\"officer\"]{border:2px solid var(--gold);background:linear-gradient(180deg,#1d6b3e,var(--green-900));color:#fff;font-weight:700;padding:10px 16px;box-shadow:0 2px 10px rgba(12,59,33,.18);}",
    ".hub-tabs button[data-hub-tab=\"officer\"].on{background:var(--gold);color:var(--green-900);border-color:var(--gold-deep);}",
    ".hub-officer-card{margin-top:18px;background:linear-gradient(145deg,#fff4c2 0%,#f0d078 38%,#d4a017 100%);color:#14532d;border-radius:20px;padding:22px 24px;display:flex;flex-direction:column;gap:14px;cursor:pointer;border:2px solid #a67c00;box-shadow:0 6px 18px rgba(166,124,0,.22);}",
    ".hub-officer-card-top{display:flex;gap:16px;align-items:center;width:100%;}",
    ".hub-officer-card .ic{font-size:42px;line-height:1;flex:none;}",
    ".hub-officer-card .copy{flex:1;min-width:0;}",
    ".hub-officer-card b{display:block;font-family:var(--display);font-size:28px;margin:0 0 6px;letter-spacing:.02em;color:#14532d;}",
    ".hub-officer-card .sub{opacity:.95;font-size:17px;line-height:1.4;color:#3d5a40;}",
    ".hub-officer-card .go{margin-left:auto;color:#7a5b00;font-family:var(--display);font-size:20px;font-weight:700;flex:none;}",
    ".hub-officer-tools{display:flex;flex-wrap:wrap;gap:8px;}",
    ".hub-officer-tool{display:inline-flex;align-items:center;background:rgba(255,255,255,.72);border:1px solid rgba(122,91,0,.35);border-radius:999px;padding:7px 12px;font-size:15px;line-height:1.3;color:#14532d;font-family:var(--display);}",
    ".hub-officer-card:hover{filter:brightness(1.03);}",
    "@keyframes hubOfficerPulse{0%,100%{box-shadow:0 6px 18px rgba(166,124,0,.22)}40%{box-shadow:0 0 0 8px rgba(212,175,55,.55),0 6px 18px rgba(166,124,0,.22)}70%{box-shadow:0 0 0 3px rgba(212,175,55,.28),0 6px 18px rgba(166,124,0,.22)}}",
    ".hub-officer-card.hub-officer-pulse{animation:hubOfficerPulse 1.8s ease 2;}",
    /* ---- Officer desk layout ---- */
    ".hub-officer-hero{background:#fff;border:1px solid rgba(168,128,28,.3);border-radius:18px;padding:18px 20px;margin:0 0 16px;}",
    ".hub-officer-hero h2{font-family:var(--display);color:var(--green-800);margin:0 0 6px;font-size:26px;}",
    ".hub-officer-hero p{margin:0;color:var(--muted);font-size:17px;line-height:1.4;}",
    ".hub-officer-launcher{margin:0 0 18px;}",
    ".hub-officer-section{margin:0 0 16px;}",
    ".hub-officer-section h3{font-family:var(--display);color:var(--green-800);font-size:18px;margin:0 0 10px;letter-spacing:.02em;}",
    ".hub-officer-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;}",
    ".hub-officer-tile{text-align:left;background:#fff;border:1px solid rgba(168,128,28,.35);border-radius:16px;padding:16px 16px 14px;cursor:pointer;font:inherit;min-height:108px;display:flex;flex-direction:column;gap:6px;box-shadow:var(--shadow-sm);transition:border-color .15s,background .15s,transform .15s;}",
    ".hub-officer-tile:hover{background:#fbf7ec;border-color:var(--gold-deep);transform:translateY(-1px);}",
    ".hub-officer-tile .tic{font-size:26px;line-height:1;}",
    ".hub-officer-tile b{font-family:var(--display);color:var(--green-800);font-size:18px;line-height:1.25;}",
    ".hub-officer-tile span{font-size:15px;color:var(--muted);line-height:1.35;}",
    ".hub-officer-tile.on{background:linear-gradient(180deg,#1d6b3e,var(--green-900));border-color:var(--gold);color:#fff;}",
    ".hub-officer-tile.on b,.hub-officer-tile.on span{color:#f6efdc;}",
    ".hub-officer-tile.on span{opacity:.9;}",
    ".hub-officer-activebar{display:none;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:#fbf7ec;border:1px solid rgba(168,128,28,.35);border-radius:14px;padding:12px 14px;margin:0 0 14px;}",
    ".hub-officer-activebar.show{display:flex;}",
    ".hub-officer-activebar .lbl{font-family:var(--display);color:var(--green-800);font-size:17px;}",
    ".hub-officer-activebar button{border:1px solid rgba(168,128,28,.45);background:#fff;color:var(--green-800);border-radius:999px;padding:8px 14px;font-family:var(--display);font-size:15px;cursor:pointer;}",
    ".hub-officer-picker{background:#fff;border:1px solid rgba(168,128,28,.28);border-radius:14px;padding:12px 14px;margin:0 0 14px;}",
    ".hub-officer-picker label{display:block;font-family:var(--display);color:var(--green-800);font-size:15px;margin:0 0 6px;}",
    ".hub-officer-picker select{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:11px 12px;border-radius:10px;border:1px solid rgba(168,128,28,.45);background:#fbf7ec;color:var(--green-800);}",
    ".hub-officer-picker .hint{margin:6px 0 0;font-size:14px;color:var(--muted);line-height:1.35;}",
    ".hub-officer-picker.compact{opacity:.95;}",
    "#hubOfficer > .app-card.hub-officer-hidden,#hubOfficer > section.app-card.hub-officer-hidden{display:none !important;}",
    "@media (max-width:520px){.hub-officer-card{padding:20px 18px;}.hub-officer-card-top{flex-wrap:wrap;}.hub-officer-card .go{margin-left:0;}.hub-officer-card b{font-size:26px;}.hub-officer-tiles{grid-template-columns:1fr;}}",

    /* ==== Hub-wide calm polish (mobile-first, Sep 2026) ==== */
    ".hub-wrap{margin:0 0 22px;}",
    ".hub-shell{display:flex;flex-direction:column;gap:0;}",
    ".hub-member-bar{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:10px;padding:4px 0 10px;}",
    ".hub-signed-pill{display:none;align-items:center;gap:8px;background:var(--green-800);color:#f6efdc;border:1px solid rgba(212,175,55,.55);border-radius:999px;padding:10px 16px;font-family:var(--display);font-size:15px;line-height:1.25;box-shadow:var(--shadow-sm);max-width:100%;}",
    ".hub-signed-pill.is-on{display:inline-flex;}",
    ".hub-signed-pill .hub-signed-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:min(62vw,280px);}",
    ".hub-signout-btn{cursor:pointer;border:1px solid rgba(168,128,28,.45);background:#fff;color:var(--green-800);border-radius:999px;padding:10px 16px;font-size:15px;font-weight:600;font-family:var(--display);min-height:44px;}",
    ".hub-officer-chip{display:none;align-items:center;gap:8px;margin-right:auto;background:var(--green-800);color:#fff;border:1px solid var(--gold);border-radius:999px;padding:10px 16px;font-family:var(--display);font-size:15px;font-weight:700;cursor:pointer;min-height:44px;}",
    ".hub-officer-chip.show{display:inline-flex;}",
    ".hub-tabs{position:sticky;top:0;z-index:50;display:flex;flex-wrap:nowrap;gap:8px;padding:8px 0 12px;margin:0 0 14px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;background:rgba(251,247,236,.97);backdrop-filter:blur(8px);border-bottom:1px solid rgba(168,128,28,.22);}",
    ".hub-tabs::-webkit-scrollbar{display:none;}",
    ".hub-tabs button{flex:none;border:1px solid rgba(168,128,28,.32);background:#fff;color:var(--green-800);border-radius:999px;padding:11px 16px;font-family:var(--display);font-size:15px;cursor:pointer;min-height:44px;line-height:1.2;white-space:nowrap;}",
    ".hub-tabs button.on{background:var(--green-800);color:#f6efdc;border-color:var(--green-800);}",
    ".hub-tabs button[data-hub-tab=\"officer\"]{border-color:rgba(168,128,28,.55);background:#fff;color:var(--green-800);font-weight:700;box-shadow:none;}",
    ".hub-tabs button[data-hub-tab=\"officer\"].on{background:var(--gold);color:var(--green-900);border-color:var(--gold-deep);}",
    ".hub-panel{display:none !important;}",
    ".hub-panel.hub-on{display:block !important;}",
    ".hub-panel > .member-grid{display:grid;gap:18px;}",
    /* Home */
    ".hub-home-stack{display:flex;flex-direction:column;gap:14px;}",
    ".hub-craic{border-radius:18px;padding:20px 18px 16px;}",
    ".hub-craic h2{font-size:24px;}",
    ".hub-craic-grid{gap:12px;}",
    ".hub-quest-grid{grid-template-columns:1fr;gap:10px;}",
    ".hub-quest-card{min-height:0;padding:14px;}",
    ".hub-quest-card .btn{min-height:44px;padding:10px 14px;display:inline-flex;align-items:center;}",
    ".hub-soft-desk{margin-top:0;border-radius:16px;padding:16px 16px 14px;border:1px solid rgba(168,128,28,.22);box-shadow:none;}",
    ".hub-soft-desk h3{font-size:20px;margin:0 0 10px;}",
    ".hub-status-list{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:8px;}",
    ".hub-status-list li{display:flex;align-items:flex-start;gap:10px;background:#fbf7ec;border-radius:12px;padding:12px 14px;font-size:16px;line-height:1.35;color:#3a3a2e;}",
    ".hub-status-list .mark{flex:none;width:1.25em;text-align:center;}",
    ".hub-soft-desk .btn{min-height:48px;padding:12px 18px;font-size:16px;}",
    ".hub-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px;}",
    ".hub-chip{font-size:15px;padding:8px 12px;}",
    ".hub-officer-card{margin-top:0;background:linear-gradient(145deg,#fff4c2 0%,#f0d078 42%,#d4a017 100%);color:#14532d;border-radius:18px;padding:20px 18px;display:flex;flex-direction:column;gap:12px;cursor:pointer;border:2px solid #a67c00;box-shadow:0 6px 16px rgba(166,124,0,.18);}",
    ".hub-officer-card-top{display:flex;gap:14px;align-items:center;width:100%;}",
    ".hub-officer-card .ic{font-size:36px;line-height:1;flex:none;}",
    ".hub-officer-card b{display:block;font-family:var(--display);font-size:24px;margin:0 0 4px;letter-spacing:.02em;color:#14532d;}",
    ".hub-officer-card .sub{font-size:16px;line-height:1.4;color:#3d5a40;}",
    ".hub-officer-card .go{margin-left:auto;color:#7a5b00;font-family:var(--display);font-size:18px;font-weight:700;flex:none;}",
    ".hub-officer-inside{margin:0;padding:0 0 0 1.15em;list-style:disc;display:grid;gap:6px;font-size:16px;line-height:1.35;color:#14532d;}",
    ".hub-officer-inside li{padding:0;}",
    ".hub-find{margin-top:0;background:#fff;border:1px solid rgba(168,128,28,.22);border-radius:16px;padding:16px;}",
    ".hub-find h3{margin:0 0 10px;font-size:18px;}",
    ".hub-find-grid{display:grid;grid-template-columns:1fr;gap:10px;}",
    ".hub-action{width:100%;text-align:left;background:#fffdf4;border:1px solid rgba(168,128,28,.35);border-radius:14px;padding:14px 16px;cursor:pointer;font:inherit;min-height:56px;}",
    ".hub-action b{font-size:17px;margin-bottom:4px;}",
    ".hub-action span{font-size:15px;}",
    /* Officer desk calm */
    ".hub-officer-hero{background:#fbf7ec;border:0;border-radius:16px;padding:16px 16px 14px;margin:0 0 14px;}",
    ".hub-officer-hero h2{font-size:24px;margin:0 0 6px;}",
    ".hub-officer-hero p{margin:0;font-size:16px;line-height:1.45;color:var(--muted);}",
    ".hub-officer-launcher{margin:0 0 16px;}",
    ".hub-officer-section{margin:0 0 18px;}",
    ".hub-officer-section h3{font-family:var(--display);color:var(--green-800);font-size:15px;margin:0 0 8px;letter-spacing:.04em;text-transform:uppercase;opacity:.9;}",
    ".hub-officer-tiles{display:flex;flex-direction:column;gap:10px;}",
    ".hub-officer-tile{text-align:left;background:#fff;border:1px solid rgba(168,128,28,.28);border-radius:14px;padding:14px 16px;cursor:pointer;font:inherit;min-height:56px;display:grid;grid-template-columns:40px 1fr;grid-template-rows:auto auto;column-gap:12px;row-gap:2px;align-items:center;box-shadow:none;}",
    ".hub-officer-tile:hover{background:#fbf7ec;border-color:var(--gold-deep);transform:none;}",
    ".hub-officer-tile .tic{font-size:22px;line-height:1;grid-row:1 / span 2;align-self:center;}",
    ".hub-officer-tile b{font-family:var(--display);color:var(--green-800);font-size:17px;line-height:1.25;grid-column:2;}",
    ".hub-officer-tile span{font-size:15px;color:var(--muted);line-height:1.35;grid-column:2;}",
    ".hub-officer-tile.on{background:var(--green-800);border-color:var(--green-800);color:#fff;}",
    ".hub-officer-tile.on b,.hub-officer-tile.on span{color:#f6efdc;}",
    ".hub-officer-activebar{display:none;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid rgba(168,128,28,.28);border-radius:14px;padding:12px 14px;margin:0 0 14px;}",
    ".hub-officer-activebar.show{display:flex;position:sticky;top:58px;z-index:45;box-shadow:0 4px 14px rgba(0,0,0,.06);}",
    ".hub-officer-activebar .lbl{font-family:var(--display);color:var(--green-800);font-size:17px;}",
    ".hub-officer-activebar button{border:1px solid rgba(168,128,28,.4);background:#fbf7ec;color:var(--green-800);border-radius:999px;padding:12px 16px;font-family:var(--display);font-size:16px;cursor:pointer;min-height:48px;}",
    ".hub-officer-picker{background:transparent;border:0;border-radius:0;padding:4px 0 8px;margin:0 0 10px;}",
    ".hub-officer-picker label{display:block;font-family:var(--display);color:var(--green-800);font-size:15px;margin:0 0 6px;}",
    ".hub-officer-picker select{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:14px 12px;border-radius:12px;border:1px solid rgba(168,128,28,.4);background:#fff;color:var(--green-800);min-height:48px;}",
    ".hub-officer-picker .hint{margin:8px 0 0;font-size:14px;color:var(--muted);line-height:1.35;}",
    "#hubOfficer > .app-card.hub-officer-hidden,#hubOfficer > section.app-card.hub-officer-hidden{display:none !important;}",
    /* Panels: readable forms, larger taps, less nested chrome */
    ".hub-wrap .app-body,.hub-panel .app-body{font-size:16px;line-height:1.45;}",
    ".hub-wrap .app-card > .app-head{padding:14px 16px;}",
    ".hub-wrap .app-body{padding:16px;}",
    ".hub-profile{background:#fbf7ec;border:0;border-radius:14px;padding:14px;margin-bottom:12px;}",
    ".hub-docs{gap:8px;}",
    ".hub-docs a{min-height:44px;display:inline-flex;align-items:center;padding:10px 14px;}",
    ".hub-prof-form input,.hub-prof-form textarea,.hub-claim select,.hub-claim input,.hub-claim textarea,.hub-event-form input,.hub-event-form textarea,.hub-event-form select{font-size:16px;padding:12px 12px;border-radius:10px;min-height:48px;}",
    ".hub-prof-form textarea,.hub-claim textarea,.hub-event-form textarea{min-height:88px;}",
    ".hub-appr{padding:12px 14px;border-radius:12px;gap:10px;}",
    ".hub-appr-btns .btn,.hub-appr-btns button{min-height:44px;}",
    ".hub-event-row{padding:14px;border-radius:12px;}",
    ".dir-grid{grid-template-columns:1fr;gap:10px;}",
    ".dir-card{min-height:56px;padding:12px 14px;}",
    ".people-row{grid-template-columns:1fr 1fr;}",
    ".hub-panel .btn,.hub-wrap .btn{min-height:48px;}",
    "@media (min-width:720px){",
    ".hub-quest-grid{grid-template-columns:repeat(2,minmax(0,1fr));}",
    ".hub-officer-tiles{display:grid;grid-template-columns:1fr 1fr;gap:12px;}",
    ".hub-find-grid{grid-template-columns:1fr 1fr;}",
    ".hub-tabs{flex-wrap:wrap;overflow:visible;}",
    ".dir-grid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr));}",
    "}",
    "@media (max-width:520px){",
    ".hub-craic-grid{grid-template-columns:1fr;}",
    ".hub-officer-card-top{flex-wrap:nowrap;}",
    ".hub-officer-card .go{margin-left:auto;}",
    ".hub-officer-card b{font-size:22px;}",
    ".hub-prof-grid,.hub-event-grid{grid-template-columns:1fr;}",
    ".people-row{grid-template-columns:1fr;}",
    ".hub-member-bar{padding-bottom:8px;}",
    ".hub-signed-pill{order:1;width:100%;justify-content:flex-start;}",
    ".hub-signout-btn{order:2;}",
    ".hub-officer-chip{order:0;width:100%;justify-content:center;margin-right:0;}",
    "}",

  ].join("");

  var state = { officer: false, shopOnly: false, socialOnly: false, canViewPayments: false, canManageEvents: false, parade: null, hoursApproved: 0, membershipStatus: null, game: null, nextEvent: null, nextEvents: [] };
  var hoursDeepLink = false;

  function hoursIntent() {
    try {
      var hash = (location.hash || "").replace(/^#/, "").toLowerCase();
      var intent = "";
      try { intent = sessionStorage.getItem("kos_hub_intent") || ""; } catch (ie) {}
      return hoursDeepLink || intent === "hours" || hash === "hours" || hash === "volunteer";
    } catch (e) {
      return hoursDeepLink;
    }
  }

  function clearHoursIntent() {
    hoursDeepLink = false;
    try { sessionStorage.removeItem("kos_hub_intent"); } catch (re) {}
    try {
      var h = (location.hash || "").replace(/^#/, "").toLowerCase();
      if (h === "hours" || h === "volunteer") history.replaceState(null, "", location.pathname);
    } catch (he) {}
  }

  function injectCss() {
    if (document.getElementById("kosHubCss")) return;
    var s = document.createElement("style");
    s.id = "kosHubCss";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) {
    return (s == null ? "" : String(s)).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function firstName() {
    var p = window.kosProfile || {};
    if (p.first_name) return String(p.first_name);
    var dn = (p.display_name || "").toString().trim();
    if (dn) return dn.split(/\s+/)[0];
    return "Member";
  }

  function headingOf(sec) {
    var h = sec.querySelector("h2");
    return h ? (h.textContent || "").toLowerCase() : "";
  }

  function tagSections() {
    var sections = document.querySelectorAll("#memberContent .member-grid > section");
    sections.forEach(function (sec) {
      if (sec.getAttribute("data-hub")) return;
      if (sec.id === "prCard") sec.setAttribute("data-hub", "parade");
      else if (sec.id === "dashCard") {
        // Reports belong on Officer desk only — never on member Home.
        sec.setAttribute("data-hub", "officer");
        sec.style.display = "none";
        sec.setAttribute("hidden", "");
        sec.setAttribute("aria-hidden", "true");
      }
      else {
        var h = headingOf(sec);
        if (h.indexOf("parade") !== -1) sec.setAttribute("data-hub", "parade");
        else if (h.indexOf("craic") !== -1) sec.setAttribute("data-hub", "fun");
        else if (h.indexOf("raffle") !== -1) sec.setAttribute("data-hub", "hub");
        else if (h.indexOf("report") !== -1) sec.setAttribute("data-hub", "hub");
        else if (h.indexOf("share") !== -1) sec.setAttribute("data-hub", "hub");
        else if (h.indexOf("locker") !== -1) sec.setAttribute("data-hub", "parade");
        else if (h.indexOf("carpool") !== -1) sec.setAttribute("data-hub", "parade");
        else if (h.indexOf("van") !== -1) sec.setAttribute("data-hub", "parade");
        else if (h.indexOf("volunteer") !== -1 || h.indexOf("hours") !== -1) sec.setAttribute("data-hub", "parade");
        else if (h.indexOf("directory") !== -1) sec.setAttribute("data-hub", "krewe");
      }
    });
  }

  function relocateHours() {
    var pr = document.getElementById("prCard");
    var body = document.getElementById("hubHoursBody");
    if (!pr || !body) return;
    var nodes = Array.prototype.slice.call(pr.querySelectorAll(".app-body > *"));
    var frag = document.createDocumentFragment();
    nodes.forEach(function (n) {
      if (n.id === "prHours" || n.id === "vhForm" || (n.tagName === "H4" && /volunteer hours/i.test(n.textContent || ""))) {
        frag.appendChild(n);
      }
    });
    if (frag.childNodes.length) {
      body.innerHTML = "";
      body.appendChild(frag);
    } else {
      body.innerHTML = '<p style="font-size:16px;color:var(--muted);">Volunteer hours appear after your Parade Ready data loads. You can also log hours from the Parade Day tab.</p>';
    }
  }

  function moveIntoPanels() {
    if (document.getElementById("hubRoot")) return;
    var main = document.getElementById("memberContent");
    if (!main) return;
    var oldGrid = main.querySelector(".member-grid");
    if (!oldGrid) return;

    var root = document.createElement("div");
    root.id = "hubRoot";
    root.className = "hub-wrap";

    var tabs = [
      ["hub", "Home"],
      ["krewe", "My Krewe"],
      ["events", "Events"],
      ["parade", "Member desk"],
      ["fun", "Fun"],
      ["officer", "Officer"]
    ];
    var tabHtml = '<nav class="hub-tabs" id="hubTabs" aria-label="Member hub sections">';
    tabs.forEach(function (t) {
      tabHtml += '<button type="button" data-hub-tab="' + t[0] + '">' + t[1] + "</button>";
    });
    tabHtml += "</nav>";

    root.innerHTML =
      tabHtml +
      '<div id="hubHome" class="hub-panel hub-on" data-hub-panel="hub">' +
      '<div id="hubHomeTop" class="hub-home-stack"></div><div class="member-grid" id="hubHomeGrid"></div></div>' +
      '<div class="hub-panel" data-hub-panel="krewe"><div class="member-grid" id="hubKrewe"></div></div>' +
      '<div class="hub-panel" data-hub-panel="events"><div class="member-grid" id="hubEvents"></div></div>' +
      '<div class="hub-panel" data-hub-panel="parade"><div class="member-grid" id="hubParade"></div></div>' +
      '<div class="hub-panel" data-hub-panel="give" style="display:none"><div class="member-grid" id="hubGive"></div></div>' +
      '<div class="hub-panel" data-hub-panel="fun"><div class="member-grid" id="hubFun"></div></div>' +
      '<div class="hub-panel" data-hub-panel="officer"><div class="member-grid" id="hubOfficer"></div></div>';

    var bar = document.getElementById("memberBar");
    if (bar) bar.insertAdjacentElement("afterend", root);
    else main.insertBefore(root, oldGrid);

    var krewe = document.getElementById("hubKrewe");
    krewe.innerHTML =
      '<section class="app-card"><div class="app-head"><span class="ic">☘</span><div><h2>My Krewe</h2><small>Profile, member directory, and governing docs</small></div></div>' +
      '<div class="app-body">' +
      '<div class="hub-profile" id="hubProfileCard"><h3>Your profile</h3><p class="empty">Loading…</p></div>' +
      '<h3 style="font-family:var(--display);color:var(--green-800);margin:8px 0;">Governing documents</h3>' +
      '<div class="hub-docs">' +
      '<a href="assets/docs/code-of-conduct.html">Code of Conduct</a>' +
      '<a href="assets/docs/bylaws.html">Bylaws</a>' +
      '<a href="assets/docs/parade-rules.html">Parade Rules</a>' +
      "</div></div></section>";

    var events = document.getElementById("hubEvents");
    events.innerHTML =
      '<section class="app-card"><div class="app-head"><span class="ic">📅</span><div><h2>Events and RSVPs</h2><small>See the calendar and RSVP</small></div></div>' +
      '<div class="app-body"><p>RSVP to krewe events, track attendance, and keep your calendar current.</p>' +
      '<p><a class="btn btn-primary" href="event-signup.html">Open event signup</a></p>' +
      '<p style="font-size:16px;color:var(--muted);margin-top:12px;">Attendance feeds Parade Ready and the Craic Cup.</p></div></section>';

    var give = document.getElementById("hubGive");
    if (give) give.innerHTML =
      '<section class="app-card" id="hubHoursCard"><div class="app-head"><span class="ic">🤝</span><div><h2>Volunteer hours</h2><small>Total hours since July 1 (bring TrackItForward over)</small></div></div>' +
      '<div class="app-body" id="hubHoursBody"><p class="empty">Loading hours…</p></div></section>';

    var parade = document.getElementById("hubParade");
    var fun = document.getElementById("hubFun");
    var officer = document.getElementById("hubOfficer");
    var homeGrid = document.getElementById("hubHomeGrid");
    Array.prototype.slice.call(oldGrid.children).forEach(function (sec) {
      var hub = sec.getAttribute("data-hub");
      if (hub === "parade" || hub === "give") parade.appendChild(sec);
      else if (hub === "fun") fun.appendChild(sec);
      else if (hub === "officer") officer.appendChild(sec);
      else if (hub === "krewe") krewe.appendChild(sec);
      else if (hub === "hub" && homeGrid) homeGrid.appendChild(sec);
      else if (homeGrid) homeGrid.appendChild(sec);
      else fun.appendChild(sec);
    });
    // Member desk = volunteer hours at top, then Parade Ready / other parade sections
    if (give && give.firstChild) parade.insertBefore(give.firstChild, parade.firstChild);
    oldGrid.remove();
    relocateHours();
    ensureClaimCloversCard();
  }

  function standingChip() {
    var st = (state.membershipStatus || "").toString().toLowerCase();
    var unpaid = /unpaid|delinquent|lapsed|owing|past.?due/.test(st);
    var good = /good|active|current|paid/.test(st) && !unpaid;
    if (state.parade && state.parade.dues_paid === true) good = true;
    if (state.parade && state.parade.dues_paid === false) { good = false; unpaid = true; }
    var label = good ? "Good Standing" : (state.membershipStatus ? String(state.membershipStatus) : (unpaid ? "Dues attention" : "Standing TBD"));
    var cls = good ? "ok" : (unpaid ? "warn" : "");
    return '<span class="hub-chip ' + cls + '">🏷 ' + esc(label) + "</span>";
  }

  function paradeChip() {
    var me = state.parade;
    if (!me) return '<span class="hub-chip">🎗️ Parade Ready · —</span>';
    var ready = !!(me.dues_paid && me.waiver_signed && me.meeting_attended);
    return '<span class="hub-chip ' + (ready ? "ok" : "warn") + '">🎗️ ' + (ready ? "Parade Ready" : "Not parade ready") + "</span>";
  }

  function hoursChip() {
    var n = state.hoursApproved || 0;
    var cls = n >= 12 ? "ok" : "";
    return '<span class="hub-chip ' + cls + '">🤝 ' + n + "/12 volunteer hours</span>";
  }

  function craicHeroHtml() {
    var g = state.game || {};
    var found = !!g.found;
    var life = found ? Number(g.lifetime || 0) : 0;
    var season = found ? Number(g.season || 0) : 0;
    var rank = found ? (g.rank_name || "Newcomer") : "Newcomer";
    var icon = found ? (g.rank_icon || "🌱") : "🌱";
    var next = g.next_rank_name || null;
    var need = Number(g.clovers_to_next || 0);
    var total = life + need;
    var pct = total > 0 ? Math.min(100, Math.round(life / total * 100)) : 0;
    var kickoffNote = (life > 0)
      ? '<p class="tag" style="margin-top:-6px;opacity:.95;">You\'re off the line with a head start. Now see if you can climb. Kind rivalry only. ☘️</p>'
      : '<p class="tag" style="margin-top:-6px;opacity:.95;">Show up, pitch in, collect Clovers. Cheer your krewe, then try to catch them.</p>';
    return '<div class="hub-craic">' +
      '<div class="tag">☘ Welcome home, ' + esc(firstName() || 'friend') + '</div>' +
      '<h2>This is the Craic Cup</h2>' +
      kickoffNote +
      '<div class="hub-craic-grid">' +
      '<div class="rank-big">' + esc(icon) + '</div>' +
      '<div><div style="font-size:17px;opacity:.9;">Right now you\'re a</div>' +
      '<div style="font-family:var(--display);font-size:24px;margin:2px 0 6px;">' + esc(icon) + ' ' + esc(rank) + '</div>' +
      '<div class="clovers">' + life + ' 🍀</div>' +
      '<div class="meta">This season: <b>' + season + '</b>' +
      (next ? (' · <b>' + need + '</b> Clovers to ' + esc(next)) : ' · you\'re at the top of the ladder!') + '</div>' +
      (next ? ('<div class="prog"><i style="width:' + pct + '%"></i></div>') : '') +
      '</div></div>' +
      nextQuestHtml() +
      '<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;">' +
      '<button type="button" class="btn" id="hubClaimClovers" style="background:#f0d78c;color:#14532d;border:0;font-weight:700;">Claim Clovers</button>' +
      '<button type="button" class="btn" id="hubOpenCraic" style="background:transparent;border:1px solid rgba(240,215,140,.55);color:#f6efdc;">See the standings →</button></div>' +
      '</div>';
  }

  function questDateChip(iso) {
    if (!iso) return "Soon";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 10);
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  }

  function nextQuestHtml() {
    var list = (state.nextEvents && state.nextEvents.length) ? state.nextEvents : (state.nextEvent ? [state.nextEvent] : []);
    var head = '<div class="hub-quest"><div class="hub-quest-head"><b>Next Easy Win</b><span>Shamrock-hosted events · +5 Clovers for RSVP</span></div>';
    if (!list.length) {
      return head +
        '<div class="hub-quest-empty"><div><b>You\'re caught up</b><div style="font-size:16px;opacity:.95;margin-top:2px;">Clovers await at the next Shamrock event</div></div>' +
        '<a class="btn" href="event-signup.html">Browse calendar</a></div></div>';
    }
    var cards = list.slice(0, 4).map(function (ev) {
      var loc = ev.location ? ('<div class="meta">' + esc(ev.location) + '</div>') : '';
      var href = 'event-signup.html?event=' + encodeURIComponent(ev.id || '');
      return '<div class="hub-quest-card">' +
        '<span class="date">' + esc(questDateChip(ev.start_time)) + '</span>' +
        '<div class="title">' + esc(ev.name || 'Krewe event') + '</div>' +
        loc +
        '<div class="hint">+5 Clovers for RSVP</div>' +
        '<a class="btn" href="' + href + '">RSVP</a>' +
        '</div>';
    }).join('');
    return head + '<div class="hub-quest-grid">' + cards + '</div></div>';
  }

  function softMemberDeskHtml() {
    var me = state.parade;
    var needsProfile = !!(window.kosNeedsProfile);
    var bits = [];
    if (me) {
      if (!me.waiver_signed) bits.push("liability waiver");
      if (!me.dues_paid) bits.push("dues");
      if (!me.meeting_attended) bits.push("mandatory meeting");
    }
    if ((state.hoursApproved || 0) < 1) bits.push("hours since July 1");
    if (needsProfile) bits.push("My Krewe profile");
    var ready = !!(me && me.dues_paid && me.waiver_signed && me.meeting_attended);
    var line = "Parade Ready, hours, and season tools live here.";
    if (ready && !needsProfile && (state.hoursApproved || 0) >= 1) {
      line = "You are set for the season. Open Member desk anytime.";
    } else if (bits.length) {
      line = "Still open: " + bits.join(", ") + ".";
    }
    var profileBtn = needsProfile
      ? '<button type="button" class="btn" id="hubOpenProfile" style="margin-top:8px;width:100%;">Complete My Krewe profile</button>'
      : '';
    return '<div class="hub-soft-desk">' +
      '<h3>Member desk</h3>' +
      '<div class="hub-chips">' + standingChip() + paradeChip() + hoursChip() + '</div>' +
      '<p style="margin:0 0 12px;font-size:16px;color:var(--muted);line-height:1.4;">' + esc(line) + '</p>' +
      '<ul class="hub-status-list" aria-label="Season checklist">' +
      '<li><span class="mark" aria-hidden="true">1</span><span>Parade Ready: waiver and Photo Release</span></li>' +
      '<li><span class="mark" aria-hidden="true">2</span><span>My Krewe profile</span></li>' +
      '<li><span class="mark" aria-hidden="true">3</span><span>Total hours since July 1</span></li>' +
      '</ul>' +
      '<button type="button" class="btn btn-primary" data-hub-action="parade" style="width:100%;">Open Member desk</button>' +
      profileBtn +
      '</div>';
  }

  function renderHome() {
    var home = document.getElementById("hubHome");
    if (!home) return;
    var top = document.getElementById("hubHomeTop");
    if (!top) {
      top = document.createElement("div");
      top.id = "hubHomeTop";
      top.className = "hub-home-stack";
      home.insertBefore(top, home.firstChild);
    } else {
      top.className = "hub-home-stack";
    }
    if (!document.getElementById("hubHomeGrid")) {
      var grid = document.createElement("div");
      grid.className = "member-grid";
      grid.id = "hubHomeGrid";
      home.appendChild(grid);
    }
    var officerPulse = "";
    try {
      if ((state.officer || state.canManageEvents) && sessionStorage.getItem("kosOfficerDeskSeen") !== "1") {
        officerPulse = " hub-officer-pulse";
      }
    } catch (pe) {}
    var officerCard = (state.officer || state.canManageEvents)
      ? '<div class="hub-officer-card' + officerPulse + '" data-hub-action="officer" role="button" tabindex="0">' +
        '<div class="hub-officer-card-top">' +
        '<div class="ic" aria-hidden="true">🎖️</div>' +
        '<div class="copy"><b>Officer desk</b><div class="sub">Events, approvals, money, and reports in one calm place.</div></div>' +
        '<div class="go">Open →</div></div>' +
        '<div class="hub-officer-inside-wrap">' +
        '<div style="font-family:var(--display);font-size:15px;margin:0 0 6px;color:#7a5b00;">What\'s inside</div>' +
        '<ul class="hub-officer-inside" aria-label="Officer desk tools">' +
        '<li>Event Studio and calendar</li>' +
        '<li>Approvals (photos, videos, clovers)</li>' +
        '<li>Shop, member records, and money</li>' +
        '<li>Reports, QR tools, and messages</li>' +
        '</ul></div></div>'
      : "";
    var findCards =
      '<div class="hub-find">' +
      '<h3>Quick links</h3>' +
      '<div class="hub-find-grid">' +
      '<button type="button" class="hub-action" data-hub-goto="directory"><b>Member Directory</b><span>Faces and profiles of your krewe under My Krewe.</span></button>' +
      ((state.officer || state.canManageEvents)
        ? '<button type="button" class="hub-action" data-hub-goto="event-studio"><b>Add or edit events &amp; calendar</b><span>Open Event Studio to change dates (Basket Social and more) without a developer.</span></button>'
        : '') +
      '</div></div>';
    // Only refresh the welcome strip — never wipe the beautiful card grid below.
    top.innerHTML = craicHeroHtml() + softMemberDeskHtml() + officerCard + findCards;

    renderProfileCard();

    top.querySelectorAll("[data-hub-action]").forEach(function (btn) {
      btn.addEventListener("click", function () { showTab(btn.getAttribute("data-hub-action")); });
      btn.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          showTab(btn.getAttribute("data-hub-action"));
        }
      });
    });
    top.querySelectorAll("[data-hub-goto]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var go = btn.getAttribute("data-hub-goto");
        if (go === "directory") openDirectoryFromHome();
        else if (go === "event-studio") openEventStudioFromHome();
      });
    });
    var op = document.getElementById("hubOpenProfile");
    if (op) op.addEventListener("click", function () {
      if (window.kosOpenProfileStage) window.kosOpenProfileStage();
    });
    var openC = document.getElementById("hubOpenCraic");
    if (openC) openC.addEventListener("click", function () {
      if (typeof window.openGame === "function") window.openGame();
    });
    var claimBtn = document.getElementById("hubClaimClovers");
    if (claimBtn) claimBtn.addEventListener("click", function () {
      showTab("fun");
      setTimeout(function () {
        var el = document.getElementById("hubClaimCard");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    });
  }

  window.__hubShowTab = showTab;
  window.showHubTab = showTab;
  function showTab(name, opts) {
    var tab = name || TAB_HOME;
    opts = opts || {};
    if (tab === "officer" && !state.officer && !state.canManageEvents) tab = TAB_HOME;
    document.querySelectorAll("[data-hub-panel]").forEach(function (el) {
      el.classList.toggle("hub-on", el.getAttribute("data-hub-panel") === tab);
    });
    document.querySelectorAll("[data-hub-tab]").forEach(function (btn) {
      var id = btn.getAttribute("data-hub-tab");
      btn.classList.toggle("on", id === tab);
      if (id === "officer") btn.style.display = (state.officer || state.canManageEvents) ? "" : "none";
    });
    syncOfficerChip();
    try { sessionStorage.setItem("kosHubTab", tab); } catch (e) {}
    if (tab === "officer") {
      try { sessionStorage.setItem("kosOfficerDeskSeen", "1"); } catch (e2) {}
      var pulseCards = document.querySelectorAll(".hub-officer-card.hub-officer-pulse");
      for (var pi = 0; pi < pulseCards.length; pi++) pulseCards[pi].classList.remove("hub-officer-pulse");
      setTimeout(wireOfficerDeskPicker, 60);
      setTimeout(wireOfficerDeskPicker, 500);
    }
    if (tab === "hub" && !opts.skipHomeRender) renderHome();
    if (!opts.skipScroll) {
      // Defer scroll until after panel display settles (avoids snap on login).
      setTimeout(function () {
        try { window.scrollTo({ top: 0, behavior: "auto" }); } catch (e3) {}
      }, 0);
    }
  }

  window.kosShowHub = showTab;

  function syncOfficerChip() {
    var chip = document.getElementById("hubOfficerChip");
    if (!chip) {
      var bar = document.getElementById("memberBar");
      if (!bar) return;
      chip = document.createElement("button");
      chip.type = "button";
      chip.id = "hubOfficerChip";
      chip.className = "hub-officer-chip";
      chip.innerHTML = '<span class="ic" aria-hidden="true">🎖️</span><span>Officer desk</span>';
      chip.addEventListener("click", function () { showTab("officer"); });
      bar.insertBefore(chip, bar.firstChild);
    }
    var show = !!(state.officer || state.canManageEvents);
    chip.classList.toggle("show", show);
    chip.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function syncSignedInPill() {
    var who = document.getElementById("memberWho");
    if (!who) return;
    var p = window.kosProfile || {};
    var nm = (p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "").toString().trim();
    who.classList.add("hub-signed-pill");
    if (!who.querySelector(".dot")) {
      who.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="hub-signed-label"></span>';
    }
    var label = who.querySelector(".hub-signed-label");
    if (label) label.textContent = nm ? ("Signed in as " + nm) : "Signed in";
    who.classList.add("is-on");
    who.setAttribute("aria-live", "polite");
  }

  async function loadHubData() {
    var client = window.__kosSb || null;
    if (!client) {
      for (var i = 0; i < 20 && !client; i++) {
        client = window.__kosSb || null;
        if (!client) await new Promise(function (r) { setTimeout(r, 100); });
      }
    }
    if (!client) { renderHome(); return; }

    try {
      var off = await client.rpc("is_krewe_officer");
      state.officer = !!off.data;
    } catch (e) { state.officer = false; }
    state.shopOnly = false;
    state.socialOnly = false;
    // Committee desks without full board officer access
    if (!state.officer) {
      try {
        var shop = await client.rpc("can_manage_shop");
        if (shop.data) {
          state.officer = true;
          state.shopOnly = true;
        }
      } catch (e2) {}
      try {
        var social = await client.rpc("can_manage_social_charity");
        if (social.data) {
          state.officer = true;
          state.socialOnly = true;
          // Social/Charity also drives Event Studio via can_manage_events
        }
      } catch (e3) {}
    }
    try {
      var dash = document.getElementById("dashCard");
      if (dash) {
        // Keep Reports off Member Hub Home for everyone; officers use Officer desk.
        dash.style.display = "none";
        dash.setAttribute("hidden", "");
        dash.setAttribute("aria-hidden", "true");
      }
    } catch (e) {}
    try {
      var pay = await client.rpc("can_view_payments");
      state.canViewPayments = !!pay.data;
    } catch (e) { state.canViewPayments = false; }
    try { var eventManager = await client.rpc("can_manage_events"); state.canManageEvents = !!eventManager.data; } catch (e) { state.canManageEvents = false; }
    if (state.officer) loadApprovals(client);
    if (state.canViewPayments) loadPaymentsCard(client);
    if (state.canManageEvents) loadEventStudio(client);
    loadClaimClovers(client);

    try {
      var email = (window.kosProfile || {}).email || null;
      if (email) {
        var gc = await client.rpc("get_member_game_card", { p_email: email });
        state.game = gc.data || null;
      }
    } catch (e) { state.game = null; }
    try {
      var evs = await client.from("events")
        .select("id,name,start_time,location,status,source")
        .eq("source", "krewe")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(8);
      var list = (evs.data || []).filter(function (e) {
        var st = String(e.status || "published").toLowerCase();
        var src = String(e.source || "").toLowerCase();
        return src === "krewe" && (st === "published" || st === "live");
      });
      var meId = (window.kosProfile || {}).member_id || null;
      if (meId && list.length) {
        try {
          var signed = await client.from("event_signups")
            .select("event_id,status")
            .eq("member_id", meId)
            .in("status", ["registered", "confirmed", "attended", "waitlisted"]);
          var taken = {};
          (signed.data || []).forEach(function (r) { if (r.event_id) taken[r.event_id] = true; });
          list = list.filter(function (e) { return !taken[e.id]; });
        } catch (signupErr) { /* keep unfiltered krewe list */ }
      }
      state.nextEvents = list.slice(0, 4);
      state.nextEvent = state.nextEvents[0] || null;
    } catch (e) { state.nextEvents = []; state.nextEvent = null; }
    try {
      var meId = (window.kosProfile || {}).member_id || null;
      var pr = await client.from("v_parade_ready").select("*");
      var rows = pr.data || [];
      state.parade = (meId && rows.find(function (r) { return r.member_id === meId; })) || (rows.length === 1 ? rows[0] : null);
      if (state.parade) {
        state.membershipStatus = state.parade.membership_status || state.membershipStatus;
        if (state.parade.volunteer_hours_approved != null) {
          state.hoursApproved = Number(state.parade.volunteer_hours_approved) || 0;
        }
      }
    } catch (e) {}

    if (!state.membershipStatus) {
      try { state.membershipStatus = (window.kosProfile || {}).membership_status || null; } catch (e) {}
    }

    if (!state.hoursApproved) {
      try {
        var mid = (window.kosProfile || {}).member_id || null;
        if (mid) {
          var vh = await client.from("volunteer_hours").select("hours,status").eq("member_id", mid);
          var approved = (vh.data || []).filter(function (r) {
            return String(r.status || "").toLowerCase() === "approved";
          });
          state.hoursApproved = approved.reduce(function (n, r) { return n + (Number(r.hours) || 0); }, 0);
        }
      } catch (e) {}
    }

    var saved = TAB_HOME;
    var wantHours = hoursIntent();
    try {
      var hash = (location.hash || "").replace(/^#/, "").toLowerCase();
      if (wantHours) {
        hoursDeepLink = true;
        saved = "parade";
      } else if (hash === "parade" || hash === "desk") saved = "parade";
      else if (hash === "officer") saved = "officer";
      else if (hash === "krewe" || hash === "directory") saved = "krewe";
      else if (hash === "events") saved = "events";
      else if (hash === "fun") saved = "fun";
      else {
        // Always land on Home after login/refresh unless the URL asks for a tab.
        saved = TAB_HOME;
      }
    } catch (e) {
      if (wantHours) saved = "parade";
    }
    if (saved === "officer" && !state.officer && !state.canManageEvents) saved = TAB_HOME;

    syncSignedInPill();
    syncOfficerChip();

    // One settle: pick the tab once, skip scroll on first paint, then optionally
    // deep-link hours after layout is stable (prevents Home <-> desk snap).
    showTab(saved, { skipScroll: true });
    if (saved !== "hub") renderHome();
    if (wantHours) {
      setTimeout(function () { openVolunteerHoursForm(false); }, 280);
    }
  }

  function openVolunteerHoursForm(clearIntent) {
    function hubVisible() {
      var content = document.getElementById("memberContent");
      return !!(content && content.style.display !== "none");
    }
    function go() {
      if (!hubVisible()) return false;
      hoursDeepLink = true;
      showTab("parade", { skipScroll: true });
      var form = document.getElementById("vhForm");
      if (!form) return false;
      var card = document.getElementById("hubHoursCard") || form || document.getElementById("prHours");
      // Defer scroll until after the parade panel is painted (avoids login snap).
      setTimeout(function () {
        if (card && card.scrollIntoView) card.scrollIntoView({ behavior: "auto", block: "start" });
      }, 120);
      var hours = document.getElementById("vhHours") || document.getElementById("vhActivity");
      if (hours) {
        try { hours.focus({ preventScroll: true }); } catch (fe) { try { hours.focus(); } catch (fe2) {} }
      }
      try { form.classList.add("kos-hours-flash"); } catch (ce) {}
      setTimeout(function () { try { form.classList.remove("kos-hours-flash"); } catch (ce2) {} }, 1800);
      if (clearIntent) clearHoursIntent();
      return true;
    }
    if (go()) return;
    var tries = 0;
    var t = setInterval(function () {
      tries += 1;
      if (go() || tries > 25) clearInterval(t);
    }, 200);
  }
  window.kosOpenVolunteerHours = function () { openVolunteerHoursForm(false); };

  // ---- My profile: photo, birthday, anniversary, and friendly questions ----
  // View mode shows what the directory sees; Edit mode saves through the
  // update_my_member_profile function, which can never change role or status.
  var profileEditing = false;
  var MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  function fmtMonthDay(d) {
    var parts = String(d || "").split("-");
    if (parts.length < 3) return String(d || "");
    var m = MONTH_NAMES[Number(parts[1]) - 1];
    return m ? m + " " + Number(parts[2]) : String(d);
  }

  function profileAvatarHtml(p) {
    if (p.photo_url) return '<img class="hub-avatar" src="' + esc(p.photo_url) + '" alt="Profile photo" id="hubProfAvatar" />';
    var initials = (((p.first_name || " ")[0] || "") + ((p.last_name || " ")[0] || "")).toUpperCase();
    return '<div class="hub-avatar hub-avatar-blank" id="hubProfAvatar">' + esc(initials || "☘") + "</div>";
  }

  function renderProfileCard() {
    var pc = document.getElementById("hubProfileCard");
    if (!pc) return;
    var p = window.kosProfile || {};
    if (profileEditing) { renderProfileEdit(pc, p); return; }
    var nm = (p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Member").toString();
    var facts = [];
    if (p.officer_title) facts.push("🎖 " + esc(p.officer_title));
    else if (p.member_role) facts.push("Role: " + esc(p.member_role));
    if (p.membership_status || state.membershipStatus) facts.push("Status: " + esc(p.membership_status || state.membershipStatus));
    if (p.hometown) facts.push("🏠 " + esc(p.hometown));
    if (p.street_address || p.city) {
      var addr = [p.street_address, [p.city, p.state].filter(Boolean).join(", "), p.zip].filter(Boolean).join(" · ");
      if (addr) facts.push("📫 " + esc(addr));
    }
    if (p.parade_since) facts.push("🥁 Marching since " + esc(p.parade_since));
    if (p.birthday) facts.push("🎂 " + esc(fmtMonthDay(p.birthday)));
    if (p.anniversary) facts.push("💍 " + esc(fmtMonthDay(p.anniversary)));
    var longs = "";
    if (p.bio) longs += '<p class="hub-prof-line"><b>About me:</b> ' + esc(p.bio) + "</p>";
    if (p.hobbies) longs += '<p class="hub-prof-line"><b>Hobbies:</b> ' + esc(p.hobbies) + "</p>";
    if (p.interests) longs += '<p class="hub-prof-line"><b>Interests:</b> ' + esc(p.interests) + "</p>";
    if (p.favorite_memory) longs += '<p class="hub-prof-line"><b>Favorite krewe memory:</b> ' + esc(p.favorite_memory) + "</p>";
    if (p.fun_fact) longs += '<p class="hub-prof-line"><b>Fun fact:</b> ' + esc(p.fun_fact) + "</p>";
    pc.innerHTML =
      "<h3>Your profile</h3>" +
      '<div class="hub-prof-head">' + profileAvatarHtml(p) +
      "<div><b>" + esc(nm) + "</b>" +
      (p.email ? '<div style="color:var(--muted);font-size:16px;">' + esc(p.email) + "</div>" : "") +
      (facts.length ? '<div style="color:var(--muted);font-size:16px;">' + facts.join(" · ") + "</div>" : "") +
      "</div></div>" + longs +
'<div class="hub-fb-members">' +
      '<div style="font-size:15px;color:var(--muted);margin-bottom:4px;">Members only</div>' +
      '<a href="https://www.facebook.com/groups/1790675004521855" target="_blank" rel="noopener noreferrer">📘 Join the Krewe members Facebook group →</a>' +
      '</div>' +
      '<button class="btn btn-primary" id="hubProfEditBtn" type="button" style="margin-top:10px;">✏️ Edit my profile</button>' +
      (p.profile_visible === false ? '<p style="color:var(--muted);font-size:15px;">Your profile is hidden from the member directory.</p>' : "") +
      '<p style="color:var(--muted);font-size:14px;margin:8px 0 0;">Fellow members see your birthday and anniversary as month and day only — never the year.</p>';
    var btn = document.getElementById("hubProfEditBtn");
    if (btn) btn.addEventListener("click", function () { profileEditing = true; renderProfileCard(); });
  }

  function renderProfileEdit(pc, p) {
    function attr(v) { return esc(v == null ? "" : String(v)); }
    pc.innerHTML =
      "<h3>Edit my profile</h3>" +
      '<div class="hub-prof-form">' +
      '<div class="hub-prof-head">' + profileAvatarHtml(p) +
      '<div><label for="hubPfPhoto">Profile picture (JPG or PNG)</label>' +
      '<input type="file" id="hubPfPhoto" accept="image/*" /></div></div>' +
      '<div class="hub-prof-grid">' +
      '<div><label for="hubPfFirst">First name</label><input id="hubPfFirst" value="' + attr(p.first_name) + '" required /></div>' +
      '<div><label for="hubPfLast">Last name</label><input id="hubPfLast" value="' + attr(p.last_name) + '" required /></div>' +
      '<div><label for="hubPfPhone">Phone</label><input id="hubPfPhone" type="tel" value="' + attr(p.phone) + '" /></div>' +
      '<div><label for="hubPfHometown">Hometown</label><input id="hubPfHometown" value="' + attr(p.hometown) + '" /></div>' +
      '<div style="grid-column:1/-1;"><label for="hubPfStreet">Mailing address</label><input id="hubPfStreet" value="' + attr(p.street_address) + '" autocomplete="street-address" /></div>' +
      '<div><label for="hubPfCity">City</label><input id="hubPfCity" value="' + attr(p.city) + '" autocomplete="address-level2" /></div>' +
      '<div><label for="hubPfState">State</label><input id="hubPfState" value="' + attr(p.state) + '" maxlength="20" autocomplete="address-level1" /></div>' +
      '<div><label for="hubPfZip">ZIP</label><input id="hubPfZip" value="' + attr(p.zip) + '" maxlength="16" autocomplete="postal-code" /></div>' +
      '<div><label for="hubPfBirthday">Birthday (members see month + day only)</label><input id="hubPfBirthday" type="date" value="' + attr(p.birthday) + '" /></div>' +
      '<div><label for="hubPfAnniversary">Anniversary (month + day shown)</label><input id="hubPfAnniversary" type="date" value="' + attr(p.anniversary) + '" /></div>' +
      '<div><label for="hubPfSince">Marching with the krewe since (year)</label><input id="hubPfSince" type="number" min="1998" max="2100" value="' + attr(p.parade_since) + '" /></div>' +
      "</div>" +
      '<label for="hubPfBio">About me</label><textarea id="hubPfBio">' + esc(p.bio || "") + "</textarea>" +
      '<label for="hubPfHobbies">Hobbies (what do you love doing?)</label><input id="hubPfHobbies" value="' + attr(p.hobbies) + '" placeholder="e.g. Gardening, bagpipes, beach days" />' +
      '<label for="hubPfInterests">Interests (what would you chat about all night?)</label><input id="hubPfInterests" value="' + attr(p.interests) + '" placeholder="e.g. Irish history, cooking, live music" />' +
      '<label for="hubPfMemory">Favorite krewe or parade memory</label><textarea id="hubPfMemory">' + esc(p.favorite_memory || "") + "</textarea>" +
      '<label for="hubPfFact">A fun fact about you</label><input id="hubPfFact" value="' + attr(p.fun_fact) + '" placeholder="e.g. I once caught 47 strands of beads in one parade" />' +
      '<label style="display:flex;gap:8px;align-items:center;margin-top:12px;cursor:pointer;">' +
      '<input type="checkbox" id="hubPfVisible" style="width:auto;"' + (p.profile_visible === false ? "" : " checked") + " /> Show my profile in the member directory</label>" +
      '<div style="display:flex;gap:10px;margin-top:14px;">' +
      '<button class="btn btn-primary" id="hubPfSave" type="button">☘ Save profile</button>' +
      '<button class="btn" id="hubPfCancel" type="button">Cancel</button></div>' +
      '<div class="err" id="hubPfMsg" style="margin-top:8px;"></div>' +
      "</div>";
    document.getElementById("hubPfCancel").addEventListener("click", function () {
      profileEditing = false; renderProfileCard();
    });
    document.getElementById("hubPfPhoto").addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var av = document.getElementById("hubProfAvatar");
      if (av) {
        var img = document.createElement("img");
        img.className = "hub-avatar";
        img.id = "hubProfAvatar";
        img.alt = "Profile photo preview";
        img.src = URL.createObjectURL(f);
        av.replaceWith(img);
      }
    });
    document.getElementById("hubPfSave").addEventListener("click", function () { saveMyProfile(); });
  }

  function uploadAvatar(client, file) {
    return new Promise(function (resolve, reject) {
      var objUrl = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var max = 512;
        var scale = Math.min(1, max / Math.max(img.width, img.height));
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          URL.revokeObjectURL(objUrl);
          if (!blob) { reject(new Error("Could not read that image.")); return; }
          (async function () {
            var uid = (window.kosProfile || {}).user_id;
            if (!uid) {
              var u = await client.auth.getUser();
              uid = u.data && u.data.user && u.data.user.id;
            }
            if (!uid) throw new Error("Please sign in again.");
            var path = uid + "/avatar.jpg";
            var up = await client.storage.from("avatars").upload(path, blob, {
              upsert: true, contentType: "image/jpeg", cacheControl: "3600"
            });
            if (up.error) throw up.error;
            var pub = client.storage.from("avatars").getPublicUrl(path);
            return pub.data.publicUrl + "?v=" + Date.now();
          })().then(resolve, reject);
        }, "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(objUrl); reject(new Error("That file does not look like an image.")); };
      img.src = objUrl;
    });
  }

  async function saveMyProfile() {
    var client = window.__kosSb;
    var msg = document.getElementById("hubPfMsg");
    function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
    if (!client) { if (msg) msg.textContent = "Still connecting — try again in a moment."; return; }
    if (msg) { msg.style.color = ""; msg.textContent = "Saving…"; }
    try {
      var photoUrl = null;
      var fileInput = document.getElementById("hubPfPhoto");
      var f = fileInput && fileInput.files && fileInput.files[0];
      if (f) {
        if (msg) msg.textContent = "Uploading photo…";
        photoUrl = await uploadAvatar(client, f);
        if (msg) msg.textContent = "Saving…";
      }
      var since = parseInt(val("hubPfSince"), 10);
      var res = await client.rpc("update_my_member_profile", {
        p_first: val("hubPfFirst"),
        p_last: val("hubPfLast"),
        p_phone: val("hubPfPhone") || null,
        p_bio: val("hubPfBio") || null,
        p_hometown: val("hubPfHometown") || null,
        p_street_address: val("hubPfStreet") || null,
        p_city: val("hubPfCity") || null,
        p_state: val("hubPfState") || null,
        p_zip: val("hubPfZip") || null,
        p_parade_since: isNaN(since) ? null : since,
        p_interests: val("hubPfInterests") || null,
        p_photo_url: photoUrl,
        p_birthday: val("hubPfBirthday") || null,
        p_anniversary: val("hubPfAnniversary") || null,
        p_hobbies: val("hubPfHobbies") || null,
        p_favorite_memory: val("hubPfMemory") || null,
        p_fun_fact: val("hubPfFact") || null,
        p_profile_visible: !!(document.getElementById("hubPfVisible") || {}).checked
      });
      if (res.error) throw res.error;
      if (res.data) window.kosProfile = res.data;
      profileEditing = false;
      renderProfileCard();
      renderHome();
    } catch (e) {
      if (msg) msg.textContent = "Couldn't save: " + ((e && e.message) || e);
    }
  }


  // ---- Claim Clovers: member submits activities for officer approval ----
  var CLAIM_ACTIVITIES = [
    { code: "attend_event", label: "Attend an event (verified)", clovers: 20 },
    { code: "attend_meeting", label: "Attend a members' meeting", clovers: 15 },
    { code: "volunteer_event", label: "Volunteer at an event", clovers: 30 },
    { code: "volunteer_priority", label: "Volunteer for a priority shift (setup / teardown / parade day)", clovers: 60 },
    { code: "organize_event", label: "Organize an event", clovers: 50 },
    { code: "bring_guest", label: "Bring a guest (up to 3)", clovers: 5, perGuest: true },
    { code: "dues_on_time", label: "Pay your dues on time", clovers: 25 },
    { code: "dues_early", label: "Pay your dues early (by St. Paddy's)", clovers: 15 },
    { code: "refer_member", label: "Refer a member who joins", clovers: 40 }
  ];

  function ensureClaimCloversCard() {
    var fun = document.getElementById("hubFun");
    if (!fun) return;
    if (document.getElementById("hubClaimCard")) return;
    var card = document.createElement("section");
    card.className = "app-card";
    card.id = "hubClaimCard";
    card.innerHTML =
      '<div class="app-head"><span class="ic">🍀</span><div><h2>Claim Clovers</h2><small>Ask officers to credit an activity that is not auto-awarded</small></div></div>' +
      '<div class="app-body hub-claim" id="hubClaimBody"><p class="empty">Loading…</p></div>';
    fun.insertBefore(card, fun.firstChild);
  }

  function claimOptionsHtml() {
    return CLAIM_ACTIVITIES.map(function (a) {
      var pts = a.perGuest ? (a.clovers + " each") : ("+" + a.clovers);
      return '<option value="' + a.code + '">' + esc(a.label) + " · " + pts + " 🍀</option>";
    }).join("");
  }

  function renderClaimForm(client, rows) {
    ensureClaimCloversCard();
    var body = document.getElementById("hubClaimBody");
    if (!body) return;
    var pending = (rows || []).filter(function (r) { return r.status === "pending"; });
    var recent = (rows || []).slice(0, 8);
    var listHtml = "";
    if (recent.length) {
      listHtml = '<h3 style="font-family:var(--display);color:var(--green-800);margin:16px 0 6px;font-size:17px;">Your recent claims</h3><ul class="hub-claim-list">';
      recent.forEach(function (r) {
        var extra = [];
        if (r.guest_count) extra.push(r.guest_count + (r.guest_count === 1 ? " guest" : " guests"));
        if (r.event_name) extra.push(r.event_name);
        listHtml += '<li><span class="st ' + esc(r.status) + '">' + esc(r.status) + '</span> · <b>' +
          esc(r.activity_label || r.activity_code) + '</b> · +' + Number(r.clovers || 0) + ' 🍀' +
          (extra.length ? '<div class="muted" style="color:var(--muted);font-size:15px;">' + esc(extra.join(" · ")) + "</div>" : "") +
          "</li>";
      });
      listHtml += "</ul>";
    } else {
      listHtml = '<p class="empty" style="margin-top:14px;">No claims yet. RSVPs still earn +5 automatically.</p>';
    }
    body.innerHTML =
      '<p style="margin:0 0 8px;font-size:16px;color:var(--muted);">Pick an activity. Officers review and credit Clovers to your Craic Cup. RSVP to an event is already automatic, so it is not listed here.</p>' +
      '<form id="hubClaimForm">' +
      '<label for="hubClaimActivity">Activity</label>' +
      '<select id="hubClaimActivity" required><option value="">Choose one…</option>' + claimOptionsHtml() + "</select>" +
      '<div class="hub-claim-row" id="hubClaimGuestsRow"><label for="hubClaimGuests">How many guests (1-3)</label>' +
      '<select id="hubClaimGuests"><option value="1">1 · +5</option><option value="2">2 · +10</option><option value="3">3 · +15</option></select></div>' +
      '<label for="hubClaimEvent">Event or activity name (optional)</label>' +
      '<input id="hubClaimEvent" type="text" maxlength="120" placeholder="e.g. Members meeting, parade setup">' +
      '<label for="hubClaimNotes">Notes for officers (optional)</label>' +
      '<textarea id="hubClaimNotes" maxlength="400" placeholder="Anything that helps them verify"></textarea>' +
      '<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;">' +
      '<button type="submit" class="btn btn-primary" id="hubClaimSubmit">Submit claim</button>' +
      (pending.length ? ('<span style="font-size:15px;color:var(--muted);">' + pending.length + " pending</span>") : "") +
      "</div>" +
      '<p class="hub-claim-msg" id="hubClaimMsg" hidden></p>' +
      "</form>" + listHtml;

    var act = document.getElementById("hubClaimActivity");
    var guestRow = document.getElementById("hubClaimGuestsRow");
    function syncGuests() {
      if (guestRow) guestRow.classList.toggle("on", act && act.value === "bring_guest");
    }
    if (act) act.addEventListener("change", syncGuests);
    syncGuests();

    var form = document.getElementById("hubClaimForm");
    if (form) form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var code = (act && act.value) || "";
      if (!code) return;
      var btn = document.getElementById("hubClaimSubmit");
      var msg = document.getElementById("hubClaimMsg");
      if (btn) btn.disabled = true;
      var guests = null;
      if (code === "bring_guest") {
        guests = Number((document.getElementById("hubClaimGuests") || {}).value || 1);
      }
      var eventName = ((document.getElementById("hubClaimEvent") || {}).value || "").trim() || null;
      var notes = ((document.getElementById("hubClaimNotes") || {}).value || "").trim() || null;
      try {
        var res = await client.rpc("submit_clover_request", {
          p_activity_code: code,
          p_guest_count: guests,
          p_event_name: eventName,
          p_notes: notes
        });
        if (res.error) throw res.error;
        var payload = res.data || {};
        if (!payload.ok) throw new Error(payload.message || "Could not submit");
        if (msg) {
          msg.hidden = false;
          msg.textContent = "Sent to officers for approval.";
        }
        loadClaimClovers(client);
      } catch (e) {
        if (msg) {
          msg.hidden = false;
          msg.textContent = "Could not send: " + ((e && e.message) || e);
        }
        if (btn) btn.disabled = false;
      }
    });
  }

  async function loadClaimClovers(client) {
    ensureClaimCloversCard();
    var rows = [];
    try {
      var res = await client.rpc("list_my_clover_requests");
      if (res.data && Array.isArray(res.data)) rows = res.data;
    } catch (e) {}
    renderClaimForm(client, rows);
  }

  // ---- Officer Approvals queue: role requests + duplicate-record merges + media ----
  function mediaLogHtml(rows) {
    var html = '<h3 class="hub-appr-h">Recent media decisions</h3>';
    html += '<div style="font-size:15px;color:var(--muted);margin:0 0 8px;">Who approved or denied photos and videos (newest first).</div>';
    (rows || []).forEach(function (r) {
      var when = r.created_at ? String(r.created_at).slice(0, 16).replace("T", " ") : "";
      var act = String(r.action || "").toLowerCase() === "deny" ? "Denied" : "Approved";
      var kind = r.content_type === "video" ? "video" : "photo";
      html += '<div class="hub-appr" style="align-items:flex-start;">' +
        '<div><b>' + esc(act) + '</b> · ' + esc(kind) + ' <b>' + esc(r.content_title || "") + '</b>' +
        '<div class="muted">by ' + esc(r.officer_name || r.officer_email || "Officer") +
        (when ? (" · " + esc(when) + " UTC") : "") +
        (r.submitter_name ? (" · from " + esc(r.submitter_name)) : "") + '</div>' +
        (r.note ? '<div class="muted">Note: ' + esc(r.note) + '</div>' : "") +
        '</div></div>';
    });
    return html;
  }


  // Officers decide on the website; every decision is recorded with who/when.
  function setOfficerBadge(n) {
    var btn = document.querySelector('[data-hub-tab="officer"]');
    if (!btn) return;
    var b = btn.querySelector(".hub-badge");
    if (!n) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement("span"); b.className = "hub-badge"; btn.appendChild(b); }
    b.textContent = String(n);
  }

  async function decideApproval(client, fn, args, btn) {
    if (btn) btn.disabled = true;
    try {
      var res = await client.rpc(fn, args);
      if (res.error) throw res.error;
    } catch (e) {
      alert("Couldn't complete that: " + ((e && e.message) || e));
    }
    loadApprovals(client);
  }

  async function loadApprovals(client) {
    if (!state.officer) return;
    var panel = document.getElementById("hubOfficer");
    if (!panel) return;
    var card = document.getElementById("hubApprovals");
    if (!card) {
      card = document.createElement("section");
      card.className = "app-card";
      card.id = "hubApprovals";
      panel.insertBefore(card, panel.firstChild);
    }
    card.innerHTML =
      '<div class="app-head"><span class="ic">✅</span><div><h2>Approvals</h2><small>Role requests, clover claims, media (photos/videos), and record merges waiting on an officer</small></div></div>' +
      '<div class="app-body" id="hubApprovalsBody"><p class="empty">Loading approvals…</p></div>';
    var body = card.querySelector("#hubApprovalsBody");
    var data = null;
    var clovers = [];
    var media = [];
    var mediaLog = [];
    try {
      var res = await client.rpc("list_officer_approvals");
      data = res.data || null;
    } catch (e) {}
    try {
      var cr = await client.rpc("list_pending_clover_requests");
      if (cr.data && Array.isArray(cr.data)) clovers = cr.data;
    } catch (e2) {}
    try {
      var mr = await client.rpc("list_pending_media_approvals");
      if (mr.data && Array.isArray(mr.data)) media = mr.data;
    } catch (e3) {}
    try {
      var lr = await client.rpc("list_content_approval_log", { p_limit: 25 });
      if (lr.data && Array.isArray(lr.data)) mediaLog = lr.data;
    } catch (e4) {}
    if (!data) { body.innerHTML = '<p class="empty">Couldn&rsquo;t load the approvals queue. Try again in a moment.</p>'; return; }
    var reqs = data.role_requests || [];
    var dups = data.duplicates || [];
    setOfficerBadge(reqs.length + dups.length + clovers.length + media.length);
    if (!reqs.length && !dups.length && !clovers.length && !media.length) {
      var emptyHtml = '<p class="empty">Nothing waiting · all caught up. ☘</p>';
      if (mediaLog.length) emptyHtml += mediaLogHtml(mediaLog);
      body.innerHTML = emptyHtml;
      wireOfficerDeskPicker();
      return;
    }
    var html = "";
    if (media.length) {
      html += '<h3 class="hub-appr-h">Media approvals</h3>';
      media.forEach(function (q) {
        var when = q.created_at ? String(q.created_at).slice(0, 16).replace("T", " ") : "";
        var kind = (q.type === "video") ? "Video" : "Photo";
        var preview = "";
        if (q.url && q.type === "photo") {
          preview = '<div style="margin-top:6px;"><a href="' + esc(q.url) + '" target="_blank" rel="noopener"><img src="' + esc(q.url) + '" alt="" style="max-width:140px;max-height:100px;border-radius:8px;object-fit:cover;border:1px solid rgba(168,128,28,.35);" /></a></div>';
        } else if (q.url) {
          preview = '<div class="muted" style="margin-top:4px;"><a href="' + esc(q.url) + '" target="_blank" rel="noopener">Open / preview video</a></div>';
        }
        html += '<div class="hub-appr">' +
          '<div><b>' + esc(q.submitter_name || "Member") + '</b> <span class="muted">' + esc(kind) + (when ? (" · " + esc(when) + " UTC") : "") + '</span>' +
          '<div class="muted"><b>' + esc(q.title || "(untitled)") + '</b></div>' +
          (q.notes ? '<div class="muted">' + esc(q.notes) + '</div>' : "") +
          preview +
          '</div><div class="hub-appr-btns">' +
          '<button class="btn btn-primary" data-media-approve="' + esc(q.id) + '">Approve</button>' +
          '<button class="btn" data-media-deny="' + esc(q.id) + '">Deny</button>' +
          '</div></div>';
      });
    }
    if (clovers.length) {
      html += '<h3 class="hub-appr-h">Clover claims</h3>';
      clovers.forEach(function (q) {
        var bits = [];
        if (q.guest_count) bits.push(q.guest_count + (q.guest_count === 1 ? " guest" : " guests"));
        if (q.event_name) bits.push(q.event_name);
        if (q.notes) bits.push(q.notes);
        html += '<div class="hub-appr">' +
          '<div><b>' + esc(q.member_name || q.member_email || "Member") + '</b> <span class="muted">' + esc(q.member_email || "") + '</span>' +
          '<div class="muted"><b>' + esc(q.activity_label || q.activity_code) + '</b> · +' + Number(q.clovers || 0) + ' 🍀</div>' +
          (bits.length ? '<div class="muted">' + esc(bits.join(" · ")) + '</div>' : "") +
          '</div><div class="hub-appr-btns">' +
          '<button class="btn btn-primary" data-clover-approve="' + esc(q.id) + '">Approve</button>' +
          '<button class="btn" data-clover-deny="' + esc(q.id) + '">Deny</button>' +
          '</div></div>';
      });
    }
    if (reqs.length) {
      html += '<h3 class="hub-appr-h">Role requests</h3>';
      reqs.forEach(function (q) {
        var roles = (q.requested_roles || []).join(", ");
        var extra = [];
        if (q.answers && q.answers.committee) extra.push("Committee: " + esc(q.answers.committee));
        if (q.answers && q.answers.note) extra.push("Note: " + esc(q.answers.note));
        html += '<div class="hub-appr">' +
          '<div><b>' + esc(q.full_name || q.email) + '</b> <span class="muted">' + esc(q.email) + '</span>' +
          '<div class="muted">Requests: <b>' + esc(roles) + '</b>' + (q.linked ? " · matches the roster" : " · <b>no roster match</b>") + '</div>' +
          (extra.length ? '<div class="muted">' + extra.join(" · ") + '</div>' : "") +
          '</div><div class="hub-appr-btns">' +
          '<button class="btn btn-primary" data-appr-approve="' + esc(q.id) + '">Approve</button>' +
          '<button class="btn" data-appr-deny="' + esc(q.id) + '">Deny</button>' +
          '</div></div>';
      });
    }
    if (dups.length) {
      html += '<h3 class="hub-appr-h">Possible duplicate records</h3>';
      dups.forEach(function (d) {
        html += '<div class="hub-appr">' +
          '<div><div class="muted">' + esc(d.reason) + '</div>' +
          '<div><b>A:</b> ' + esc(d.a.name) + ' · ' + esc(d.a.email || "no email") + (d.a.joined ? " · joined " + esc(d.a.joined) : "") + '</div>' +
          '<div><b>B:</b> ' + esc(d.b.name) + ' · ' + esc(d.b.email || "no email") + (d.b.joined ? " · joined " + esc(d.b.joined) : "") + '</div>' +
          '</div><div class="hub-appr-btns">' +
          '<button class="btn btn-primary" data-appr-merge data-keep="' + esc(d.a.id) + '" data-dupe="' + esc(d.b.id) + '">Keep A, fold B in</button>' +
          '<button class="btn btn-primary" data-appr-merge data-keep="' + esc(d.b.id) + '" data-dupe="' + esc(d.a.id) + '">Keep B, fold A in</button>' +
          '<button class="btn" data-appr-dismiss="' + esc(d.id) + '">Not duplicates</button>' +
          '</div></div>';
      });
    }
    if (mediaLog.length) html += mediaLogHtml(mediaLog);
    body.innerHTML = html;
    body.querySelectorAll("[data-media-approve]").forEach(function (b) {
      b.addEventListener("click", function () {
        decideApproval(client, "approve_content_item", { p_id: b.getAttribute("data-media-approve") }, b);
      });
    });
    body.querySelectorAll("[data-media-deny]").forEach(function (b) {
      b.addEventListener("click", function () {
        var note = prompt("Optional note for the record (why deny?)");
        if (note === null) return;
        decideApproval(client, "deny_content_item", { p_id: b.getAttribute("data-media-deny"), p_note: note || null }, b);
      });
    });
    body.querySelectorAll("[data-clover-approve]").forEach(function (b) {
      b.addEventListener("click", function () {
        decideApproval(client, "approve_clover_request", { p_id: b.getAttribute("data-clover-approve") }, b);
      });
    });
    body.querySelectorAll("[data-clover-deny]").forEach(function (b) {
      b.addEventListener("click", function () {
        var note = prompt("Optional note for the record (why deny?)");
        if (note === null) return;
        decideApproval(client, "deny_clover_request", { p_id: b.getAttribute("data-clover-deny"), p_note: note || null }, b);
      });
    });
    body.querySelectorAll("[data-appr-approve]").forEach(function (b) {
      b.addEventListener("click", function () {
        decideApproval(client, "approve_role_request", { p_id: b.getAttribute("data-appr-approve") }, b);
      });
    });
    body.querySelectorAll("[data-appr-deny]").forEach(function (b) {
      b.addEventListener("click", function () {
        var note = prompt("Optional note for the record (why deny?)");
        if (note === null) return;
        decideApproval(client, "deny_role_request", { p_id: b.getAttribute("data-appr-deny"), p_note: note || null }, b);
      });
    });
    body.querySelectorAll("[data-appr-merge]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!confirm("Merge these two records? Dues and event history move to the kept record, and the other is retired (not deleted).")) return;
        decideApproval(client, "merge_members", { p_keep: b.getAttribute("data-keep"), p_duplicate: b.getAttribute("data-dupe") }, b);
      });
    });
    body.querySelectorAll("[data-appr-dismiss]").forEach(function (b) {
      b.addEventListener("click", function () {
        decideApproval(client, "dismiss_duplicate", { p_id: b.getAttribute("data-appr-dismiss") }, b);
      });
    });
    wireOfficerDeskPicker();
  }

  // ---- Officer payments feed: what Stripe recorded, straight from the ledger ----
  async function loadPaymentsCard(client) {
    if (!state.canViewPayments) return;
    var panel = document.getElementById("hubOfficer");
    if (!panel) return;
    var card = document.getElementById("hubPayments");
    if (!card) {
      card = document.createElement("section");
      card.className = "app-card";
      card.id = "hubPayments";
      var approvals = document.getElementById("hubApprovals");
      if (approvals && approvals.nextSibling) panel.insertBefore(card, approvals.nextSibling);
      else panel.appendChild(card);
    }
    card.innerHTML =
      '<div class="app-head"><span class="ic">💵</span><div><h2>Payments</h2><small>Treasurer &amp; board — online payments recorded automatically</small></div></div>' +
      '<div class="app-body" id="hubPaymentsBody"><p class="empty">Loading payments…</p></div>';
    var body = card.querySelector("#hubPaymentsBody");
    var data = null;
    try {
      var res = await client.rpc("list_recent_payments", { p_limit: 50 });
      data = res.data;
    } catch (e) {}
    if (!data || !data.length) {
      body.innerHTML = '<p class="empty">No online payments yet. They appear here automatically once the payment system is connected (see PAYMENTS_SETUP.md).</p>';
      return;
    }
    var html = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:16px;">' +
      '<tr style="text-align:left;color:var(--muted);"><th style="padding:4px 8px;">When</th><th style="padding:4px 8px;">Who</th><th style="padding:4px 8px;">What</th><th style="padding:4px 8px;">Amount</th></tr>';
    data.forEach(function (r) {
      var when = String(r.when || "").slice(0, 10);
      html += '<tr style="border-top:1px solid rgba(168,128,28,.25);">' +
        '<td style="padding:6px 8px;white-space:nowrap;">' + esc(when) + "</td>" +
        '<td style="padding:6px 8px;">' + esc(r.payer || "?") + (r.matched ? "" : ' <span style="color:#b3261e;">(no roster match)</span>') + "</td>" +
        '<td style="padding:6px 8px;">' + esc(r.description || r.kind || "") + "</td>" +
        '<td style="padding:6px 8px;white-space:nowrap;">$' + (Number(r.amount_cents || 0) / 100).toFixed(2) + "</td></tr>";
    });
    html += "</table></div>";
    body.innerHTML = html;
    wireOfficerDeskPicker();
  }


  function studioAbs(path) {
    var origin = (location.origin || "").replace(/\/$/, "");
    return origin + "/" + String(path || "").replace(/^\//, "");
  }

  function studioPaintQR(slot, url, label) {
    if (!slot) return;
    slot.innerHTML = '<canvas></canvas><div style="font-size:15px;color:var(--muted);margin-top:6px;word-break:break-all;">' +
      esc(label || "Scan or open") + ': <a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url) + "</a></div>";
    if (window.QRCode) {
      QRCode.toCanvas(slot.querySelector("canvas"), url, { width: 220, margin: 1, color: { dark: "#14532d", light: "#ffffff" } });
    } else {
      slot.querySelector("canvas").replaceWith(Object.assign(document.createElement("p"), { textContent: "QR library unavailable — use the link." }));
    }
  }

  async function studioShowEventCheckinQR(eventId, slot) {
    var client = window.__kosSb;
    if (!client) { slot.innerHTML = '<p class="empty">Sign-in client not ready. Refresh and try again.</p>'; return; }
    slot.innerHTML = '<p class="empty">Making check-in QR…</p>';
    try {
      var res = await client.rpc("officer_enable_checkin", { p_event: eventId });
      if (res.error || !res.data) throw res.error || new Error("No check-in code returned.");
      var code = res.data;
      var url = studioAbs("members.html?checkin=" + encodeURIComponent(code));
      studioPaintQR(slot, url, "Door check-in");
    } catch (e) {
      slot.innerHTML = '<p class="empty">Couldn’t make a check-in QR. ' + esc((e && e.message) || "Try again.") +
        " (Check-in codes work for krewe meetings/events the officer check-in system knows.)</p>";
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
      '<div class="wide" style="margin-top:-4px;"><p style="font-size:12px;color:var(--muted);margin:0 0 6px;line-height:1.4;">Optional. After this date/time, public signup shows Registration closed and blocks new RSVPs and ticket checkout. Leave blank to stay open. Edit address, dates, and this close date anytime, including after publish.</p></div>' +
      '<div><label for="hubEventLocation">Location / address</label><input id="hubEventLocation" placeholder="Venue name and street address" /></div>' +
      '<div><label for="hubEventCapacity">Capacity</label><input id="hubEventCapacity" type="number" min="0" step="1" /></div>' +
      '<div class="wide"><label for="hubEventDescription">Description</label><textarea id="hubEventDescription"></textarea></div></div>' +
      '<div class="hub-event-checks"><label><input type="checkbox" id="hubEventPublic" checked /> Public event</label>' +
      '<label><input type="checkbox" id="hubEventMandatory" /> Mandatory meeting</label>' +
      '<label><input type="checkbox" id="hubEventFeatured" /> Featured Event</label></div>' +
      '<div class="hub-event-grid">' +
      '<div><label for="hubEventStatus">Status</label><select id="hubEventStatus"><option value="draft">Draft</option><option value="published">Published</option><option value="cancelled">Cancelled</option></select></div>' +
      '<div><label for="hubEventTicketLabel">Ticket label</label><input id="hubEventTicketLabel" placeholder="e.g. Member ticket" /></div>' +
      '<div><label for="hubEventTicketPrice">Ticket price (dollars)</label><input id="hubEventTicketPrice" type="number" min="0" step="0.01" placeholder="0.00" /></div>' +
      '<div><label for="hubEventPaymentUrl">Ticket payment URL</label><input id="hubEventPaymentUrl" type="url" placeholder="https://buy.stripe.com/..." /></div>' +
      '<div class="wide"><label for="hubEventFlyerUrl">Event image / PDF URL</label><input id="hubEventFlyerUrl" type="url" placeholder="https://… or upload a file below" /></div>' +
      '<div class="wide"><label for="hubEventFlyerFile">Upload event image or PDF</label>' +
      '<input id="hubEventFlyerFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" />' +
      '<p class="hub-flyer-note" id="hubEventFlyerNote" aria-live="polite">Upload fills the URL above. Then press Save event to attach it. Published public events show on the Events page. Check Featured Event to pin one in the Featured spot (only one at a time).</p>' +
      '<div class="hub-flyer-preview" id="hubEventFlyerPreview"></div>' +
      '<button class="btn" type="button" id="hubEventFlyerClear" style="margin-top:8px;">Clear image / PDF</button></div></div>' +
      '<p style="font-size:15px;color:var(--muted);margin:10px 0 0;">For paid tickets, create a Zeffy ticketing campaign and paste the public share link here. Sign me up / RSVP will open that checkout.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;"><button class="btn btn-primary" type="submit" id="hubEventSave">☘ Save event</button>' +
      '<button class="btn" type="button" id="hubEventNew">New / clear</button></div><p class="hub-event-msg" id="hubEventMsg" aria-live="polite"></p></form></div>';
  }


  var FLYER_MAX_BYTES = 10 * 1024 * 1024;
  var FLYER_TYPES = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  async function uploadEventFlyer(client, file) {
    var ext = FLYER_TYPES[file.type];
    if (!ext) {
      var name = (file.name || "").toLowerCase();
      if (name.endsWith(".pdf")) ext = "pdf";
      else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) ext = "jpg";
      else if (name.endsWith(".png")) ext = "png";
      else if (name.endsWith(".webp")) ext = "webp";
    }
    if (!ext) throw new Error("Please choose a PDF, JPG, PNG, or WEBP file.");
    if (file.size > FLYER_MAX_BYTES) throw new Error("Files must be 10 MB or smaller.");
    var base = (file.name || "flyer").replace(/\.[^.]*$/, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "flyer";
    var path = Date.now() + "-" + base + "." + ext;
    var up = await client.storage.from("event-flyers").upload(path, file, {
      upsert: false, contentType: file.type || undefined, cacheControl: "3600"
    });
    if (up.error) throw up.error;
    return client.storage.from("event-flyers").getPublicUrl(path).data.publicUrl;
  }
  function syncFlyerPreview() {
    var urlEl = document.getElementById("hubEventFlyerUrl");
    var preview = document.getElementById("hubEventFlyerPreview");
    if (!preview) return;
    var url = urlEl ? urlEl.value.trim() : "";
    if (!url) { preview.className = "hub-flyer-preview"; preview.innerHTML = ""; return; }
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
    document.getElementById("hubEventFeatured").checked = false;
    var rcClear = document.getElementById("hubEventRegCloses"); if (rcClear) rcClear.value = "";
    document.getElementById("hubEventStatus").value = "draft";
    document.getElementById("hubEventType").value = "social";
    document.getElementById("hubEventFormTitle").textContent = "New event";
    document.getElementById("hubEventMsg").textContent = "";
    var note = document.getElementById("hubEventFlyerNote");
    if (note) note.textContent = "Upload fills the URL above. Then press Save event to attach it. Published public events show on the Events page.";
    syncFlyerPreview();
  }

  function fillEventForm(event) {
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
    get("hubEventFeatured").checked = !!event.is_featured;
    get("hubEventStatus").value = event.status || "published";
    get("hubEventTicketLabel").value = event.ticket_label || "";
    get("hubEventTicketPrice").value = event.ticket_price_cents == null ? "" : (Number(event.ticket_price_cents) / 100).toFixed(2);
    get("hubEventPaymentUrl").value = event.ticket_payment_url || "";
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
      target.innerHTML = '<p class="empty">No Krewe events yet. Create the first one below. After you save, you can make RSVP and door check-in QR codes here.</p>';
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
      var eid = esc(event.id);
      var flyer = event.flyer_url || "";
      var thumb = flyer
        ? (/\.pdf(?:$|[?#])/i.test(flyer)
            ? '<div class="hub-event-thumb ph">PDF</div>'
            : '<img class="hub-event-thumb" src="' + esc(flyer) + '" alt="" />')
        : '<div class="hub-event-thumb ph">No image</div>';
      html += '<div class="hub-event-row">' + thumb + '<div class="hub-event-copy"><b>' + esc(event.name) + '</b>' +
        '<div class="muted">' + esc(details.join(" · ") || "Date to be announced") + '</div>' +
        '<div class="muted">' + esc(event.status || "published") + (event.event_type ? " · " + esc(event.event_type) : "") + esc(ticket) +
        (event.is_featured ? " · Featured" : "") +
        (flyer ? " · has image/PDF" : " · add image/PDF") +
        (readOnly ? " · IKC event (read-only)" : "") + '</div></div>' +
        (readOnly ? "" : '<div class="hub-appr-btns">' +
          '<button class="btn btn-primary" type="button" data-event-edit="' + eid + '">Edit event</button>' +
          '<button class="btn" type="button" data-event-rsvp-qr="' + eid + '">▦ RSVP QR</button>' +
          '<button class="btn btn-primary" type="button" data-event-checkin-qr="' + eid + '">▦ Door check-in QR</button>' +
        '</div>') +
        '<div class="qr-slot" data-event-qr-slot="' + eid + '" style="flex-basis:100%;margin-top:8px;"></div></div>';
    });
    target.innerHTML = html;
    target.querySelectorAll("[data-event-edit]").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-event-edit");
        var event = list.find(function (row) { return String(row.id) === String(id); });
        if (event && String(event.source || "").toLowerCase() !== "ikc") fillEventForm(event);
      });
    });
    target.querySelectorAll("[data-event-rsvp-qr]").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-event-rsvp-qr");
        var slot = target.querySelector('[data-event-qr-slot="' + id + '"]');
        var url = studioAbs("event-signup.html?event=" + encodeURIComponent(id));
        studioPaintQR(slot, url, "RSVP / Sign me up");
      });
    });
    target.querySelectorAll("[data-event-checkin-qr]").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-event-checkin-qr");
        var slot = target.querySelector('[data-event-qr-slot="' + id + '"]');
        studioShowEventCheckinQR(id, slot);
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
      is_featured: !!document.getElementById("hubEventFeatured").checked,
      status: value("hubEventStatus") || "draft",
      ticket_label: value("hubEventTicketLabel") || null,
      ticket_price_cents: ticketValue === "" ? null : Math.round(dollars * 100),
      ticket_payment_url: value("hubEventPaymentUrl") || null, flyer_url: value("hubEventFlyerUrl") || null,
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
      if (msg) msg.textContent = "Event saved. Use RSVP QR or Door check-in QR on the event in the list above.";
      clearEventForm();
      await refreshEventStudio(client);
    } catch (e) { if (msg) msg.textContent = "Couldn't save: " + ((e && e.message) || e); }
    if (save) { save.disabled = false; save.textContent = "☘ Save event"; }
  }
  async function loadEventStudio(client) {
    if (!state.canManageEvents) return;
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
      else panel.appendChild(card);
    }
    card.innerHTML =
      '<div class="app-head"><span class="ic">📅</span><div><h2>Event Studio</h2><small>Add or edit events (address, dates, registration close) anytime after publish - then make RSVP and door check-in QR codes</small></div></div>' +
      '<div class="app-body">' +
      '<p style="font-size:16px;color:var(--muted);margin:0 0 12px;">Tap <b>Edit event</b> on any published row to change address, start/end, or registration close. How QR works: <b>save the event</b>, then tap <b>RSVP QR</b> (flyer/table tent) or <b>Door check-in QR</b> (projector at the door). The square is just that link.</p>' +
      '<div class="hub-event-list"><h3>Events</h3><div id="hubEventList"><p class="empty">Loading events…</p></div></div>' +
      eventStudioFormHtml() + '</div>';
    document.getElementById("hubEventForm").addEventListener("submit", function (e) {
      e.preventDefault(); saveEventStudio(client);
    });
    document.getElementById("hubEventNew").addEventListener("click", clearEventForm);
    var flyerFile = document.getElementById("hubEventFlyerFile");
    if (flyerFile) flyerFile.addEventListener("change", async function () {
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
    wireOfficerDeskPicker();
  }

  function bindTabs() {
    document.querySelectorAll("[data-hub-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tab = btn.getAttribute("data-hub-tab");
        if (tab !== "parade") clearHoursIntent();
        showTab(tab);
      });
    });
  }

  
  var OFFICER_TOOL_ORDER = [
    "hubApprovals",
    "hubPayments",
    "hubEventStudio",
    "hubShopStudio",
    "hubQrStudio",
    "hubReports",
    "hubAllKrewe",
    "hubEmailMembers",
    "hubSendInvoices"
  ];

  var OFFICER_TOOL_META = {
    hubApprovals: { title: "Approvals", desc: "Roles, clover claims, media, and record merges", icon: "✅", section: "Approvals" },
    hubPayments: { title: "Payments", desc: "Dues and payment records", icon: "💳", section: "Money" },
    hubEventStudio: { title: "Event Studio", desc: "Add or edit events, RSVP QR, door check-in", icon: "📅", section: "Events" },
    hubShopStudio: { title: "Shop Studio", desc: "Products, Zeffy links, shop QR", icon: "🛍️", section: "Shop" },
    hubQrStudio: { title: "QR Code Studio", desc: "Meeting check-in and handy link QRs", icon: "📱", section: "Events" },
    hubReports: { title: "Reports", desc: "Attendance, fundraising, and live event numbers", icon: "📊", section: "Reports" },
    hubAllKrewe: { title: "All Krewe Messages", desc: "Email the full membership", icon: "✉️", section: "Reports" },
    hubEmailMembers: { title: "Email members", desc: "Choose audience, write, preview, and send", icon: "✉️", section: "Email & invoices" },
    hubSendInvoices: { title: "Send invoices", desc: "Create dues invoices and email pay links", icon: "🧾", section: "Email & invoices" }
  };

  var OFFICER_SECTION_ORDER = [
    "Events",
    "Approvals",
    "Shop",
    "Money",
    "Email & invoices",
    "Reports"
  ];

  function officerDeskCards() {
    var panel = document.getElementById("hubOfficer");
    if (!panel) return [];
    return Array.prototype.filter.call(panel.children, function (el) {
      if (!el.classList || !el.classList.contains("app-card")) return false;
      // Home dash cards (Reports shortcut, etc.) must never appear as officer tools
      if (el.classList.contains("dash-card") || el.id === "dashCard") return false;
      return true;
    });
  }

  function ensureOfficerToolCard(id) {
    var panel = document.getElementById("hubOfficer");
    if (!panel) return null;
    var card = document.getElementById(id);
    if (card) return card;
    var meta = OFFICER_TOOL_META[id] || { title: id, desc: "" };
    card = document.createElement("section");
    card.className = "app-card";
    card.id = id;
    card.innerHTML =
      '<div class="app-head"><span class="ic">☘</span><div><h2>' +
      meta.title +
      "</h2><small>" +
      (meta.desc || "Loading…") +
      "</small></div></div>" +
      '<div class="app-body"><p class="empty">Loading this tool… If it stays blank, refresh the page.</p></div>';
    panel.appendChild(card);
    return card;
  }

  function officerReportDefs() {
    var list = window.REPORTS;
    if (!list || !list.length) return [];
    return list.filter(function (r) {
      return r && r.id && r.title;
    });
  }

  function openOfficerReport(reportId) {
    if (typeof window.openReports === "function") window.openReports();
    if (typeof window.runReport === "function") {
      setTimeout(function () {
        window.runReport(reportId);
      }, 40);
    }
  }

  function currentOfficerToolOrder() {
    var toolOrder = OFFICER_TOOL_ORDER.slice();
    if (state.shopOnly && state.socialOnly) {
      toolOrder = ["hubShopStudio", "hubEventStudio", "hubReports"];
    } else if (state.shopOnly) {
      toolOrder = ["hubShopStudio"];
    } else if (state.socialOnly) {
      toolOrder = ["hubEventStudio", "hubReports"];
    }
    return toolOrder;
  }

  function ensureOfficerDeskChrome() {
    var panel = document.getElementById("hubOfficer");
    if (!panel) return null;

    var hero = document.getElementById("hubOfficerHero");
    if (!hero) {
      hero = document.createElement("div");
      hero.id = "hubOfficerHero";
      hero.className = "hub-officer-hero";
      hero.innerHTML =
        "<h2>Officer desk</h2>" +
        "<p>Pick one tool below. Sections: Events, Approvals, Shop, Money, Email & invoices, and Reports.</p>";
      panel.insertBefore(hero, panel.firstChild);
    }

    var launcher = document.getElementById("hubOfficerLauncher");
    if (!launcher) {
      launcher = document.createElement("div");
      launcher.id = "hubOfficerLauncher";
      launcher.className = "hub-officer-launcher";
      panel.insertBefore(launcher, hero.nextSibling);
    }

    var activeBar = document.getElementById("hubOfficerActiveBar");
    if (!activeBar) {
      activeBar = document.createElement("div");
      activeBar.id = "hubOfficerActiveBar";
      activeBar.className = "hub-officer-activebar";
      activeBar.innerHTML =
        '<div class="lbl" id="hubOfficerActiveLabel">Tool open</div>' +
        '<button type="button" id="hubOfficerBackBtn">← All tools</button>';
      panel.insertBefore(activeBar, launcher.nextSibling);
      document.getElementById("hubOfficerBackBtn").addEventListener("click", function () {
        try { sessionStorage.removeItem("kosOfficerTool"); } catch (e) {}
        var sel = document.getElementById("officerToolSelect");
        if (sel) {
          sel.value = "";
          sel.selectedIndex = -1;
        }
        showOfficerOverview();
      });
    }

    var picker = document.getElementById("hubOfficerPicker");
    if (!picker) {
      picker = document.createElement("div");
      picker.className = "hub-officer-picker compact";
      picker.id = "hubOfficerPicker";
      picker.innerHTML =
        '<label for="officerToolSelect">Jump by name</label>' +
        '<select id="officerToolSelect"><option value="">Choose a tool or report…</option></select>' +
        '<p class="hint" id="officerToolHint">Optional menu if you prefer searching by name.</p>';
      panel.insertBefore(picker, activeBar.nextSibling);
    }
    return panel;
  }

  function showOfficerOverview() {
    var launcher = document.getElementById("hubOfficerLauncher");
    var activeBar = document.getElementById("hubOfficerActiveBar");
    if (launcher) launcher.style.display = "";
    if (activeBar) activeBar.classList.remove("show");
    officerDeskCards().forEach(function (card) {
      card.classList.add("hub-officer-hidden");
      card.style.display = "none";
    });
    var tiles = document.querySelectorAll(".hub-officer-tile");
    for (var i = 0; i < tiles.length; i++) tiles[i].classList.remove("on");
  }

  function openOfficerTool(raw, fromUser) {
    var launcher = document.getElementById("hubOfficerLauncher");
    var activeBar = document.getElementById("hubOfficerActiveBar");
    var label = document.getElementById("hubOfficerActiveLabel");
    var sel = document.getElementById("officerToolSelect");
    var hint = document.getElementById("officerToolHint");

    if (!raw) {
      showOfficerOverview();
      return;
    }

    if (sel && Array.prototype.some.call(sel.options, function (o) { return o.value === raw; })) {
      sel.value = raw;
    }
    var opt = sel && sel.options[sel.selectedIndex];
    if (hint && opt) hint.textContent = opt.getAttribute("data-desc") || "Pick a tool from the list.";

    if (raw.indexOf("report:") === 0) {
      var rid = raw.slice(7);
      var showId = "hubReports";
      ensureOfficerToolCard(showId);
      if (launcher) launcher.style.display = "none";
      if (activeBar) activeBar.classList.add("show");
      if (label) label.textContent = (opt && opt.textContent) ? opt.textContent : "Report";
      officerDeskCards().forEach(function (card) {
        var show = card.id === showId;
        card.classList.toggle("hub-officer-hidden", !show);
        card.style.display = show ? "" : "none";
      });
      document.querySelectorAll(".hub-officer-tile").forEach(function (t) {
        t.classList.toggle("on", t.getAttribute("data-tool") === "tool:hubReports");
      });
      if (fromUser) openOfficerReport(rid);
    } else {
      var id = raw.indexOf("tool:") === 0 ? raw.slice(5) : raw;
      if (fromUser && typeof window.closeReports === "function") {
        try { window.closeReports(); } catch (e) {}
      }
      ensureOfficerToolCard(id);
      var meta = OFFICER_TOOL_META[id] || {};
      if (launcher) launcher.style.display = "none";
      if (activeBar) activeBar.classList.add("show");
      if (label) label.textContent = meta.title || id;
      officerDeskCards().forEach(function (card) {
        var show = card.id === id;
        card.classList.toggle("hub-officer-hidden", !show);
        card.style.display = show ? "" : "none";
      });
      document.querySelectorAll(".hub-officer-tile").forEach(function (t) {
        t.classList.toggle("on", t.getAttribute("data-tool") === ("tool:" + id));
      });
    }
    try { if (raw) sessionStorage.setItem("kosOfficerTool", raw); } catch (e2) {}
  }

  function buildOfficerLauncher(toolOrder) {
    var launcher = document.getElementById("hubOfficerLauncher");
    if (!launcher) return;
    var bySection = {};
    toolOrder.forEach(function (id) {
      var meta = OFFICER_TOOL_META[id] || { title: id, desc: "", icon: "☘", section: "More tools" };
      var sec = meta.section || "More tools";
      if (!bySection[sec]) bySection[sec] = [];
      bySection[sec].push({ id: id, meta: meta });
    });
    var html = "";
    var seen = {};
    OFFICER_SECTION_ORDER.forEach(function (sec) {
      if (!bySection[sec] || !bySection[sec].length) return;
      seen[sec] = true;
      html += '<div class="hub-officer-section"><h3>' + sec + "</h3><div class=\"hub-officer-tiles\">";
      bySection[sec].forEach(function (item) {
        html +=
          '<button type="button" class="hub-officer-tile" data-tool="tool:' + item.id + '">' +
          '<span class="tic" aria-hidden="true">' + (item.meta.icon || "☘") + "</span>" +
          "<b>" + item.meta.title + "</b>" +
          "<span>" + (item.meta.desc || "") + "</span></button>";
      });
      html += "</div></div>";
    });
    Object.keys(bySection).forEach(function (sec) {
      if (seen[sec]) return;
      html += '<div class="hub-officer-section"><h3>' + sec + "</h3><div class=\"hub-officer-tiles\">";
      bySection[sec].forEach(function (item) {
        html +=
          '<button type="button" class="hub-officer-tile" data-tool="tool:' + item.id + '">' +
          '<span class="tic" aria-hidden="true">' + (item.meta.icon || "☘") + "</span>" +
          "<b>" + item.meta.title + "</b>" +
          "<span>" + (item.meta.desc || "") + "</span></button>";
      });
      html += "</div></div>";
    });
    launcher.innerHTML = html;
    launcher.querySelectorAll(".hub-officer-tile").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openOfficerTool(btn.getAttribute("data-tool"), true);
      });
    });
  }

  function wireOfficerDeskPicker() {
    var panel = ensureOfficerDeskChrome();
    if (!panel) return;

    var toolOrder = currentOfficerToolOrder();
    toolOrder.forEach(ensureOfficerToolCard);

    var cards = officerDeskCards();
    var sel = document.getElementById("officerToolSelect");
    var hint = document.getElementById("officerToolHint");
    var prev = sel ? sel.value : "";

    buildOfficerLauncher(toolOrder);

    if (hint) {
      if (state.shopOnly && state.socialOnly) {
        hint.textContent = "Committee tools: Shop Studio, Event Studio, and related reports.";
      } else if (state.shopOnly) {
        hint.textContent = "Merchandise Chair: Shop Studio (products, Zeffy links, shop QR).";
      } else if (state.socialOnly) {
        hint.textContent = "Social / Charity: Event Studio and event or charity reports.";
      } else {
        hint.textContent = "Optional menu if you prefer searching by name.";
      }
    }

    cards.forEach(function (card) {
      if (!card || !card.id) return;
      var limited = state.shopOnly || state.socialOnly;
      if (limited && toolOrder.indexOf(card.id) === -1) {
        card.style.display = "none";
        card.classList.add("hub-officer-hidden");
      }
    });

    sel.innerHTML = '<option value="">Choose a tool or report…</option>';

    var studioGroup = document.createElement("optgroup");
    studioGroup.label = (state.shopOnly && !state.socialOnly) ? "Merchandise tools" : (state.socialOnly && !state.shopOnly) ? "Social / Charity tools" : (state.shopOnly && state.socialOnly) ? "Committee tools" : "Studios & officer tools";
    toolOrder.forEach(function (id) {
      var card = document.getElementById(id);
      var meta = OFFICER_TOOL_META[id] || {};
      var h = card && card.querySelector(".app-head h2, h2");
      var title = (h && h.textContent && h.textContent.trim()) || meta.title || id;
      var small = card && card.querySelector(".app-head small");
      var desc = (small && small.textContent.trim()) || meta.desc || "";
      var opt = document.createElement("option");
      opt.value = "tool:" + id;
      opt.textContent = title;
      opt.setAttribute("data-desc", desc);
      studioGroup.appendChild(opt);
    });
    sel.appendChild(studioGroup);

    var known = {};
    OFFICER_TOOL_ORDER.forEach(function (id) { known[id] = true; });
    var extras = (state.shopOnly || state.socialOnly) ? [] : cards.filter(function (c) { return c.id && !known[c.id]; });
    if (extras.length) {
      var extraGroup = document.createElement("optgroup");
      extraGroup.label = "More tools";
      extras.forEach(function (card) {
        var h = card.querySelector(".app-head h2, h2");
        var title = (h && h.textContent) ? h.textContent.trim() : card.id;
        var small = card.querySelector(".app-head small");
        var opt = document.createElement("option");
        opt.value = "tool:" + card.id;
        opt.textContent = title;
        opt.setAttribute("data-desc", small ? small.textContent.trim() : "");
        extraGroup.appendChild(opt);
      });
      sel.appendChild(extraGroup);
    }

    var reports = officerReportDefs();
    if (state.shopOnly && !state.socialOnly) {
      reports = [];
    } else if (state.socialOnly) {
      var SOCIAL_REPORT_CATS = { "Events & Attendance": true };
      var SOCIAL_REPORT_IDS = {
        event_attendance: true,
        events_upcoming: true,
        event_headcount: true,
        volunteer_coverage: true,
        attendee_contacts: true,
        tartan_ball: true
      };
      reports = reports.filter(function (r) {
        return !!(SOCIAL_REPORT_IDS[r.id] || SOCIAL_REPORT_CATS[r.cat]);
      });
    }
    if (reports.length) {
      var byCat = {};
      reports.forEach(function (r) {
        var cat = r.cat || "Reports";
        if (!byCat[cat]) byCat[cat] = [];
        byCat[cat].push(r);
      });
      Object.keys(byCat).forEach(function (cat) {
        var group = document.createElement("optgroup");
        group.label = "Report: " + cat;
        byCat[cat].forEach(function (r) {
          var opt = document.createElement("option");
          opt.value = "report:" + r.id;
          opt.textContent = (r.icon ? r.icon + " " : "") + r.title;
          opt.setAttribute("data-desc", r.desc || "");
          group.appendChild(opt);
        });
        sel.appendChild(group);
      });
    }

    var tryVals = [];
    if (prev) tryVals.push(prev);
    try {
      var saved = sessionStorage.getItem("kosOfficerTool");
      if (saved) {
        tryVals.push(saved);
        if (saved.indexOf("tool:") !== 0 && saved.indexOf("report:") !== 0) {
          tryVals.push("tool:" + saved);
        }
      }
    } catch (e) {}
    var picked = null;
    for (var i = 0; i < tryVals.length; i++) {
      var v = tryVals[i];
      if (Array.prototype.some.call(sel.options, function (o) { return o.value === v; })) {
        picked = v;
        break;
      }
    }

    sel.onchange = function () {
      var raw = sel.value || "";
      if (!raw) showOfficerOverview();
      else openOfficerTool(raw, true);
    };

    if (picked) openOfficerTool(picked, false);
    else showOfficerOverview();

    if (!panel._kosOfficerObs) {
      var timer = null;
      panel._kosOfficerObs = new MutationObserver(function (mutations) {
        var selfChange = false;
        for (var mi = 0; mi < mutations.length; mi++) {
          var nodes = mutations[mi].addedNodes;
          for (var ni = 0; ni < nodes.length; ni++) {
            var n = nodes[ni];
            if (n && n.id && (n.id === "hubOfficerHero" || n.id === "hubOfficerLauncher" || n.id === "hubOfficerActiveBar" || n.id === "hubOfficerPicker")) {
              selfChange = true;
            }
          }
        }
        if (selfChange) return;
        clearTimeout(timer);
        timer = setTimeout(function () { wireOfficerDeskPicker(); }, 120);
      });
      panel._kosOfficerObs.observe(panel, { childList: true, subtree: false });
    }
  }

  window.kosRefreshOfficerDesk = wireOfficerDeskPicker;


  var hubBootStarted = false;
  var hubLoadGen = 0;
  var hubLoadInFlight = false;
  var hubSettled = false;

  var _loadHubDataInner = loadHubData;
  loadHubData = async function () {
    if (hubLoadInFlight) return;
    hubLoadInFlight = true;
    var gen = ++hubLoadGen;
    try {
      await _loadHubDataInner();
      if (gen === hubLoadGen) hubSettled = true;
    } finally {
      if (gen === hubLoadGen) hubLoadInFlight = false;
    }
  };

  function boot() {
    if (!document.getElementById("memberContent")) return;
    if (document.getElementById("hubRoot")) {
      // Already built: only refresh data if we have not settled this session.
      if (!hubSettled && !hubLoadInFlight) loadHubData();
      return;
    }
    if (hubBootStarted) return;
    hubBootStarted = true;
    injectCss();
    tagSections();
    moveIntoPanels();
    bindTabs();
    var tries = 0;
    var t = setInterval(function () {
      tries += 1;
      var content = document.getElementById("memberContent");
      var visible = content && content.style.display !== "none";
      if (visible || tries > 50) {
        clearInterval(t);
        loadHubData();
      }
    }, 200);
  }

  var _unlock = window.kosUnlock;
  window.kosUnlock = function () {
    if (typeof _unlock === "function") _unlock();
    // Build hub once; loadHubData itself is single-flight. Do not open hours
    // here — loadHubData settles the tab and defers the hours deep-link.
    setTimeout(boot, 40);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

