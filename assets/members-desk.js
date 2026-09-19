/* Member Hub: personal home + tabbed sections. Preserves existing feature cards. */
(function () {
  "use strict";

  var TAB_HOME = "hub";
  var CSS = [
    ".hub-wrap{margin:0 0 18px;}",
    /* Tartan accent strip: a narrow woven band in the crest's green, navy,
       and gold across the top of the hub - a nod to Tampa's Original Kilted
       Krewe. Layers: diagonal weave texture, vertical navy bands with gold
       pinstripes, a horizontal gold hairline, on a deep green ground. */
    ".hub-wrap::before{content:'';display:block;height:14px;border-radius:999px;margin:0 0 12px;border:1px solid rgba(169,128,28,.55);box-shadow:inset 0 1px 2px rgba(0,0,0,.3);background:" +
      "repeating-linear-gradient(45deg,rgba(255,255,255,.09) 0 2px,transparent 2px 4px)," +
      "repeating-linear-gradient(0deg,transparent 0 4px,rgba(212,175,55,.4) 4px 5px,transparent 5px 14px)," +
      "repeating-linear-gradient(90deg,transparent 0 26px,rgba(49,55,112,.85) 26px 40px,transparent 40px 52px,rgba(212,175,55,.9) 52px 55px,transparent 55px 68px,rgba(49,55,112,.85) 68px 74px,transparent 74px 96px)," +
      "linear-gradient(180deg,#1d6b3e,#14532d);}",
    ".hub-welcome{position:relative;overflow:hidden;background:#fff;border:1px solid rgba(168,128,28,.28);border-radius:18px;padding:20px 22px;box-shadow:var(--shadow-sm);}",
    ".hub-welcome::before{content:'☘';position:absolute;top:-8px;right:10px;font-size:64px;opacity:.12;pointer-events:none;transform:rotate(12deg);}",
    ".hub-welcome h2{font-family:var(--display);color:var(--green-800);margin:0 0 12px;font-size:26px;}",
    ".hub-welcome .hub-hello{margin:0 0 4px;font-size:16px;color:var(--muted);}",
    ".hub-welcome .hub-chips{margin:0 0 10px;}",
    ".hub-craic{position:relative;overflow:hidden;background:repeating-linear-gradient(-45deg,rgba(201,162,39,.10) 0 10px,rgba(194,69,30,.09) 10px 20px,transparent 20px 34px),linear-gradient(165deg,#1d6b3e 0%,#14532d 55%,#0f3d22 100%);color:#f6efdc;border-radius:20px;padding:22px 22px 18px;box-shadow:0 6px 18px rgba(23,94,67,.25);border:2px solid #c9a227;}",
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
    ".hub-board{margin-top:14px;background:#fffdf4;border:1px solid rgba(168,128,28,.4);border-radius:18px;padding:20px 22px;box-shadow:var(--shadow-sm);}",
    ".hub-board h3{font-family:var(--display);color:var(--green-800);margin:0 0 8px;font-size:21px;}",
    ".hub-board-rule{height:3px;background:linear-gradient(90deg,#a9801c,#d4af37,#ecd07e,#d4af37,#a9801c);border-radius:2px;margin:0 0 4px;border-bottom:3px solid #fffdf4;box-shadow:0 5px 0 -2px rgba(169,128,28,.55);}",
    ".hub-board .hub-board-date{font-size:15px;color:var(--muted);font-family:var(--display);letter-spacing:.03em;margin:10px 0 2px;}",
    ".hub-board h4{font-family:var(--display);color:var(--green-800);margin:4px 0 10px;font-size:19px;}",
    ".hub-board p{margin:0 0 10px;line-height:1.6;}",
    ".hub-board-old{border-top:1px solid rgba(168,128,28,.3);padding:10px 0 4px;}",
    ".hub-board-old summary{cursor:pointer;font-family:var(--display);color:var(--green-800);font-size:16px;}",
    ".hub-board-old .hub-board-date{display:inline;margin:0;}",
    ".hub-board-archive-wrap{margin-top:12px;border-top:1px solid rgba(168,128,28,.3);padding-top:12px;}",
    ".hub-board-archive-wrap h4{margin:0 0 6px;}",
    ".hub-board-archive-wrap .empty{color:var(--muted);font-size:14px;}",
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
    ".hub-action b a{color:inherit;text-decoration:underline;}",
    ".hub-find a[href='#docs']{color:var(--green-800);text-decoration:underline;}",
    ".hub-action span{font-size:15px;color:var(--muted);line-height:1.35;}",
    ".hub-find{margin-top:14px;background:#fff;border:1px solid rgba(168,128,28,.28);border-radius:16px;padding:14px 16px;}",
    ".hub-find h3{font-family:var(--display);color:var(--green-800);margin:0 0 10px;font-size:19px;}",
    ".hub-find-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;}",
    ".hub-find .hub-action{width:100%;display:flex;align-items:flex-start;gap:12px;}",
    ".hub-find h3{display:flex;align-items:center;gap:9px;}",
    ".hub-find h3 .qk-ic{width:32px;height:32px;}",
    ".hub-find h3 .qk-ic svg{width:20px;height:20px;}",
    ".hub-find-sub{margin:-4px 0 12px;font-size:15px;color:var(--muted);}",
    ".qk-ic{flex:none;width:42px;height:42px;border-radius:50%;background:#f4ecd6;border:1px solid rgba(168,128,28,.45);color:var(--green-800);display:inline-flex;align-items:center;justify-content:center;}",
    ".qk-ic svg{width:24px;height:24px;display:block;}",
    ".hub-find button.hub-action:hover .qk-ic{background:var(--green-800);border-color:var(--green-800);color:#f0d78c;}",
    ".qk-copy{flex:1;min-width:0;display:block;}",
    ".qk-copy > span{display:block;}",
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
    "#docs,#hubMemberDirectory,#hubEventStudio{scroll-margin-top:88px;}",
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
    ".hub-event-thumb.ph{display:grid;place-items:center;font-size:15px;color:var(--muted);text-align:center;padding:4px;}",
    ".hub-event-optional{grid-column:1/-1;margin-top:8px;padding:12px;border:1px solid rgba(168,128,28,.28);border-radius:12px;background:#fff;}",
    ".hub-event-optional h4{margin:0 0 6px;font-family:var(--display);color:var(--green-800);font-size:16px;}",
    ".hub-event-optional p.hub-opt-hint{font-size:15px;color:var(--muted);margin:0 0 8px;line-height:1.4;}",
    ".hub-event-optional-fields{display:grid;grid-template-columns:1fr 1fr;gap:0 12px;}",
    ".btn.btn-danger,.hub-event-form .btn-danger{border-color:#b3452e;color:#8b2e1c;background:#fff5f2;}",
    ".hub-event-delete-panel{margin-top:16px;padding:14px;border:1px solid #b3452e;border-radius:12px;background:#fff5f2;}",
    ".hub-event-delete-panel h4{margin:0 0 8px;font-family:var(--display);color:#8b2e1c;font-size:17px;}",
    ".hub-event-delete-panel p{font-size:15px;color:#5c2b20;line-height:1.45;margin:0 0 8px;}",
    ".hub-event-delete-panel #hubEventDeleteErr{color:#8b2e1c;min-height:1.2em;}",
    "@media(max-width:620px){.hub-event-grid{grid-template-columns:1fr;}.hub-event-grid .wide{grid-column:auto;}.hub-event-row{flex-direction:column;}.hub-event-optional-fields{grid-template-columns:1fr;}}",
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
    ".hub-install{background:#fff;border:1px solid rgba(168,128,28,.22);border-radius:16px;padding:16px 16px 14px;}",
    ".hub-install h3{font-family:var(--display);color:var(--green-800);margin:0 0 8px;font-size:20px;}",
    ".hub-install p{margin:0 0 10px;font-size:16px;line-height:1.4;color:#3a3a2e;}",
    ".hub-install-steps{margin:0 0 10px;padding:0 0 0 1.2em;display:grid;gap:8px;font-size:16px;line-height:1.4;color:#3a3a2e;}",
    ".hub-install-note{margin:0;font-size:15px;color:var(--muted);}",
    ".hub-find{margin-top:0;background:#fff;border:1px solid rgba(168,128,28,.22);border-radius:16px;padding:16px;}",
    ".hub-find h3{margin:0 0 10px;font-size:18px;}",
    ".hub-find-grid{display:grid;grid-template-columns:1fr;gap:10px;}",
    ".hub-action{width:100%;text-align:left;background:#fffdf4;border:1px solid rgba(168,128,28,.35);border-radius:14px;padding:14px 16px;cursor:pointer;font:inherit;min-height:56px;}",
    ".hub-action b{font-size:17px;margin-bottom:4px;}",
    ".hub-action span{font-size:15px;}",
    ".qk-ic{width:40px;height:40px;}",
    ".qk-ic svg{width:22px;height:22px;}",
    ".hub-find h3 .qk-ic{width:30px;height:30px;}",
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

    /* ==== Member desk: one desk, four labeled counters (Irish masthead) ====
       Knotwork trim comes from the site's own Celtic SVG assets; type and
       color follow the heritage pages (Cinzel display, parchment, gold rule,
       crest green), so the desk reads as part of the same illuminated page. */
    ".desk-hero{position:relative;overflow:hidden;background:linear-gradient(180deg,#fffdf8,#f7f0dd);border:1px solid rgba(168,128,28,.42);border-radius:18px;padding:27px 20px 16px;margin:0 0 16px;box-shadow:var(--shadow-sm);}",
    ".desk-hero::before{content:'';position:absolute;left:0;right:0;top:0;height:13px;background:url('/assets/img/celtic-border.svg') repeat-x;background-size:auto 100%;}",
    ".desk-hero::after{content:'';position:absolute;right:-16px;bottom:-16px;width:130px;height:130px;background:url('/assets/img/celtic-corner.svg') no-repeat center/contain;opacity:.15;transform:rotate(180deg);pointer-events:none;}",
    ".desk-hero>*{position:relative;z-index:1;}",
    ".desk-kicker{margin:6px 0 2px;font-family:var(--fancy);font-style:italic;font-size:17px;color:var(--gold-text);letter-spacing:.04em;}",
    ".desk-hero h2{margin:0 0 8px;font-family:var(--display);font-size:clamp(24px,4vw,30px);color:var(--green-800);letter-spacing:.02em;}",
    ".desk-hero p{margin:0 0 12px;font-size:16px;line-height:1.5;color:#3a3a2e;max-width:52em;}",
    ".desk-nav{display:flex;flex-wrap:wrap;gap:8px;}",
    ".desk-nav button{display:inline-flex;align-items:center;gap:7px;min-height:44px;border:1px solid rgba(168,128,28,.45);background:#fff;color:var(--green-800);border-radius:999px;padding:9px 15px;font-family:var(--display);font-size:15px;cursor:pointer;box-shadow:0 1px 3px rgba(42,33,24,.10);}",
    ".desk-nav button:hover{background:var(--green-800);color:#f6efdc;border-color:var(--green-800);}",
    ".desk-group-head{display:flex;align-items:center;gap:12px;padding:8px 2px 10px;}",
    ".desk-group-head .dg-ic{flex:none;width:44px;height:44px;display:grid;place-items:center;font-size:22px;background:#fdf6dd;border:2px solid rgba(168,128,28,.5);border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.12);}",
    ".desk-group-head h3{margin:0;font-family:var(--display);font-size:22px;color:var(--green-800);letter-spacing:.03em;}",
    ".desk-group-head .dg-sub{display:block;margin-top:2px;font-size:15px;color:var(--muted);font-family:var(--fancy);font-style:italic;line-height:1.35;}",
    ".desk-group-rule{height:3px;background:linear-gradient(90deg,#a9801c,#d4af37,#ecd07e,#d4af37,rgba(169,128,28,0));border-radius:2px;margin:0 0 14px;}",
    ".desk-group > .member-grid{display:grid;gap:18px;}",
    "#deskSeason,#deskShare,#deskTravel,#deskLearn,#shareCard,#orientationCard{scroll-margin-top:88px;}",

    /* Officer desk variant of the same masthead: gold-washed parchment for
       the officer identity, and the illuminated group headers replace the
       old small uppercase section labels. */
    ".desk-hero.desk-officer{background:linear-gradient(180deg,#fffdf4,#f6ecd2);border-color:rgba(166,124,0,.5);}",
    ".desk-officer .desk-kicker{color:#7a5b00;}",
    ".desk-group-head h3{text-transform:none;opacity:1;}",
    "#hubOfficerLauncher .hub-officer-section{scroll-margin-top:88px;}",

  ].join("");

  var state = { officer: false, shopOnly: false, socialOnly: false, canViewPayments: false, canManageEvents: false, parade: null, hoursApproved: 0, membershipStatus: null, game: null, nextEvent: null, nextEvents: [], hubEvents: [], announcements: [] };
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

  function memberEventWhereHtml(ev) {
    var bits = [];
    if (ev.members_only) bits.push('<div class="meta">Members only</div>');
    if (ev.member_address) bits.push('<div class="meta">' + esc(ev.member_address) + '</div>');
    else if (ev.location) bits.push('<div class="meta">' + esc(ev.location) + '</div>');
    return bits.join("");
  }

  function renderHubMemberEvents(list) {
    var target = document.getElementById("hubMemberEventList");
    if (!target) return;
    var rows = list || [];
    if (!rows.length) {
      target.innerHTML = '<p class="empty">No upcoming Shamrock events just now. Check the public calendar for IKC listings.</p>';
      return;
    }
    target.innerHTML = rows.map(function (ev) {
      var when = "";
      if (ev.start_time) {
        var d = new Date(ev.start_time);
        when = isNaN(d.getTime()) ? String(ev.start_time) : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
      } else {
        when = "Date to be announced";
      }
      var addr = ev.member_address ? String(ev.member_address).trim() : "";
      var teaser = ev.location ? String(ev.location).trim() : "";
      var where = addr
        ? ('<div style="margin:4px 0 0;"><b>Address:</b> ' + esc(addr) + '</div>')
        : (teaser ? ('<div style="margin:4px 0 0;">' + esc(teaser) + '</div>') : "");
      var href = "event-signup.html?event=" + encodeURIComponent(ev.id || "");
      return '<div class="hub-event-row" style="margin:10px 0;">' +
        '<div style="flex:1;min-width:0;"><b>' + esc(ev.name || "Krewe event") + '</b>' +
        '<div class="muted">' + esc(when) + (ev.members_only ? " · Members only" : "") + '</div>' +
        where +
        (teaser && addr ? '<div class="muted" style="margin-top:2px;">Public note: ' + esc(teaser) + '</div>' : "") +
        '</div>' +
        '<div class="hub-appr-btns"><a class="btn btn-primary" href="' + href + '">RSVP</a></div></div>';
    }).join("");
  }

  function firstName() {
    var p = window.kosProfile || {};
    if (p.first_name) return String(p.first_name);
    var dn = (p.display_name || "").toString().trim();
    if (dn) return dn.split(/\s+/)[0];
    return "Member";
  }

  // Root-absolute so pills work even if the Hub URL has a nested path.
  var DOC_PAGES = {
    bylaws: "/assets/docs/bylaws.html",
    codeOfConduct: "/assets/docs/code-of-conduct.html",
    paradeRules: "/assets/docs/parade-rules.html"
  };

  function hubDocsPillsHtml(style) {
    return '<div class="hub-docs"' + (style ? ' style="' + style + '"' : "") + ">" +
      '<a href="' + DOC_PAGES.bylaws + '">Bylaws</a>' +
      '<a href="' + DOC_PAGES.codeOfConduct + '">Code of Conduct</a>' +
      '<a href="' + DOC_PAGES.paradeRules + '">Parade Rules</a>' +
      "</div>";
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
        // Reports belong on Officer desk only - never on member Home.
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
        else if (h.indexOf("share") !== -1) sec.setAttribute("data-hub", "parade");
        else if (h.indexOf("locker") !== -1) sec.setAttribute("data-hub", "parade");
        else if (h.indexOf("carpool") !== -1) sec.setAttribute("data-hub", "parade");
        else if (h.indexOf("van") !== -1) sec.setAttribute("data-hub", "parade");
        else if (h.indexOf("volunteer") !== -1 || h.indexOf("hours") !== -1) sec.setAttribute("data-hub", "parade");
        else if (h.indexOf("directory") !== -1) sec.setAttribute("data-hub", "krewe");
        else if (h.indexOf("document") !== -1) sec.setAttribute("data-hub", "parade");
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
      ["fun", "Craic Cup"],
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
      '<section class="app-card"><div class="app-head"><span class="ic">☘</span><div><h2>My Krewe</h2><small>Profile and member directory</small></div></div>' +
      '<div class="app-body">' +
      '<div class="hub-profile" id="hubProfileCard"><h3>Your profile</h3><p class="empty">Loading…</p></div>' +
      "</div></div></section>";

    var events = document.getElementById("hubEvents");
    events.innerHTML =
      '<section class="app-card"><div class="app-head"><span class="ic">📅</span><div><h2>Events and RSVPs</h2><small>Member addresses show here after you sign in</small></div></div>' +
      '<div class="app-body"><p>RSVP to krewe events, track attendance, and keep your calendar current.</p>' +
      '<div id="hubMemberEventList"><p class="empty">Loading events…</p></div>' +
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
    // Volunteer hours joins the parade grid; layoutMemberDesk() groups it
    // under "Get Season Ready" right after the Parade Ready card.
    if (give && give.firstChild) parade.insertBefore(give.firstChild, parade.firstChild);
    oldGrid.remove();
    relocateHours();
    layoutMemberDesk();
    ensureClaimCloversCard();
  }

  /* ---- Member desk layout: one desk, four labeled counters ----
     A member who taps Member desk should understand at a glance what lives
     here, so every everyday tool files under a labeled group with jump chips
     in an Irish-styled masthead. The flow reads top to bottom: get season
     ready, share your media for the public site, sort rides and gear, then
     learn and look things up. Cards keep their ids and internal wiring - only
     their position changes - and a card no group claims files in last, so
     future desk cards never vanish. */
  var DESK_GROUPS = [
    { id: "deskSeason", icon: "🎗️", chip: "Season checklist", title: "Get Season Ready",
      sub: "Dues, waiver, meeting, photo release, and your volunteer hours.",
      cards: ["prCard", "hubHoursCard"] },
    { id: "deskShare", icon: "📸", chip: "Share your media", title: "Share Your Media & Creativity",
      sub: "Photos and videos for the public site - an officer approves each one - plus artwork, poems, stories, and recipes.",
      cards: ["shareCard"] },
    { id: "deskTravel", icon: "🚐", chip: "Rides & locker", title: "Getting There & Your Gear",
      sub: "Carpools, seats on the krewe vans, and locker rentals.",
      cards: ["carpoolCard", "vanCard", "lockerCard"] },
    { id: "deskLearn", icon: "📜", chip: "Learn & documents", title: "Learn & Look Up",
      sub: "The new member orientation video and the governing documents.",
      cards: ["orientationCard", "docs"] }
  ];

  function layoutMemberDesk() {
    var grid = document.getElementById("hubParade");
    if (!grid || document.getElementById("deskHero")) return;
    var panel = grid.parentElement;
    if (!panel) return;

    var hero = document.createElement("div");
    hero.className = "desk-hero";
    hero.id = "deskHero";
    hero.innerHTML =
      '<p class="desk-kicker">Fáilte, a chara - welcome, friend</p>' +
      "<h2>☘ Your Member Desk</h2>" +
      "<p>Everything a member needs, on one desk: get Parade Ready and log your volunteer hours, " +
      "share your photos and videos for the public site (an officer approves each one before it goes live), " +
      "find a ride or a locker, and look anything up.</p>" +
      '<nav class="desk-nav" aria-label="Member desk sections">' +
      DESK_GROUPS.map(function (g) {
        return '<button type="button" data-desk-goto="' + g.id + '">' + g.icon + " " + g.chip + "</button>";
      }).join("") +
      "</nav>";
    panel.insertBefore(hero, grid);

    DESK_GROUPS.forEach(function (g) {
      var cards = g.cards.map(function (id) { return document.getElementById(id); })
        .filter(function (el) { return el && el.parentElement === grid; });
      if (!cards.length) return;
      var wrap = document.createElement("section");
      wrap.className = "desk-group";
      wrap.id = g.id;
      wrap.innerHTML =
        '<header class="desk-group-head"><span class="dg-ic" aria-hidden="true">' + g.icon + "</span>" +
        "<div><h3>" + g.title + '</h3><span class="dg-sub">' + g.sub + "</span></div></header>" +
        '<div class="desk-group-rule"></div>';
      var inner = document.createElement("div");
      inner.className = "member-grid";
      cards.forEach(function (el) { inner.appendChild(el); });
      wrap.appendChild(inner);
      grid.appendChild(wrap);
    });

    // Cards no group claimed keep working - they just file in after the groups.
    Array.prototype.slice.call(grid.children).forEach(function (el) {
      if (el.classList && el.classList.contains("desk-group")) return;
      grid.appendChild(el);
    });

    hero.querySelectorAll("[data-desk-goto]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        focusHubTarget(document.getElementById(btn.getAttribute("data-desk-goto")));
      });
    });
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
    if (!me) return '<span class="hub-chip">🎗️ Parade Ready · -</span>';
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
      '<div class="tag">☘ Our kindly competitive game of showing up</div>' +
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
      var loc = memberEventWhereHtml(ev);
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

  /* ---- Krewe Tidings (all-krewe announcements, member view) ---- */
  // The email HTML is reduced to plain paragraphs so the card renders safely
  // and consistently; the first paragraph gets the illuminated drop capital
  // (.dropcap in krewe.css, Cinzel Decorative) from the heritage pages.
  function annParagraphs(html) {
    var t = String(html || "")
      .replace(/<\s*(?:br|\/p|\/div|\/h[1-6]|\/li)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ");
    var ta = document.createElement("textarea");
    ta.innerHTML = t;
    t = ta.value;
    return t.split(/\n+/).map(function (p) {
      return p.replace(/\s+/g, " ").trim();
    }).filter(Boolean);
  }

  function annDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 10);
    return d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
  }

  function boardAnnouncementsHtml() {
    var list = state.announcements || [];
    if (!list.length) return "";
    var latest = list[0];
    var paras = annParagraphs(latest.body_html);
    if (!paras.length) paras = ["(No message text.)"];
    var body = paras.map(function (p, i) {
      return '<p' + (i === 0 ? ' class="dropcap"' : "") + ">" + esc(p) + "</p>";
    }).join("");
    var older = list.slice(1).map(function (m) {
      var op = annParagraphs(m.body_html).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
      return '<details class="hub-board-old"><summary>' + esc(m.subject || "Announcement") +
        ' <span class="hub-board-date">' + esc(annDate(m.created_at)) + "</span></summary>" + op + "</details>";
    }).join("");
    return '<section class="hub-board" aria-label="Announcements from the board">' +
      "<h3>📜 Krewe Tidings</h3>" +
      '<div class="hub-board-rule"></div>' +
      '<div class="hub-board-date">News from the Board</div>' +
      '<div class="hub-board-date">' + esc(annDate(latest.created_at)) +
      (latest.sender_name ? (" · from " + esc(latest.sender_name)) : "") + "</div>" +
      "<h4>" + esc(latest.subject || "Announcement") + "</h4>" +
      body + older +
      '<div class="hub-board-archive-wrap">' +
      (boardArchive.open
        ? '<div id="hubBoardArchive" aria-live="polite">' + boardArchiveInnerHtml() + "</div>"
        : '<button type="button" class="btn" id="hubBoardArchiveBtn">📜 See all announcements</button>' +
          '<div id="hubBoardArchive" hidden aria-live="polite"></div>') +
      "</div></section>";
  }

  /* Full archive of all-krewe announcements: every message officers email to
     the membership also lives here, so nothing is lost to the inbox. Loaded
     on demand (up to 100 via list_board_announcements); if the archive call
     fails we fall back to the announcements already on hand. State lives
     outside the card so background Home re-renders keep the archive open. */
  var boardArchive = { open: false, loading: false, list: null, fellBack: false };

  function boardArchiveListHtml(list) {
    return list.map(function (m) {
      var op = annParagraphs(m.body_html).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
      return '<details class="hub-board-old"><summary>' + esc(m.subject || "Announcement") +
        ' <span class="hub-board-date">' + esc(annDate(m.created_at)) +
        (m.sender_name ? (" · from " + esc(m.sender_name)) : "") + "</span></summary>" +
        (op || "<p>(No message text.)</p>") + "</details>";
    }).join("");
  }

  function boardArchiveInnerHtml() {
    if (boardArchive.loading) return '<p class="empty">Loading the announcement archive…</p>';
    var list = boardArchive.list || [];
    if (!list.length) return '<p class="empty">No announcements yet.</p>';
    return '<h4 style="margin-top:14px;">Every announcement (' + list.length + ")</h4>" +
      boardArchiveListHtml(list) +
      (boardArchive.fellBack
        ? '<p class="empty">Showing the announcements already loaded — the full archive needs a connection. Try again in a moment.</p>'
        : "");
  }

  function paintBoardArchive() {
    var box = document.getElementById("hubBoardArchive");
    var btn = document.getElementById("hubBoardArchiveBtn");
    if (btn) btn.hidden = boardArchive.open;
    if (!box) return;
    box.hidden = !boardArchive.open;
    box.innerHTML = boardArchive.open ? boardArchiveInnerHtml() : "";
  }

  async function loadBoardArchive() {
    boardArchive.open = true;
    boardArchive.loading = true;
    paintBoardArchive();
    var list = null;
    var client = window.__kosSb || null;
    if (client) {
      try {
        var res = await client.rpc("list_board_announcements", { p_limit: 100 });
        var data = (res && res.data) || {};
        if (!res.error && data.ok && Array.isArray(data.messages)) list = data.messages;
      } catch (e) { /* fall back below */ }
    }
    boardArchive.fellBack = !list;
    boardArchive.list = list || state.announcements || [];
    boardArchive.loading = false;
    paintBoardArchive();
  }

  function hubAppName() {
    return (window.KOS_HUB_APP_NAME || "Shamrock").toString();
  }

  function isHubStandalone() {
    try {
      if (window.navigator && window.navigator.standalone) return true;
      return !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
    } catch (e) {
      return false;
    }
  }

  function installCardHtml() {
    var name = hubAppName();
    if (isHubStandalone()) {
      return '<section class="hub-install" id="hubInstallCard">' +
        "<h3>You are using " + esc(name) + " from your Home Screen</h3>" +
        "<p>This is the same Member Hub. It updates with the website. Tickets and shop payments stay on Zeffy.</p>" +
        "</section>";
    }
    return '<section class="hub-install" id="hubInstallCard">' +
      "<h3>Add " + esc(name) + " to your Home Screen</h3>" +
      "<p>This is the Member Hub you already use, as an icon on your phone. It is not an App Store or Play Store app. It opens here, full screen, and it updates when the website updates.</p>" +
      '<ol class="hub-install-steps">' +
      "<li><b>iPhone:</b> open this page in Safari, tap Share, then Add to Home Screen. Keep the name " + esc(name) + ".</li>" +
      "<li><b>Android:</b> Chrome can offer Install on this page. You can also open the Chrome menu and choose Install app.</li>" +
      "</ol>" +
      '<p class="hub-install-note">Tickets and shop payments stay on Zeffy. There are no push alerts.</p>' +
      "</section>";
  }

  /* Little Celtic line icons for the Quick links tiles. Stroke-only SVGs in
     currentColor so the disc can invert to green-on-gold on hover. */
  var QK_ICONS = {
    // Trinity knot (three interlaced rings) - the krewe, together.
    trinity: '<circle cx="12" cy="8.6" r="4.6"/><circle cx="8.2" cy="15.2" r="4.6"/><circle cx="15.8" cy="15.2" r="4.6"/>',
    // Irish harp - music, gatherings, events.
    harp: '<path d="M6.5 3.5c7.2.3 11 4.5 11 11.2v5.8"/><path d="M6.5 3.5v17"/><path d="M6.5 20.5h11"/><path d="M9.6 8.2v12.3"/><path d="M12.6 10.4v10.1"/><path d="M15 13.2v7.3"/>',
    // Celtic shield - Parade Ready, waiver, dues: your standing, protected.
    shield: '<path d="M12 3l7 2.8v5.4c0 4.9-2.9 8-7 9.8-4.1-1.8-7-4.9-7-9.8V5.8Z"/><path d="M12 7.5v7"/><path d="M8.5 11h7"/>',
    // Chalice - the Craic Cup itself.
    chalice: '<path d="M7 4h10v3.5a5 5 0 0 1-10 0Z"/><path d="M7 5H4.5a3.2 3.2 0 0 0 3.1 3.8"/><path d="M17 5h2.5a3.2 3.2 0 0 1-3.1 3.8"/><path d="M12 12.5V17"/><path d="M8 20h8"/><path d="M9.5 17h5"/>',
    // Celtic high cross - the official governing documents.
    cross: '<circle cx="12" cy="9.5" r="4.2"/><path d="M12 3v18"/><path d="M5.5 9.5h13"/><path d="M9 20.5h6"/>',
    // Quill - officers writing the calendar.
    quill: '<path d="M19.5 4.5c-5.5.2-9.6 3-11.6 8.2L6.2 17l4.2-1.7c5.2-2 8-6.1 8.2-11.6Z"/><path d="M5 19.5 12.5 12"/>',
    // Triskele (triple spiral) - creativity in motion: Share your media.
    triskele: '<path d="M12 12c0-3.6 2.7-6.3 6.1-6.3"/><path d="M12 12c3.1 1.8 3.8 5.5 2 8.4"/><path d="M12 12c-3.1 1.8-6.4.8-8.1-2.1"/><circle cx="12" cy="12" r="1.7"/>',
    // Shamrock for the card heading.
    shamrock: '<circle cx="12" cy="7.4" r="3.2"/><circle cx="7.9" cy="12.8" r="3.2"/><circle cx="16.1" cy="12.8" r="3.2"/><path d="M12 13c.3 3.2-.5 5.6-2.6 7.5"/>'
  };

  function qkIcon(name) {
    return '<span class="qk-ic" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      (QK_ICONS[name] || QK_ICONS.shamrock) +
      "</svg></span>";
  }

  /* ---- Welcome hero: the home page opens with the member, not the game.
     Greeting, standing chips, and the season checklist up top; the Craic
     Cup keeps its own clearly-labeled card further down the stack. */
  function welcomeDeskHtml() {
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
    var line = "Parade Ready, volunteer hours, media sharing, rides, and your locker - all on one desk.";
    if (ready && !needsProfile && (state.hoursApproved || 0) >= 1) {
      line = "You are set for the season. The desk still has your rides, locker, and media sharing.";
    } else if (bits.length) {
      line = "Still open: " + bits.join(", ") + ".";
    }
    var profileBtn = needsProfile
      ? '<button type="button" class="btn" id="hubOpenProfile" style="margin-top:8px;width:100%;">Complete My Krewe profile</button>'
      : '';
    return '<div class="hub-welcome" id="hubWelcomeCard">' +
      '<p class="hub-hello">☘ Fáilte, a chara - welcome, friend</p>' +
      '<h2>Welcome home, ' + esc(firstName() || 'friend') + '</h2>' +
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
    function quickTile(goto, icon, title, sub) {
      return '<button type="button" class="hub-action" data-hub-goto="' + goto + '">' +
        qkIcon(icon) +
        '<span class="qk-copy"><b>' + title + "</b><span>" + sub + "</span></span>" +
        "</button>";
    }
    var findCards =
      '<div class="hub-find">' +
      '<h3>' + qkIcon("shamrock") + 'Quick links</h3>' +
      '<p class="hub-find-sub">Tap a tile to jump straight there.</p>' +
      '<div class="hub-find-grid">' +
      quickTile("directory", "trinity", "My Krewe", "Your member directory - faces and profiles of the whole krewe.") +
      quickTile("events", "harp", "Events &amp; RSVPs", "See what's coming up and RSVP. Attendance feeds Parade Ready.") +
      quickTile("desk", "shield", "Member desk", "Parade Ready, volunteer hours, rides, your locker, and media sharing.") +
      quickTile("share", "triskele", "Share your media", "Upload photos &amp; videos for the public site - an officer approves them - plus artwork, poems &amp; recipes.") +
      quickTile("fun", "chalice", "Craic Cup", "Claim clovers, check the leaderboard, and join the fun.") +
      '<div class="hub-action" id="docsHome" style="cursor:default">' +
      qkIcon("cross") +
      '<div class="qk-copy">' +
      '<b><a href="#docs">Documents</a></b>' +
      '<span>Governing documents for members and officers. Open bylaws and the Code of Conduct in-Hub.</span>' +
      hubDocsPillsHtml("margin-top:10px;") +
      '<p style="margin:10px 0 0;"><a href="#docs">All Documents</a></p>' +
      '<p style="margin:10px 0 0;"><button type="button" class="btn" data-hub-goto="docs">Open Documents card</button></p>' +
      "</div></div>" +
      ((state.officer || state.canManageEvents)
        ? quickTile("event-studio", "quill", "Add or edit events &amp; calendar", "Open Event Studio to change dates (Basket Social and more) without a developer.")
        : '') +
      '</div></div>';
    // Only refresh the welcome strip - never wipe the beautiful card grid below.
    // Reading order, top to bottom: greet the member and show their season
    // standing, then news from the board, then the officer's own desk, then
    // the Craic Cup game, then navigation, and housekeeping last.
    top.innerHTML = welcomeDeskHtml() + boardAnnouncementsHtml() + officerCard + craicHeroHtml() + findCards + installCardHtml();

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
        else if (go === "docs") revealDocsCard();
        else if (go === "events") gotoHubTabFromHome("events", "events");
        else if (go === "desk") gotoHubTabFromHome("parade", "desk");
        else if (go === "share") revealShareGroup();
        else if (go === "fun") gotoHubTabFromHome("fun", "fun");
      });
    });
    var op = document.getElementById("hubOpenProfile");
    if (op) op.addEventListener("click", function () {
      if (window.kosOpenProfileStage) window.kosOpenProfileStage();
    });
    var archBtn = document.getElementById("hubBoardArchiveBtn");
    if (archBtn) archBtn.addEventListener("click", function () { loadBoardArchive(); });
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
  window.kosRevealDocs = revealDocsCard;
  window.kosOpenDirectory = openDirectoryFromHome;
  window.kosOpenEventStudio = openEventStudioFromHome;

  function focusHubTarget(el, focusEl) {
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!focusEl) return;
    try { focusEl.focus({ preventScroll: true }); } catch (fe) {
      try { focusEl.focus(); } catch (fe2) {}
    }
  }

  function gotoHubTabFromHome(tab, hash) {
    try { history.replaceState(null, "", location.pathname + "#" + hash); } catch (e) {}
    showTab(tab);
  }

  function revealShareGroup() {
    try { history.replaceState(null, "", location.pathname + "#share"); } catch (e) {}
    showTab("parade", { skipScroll: true });
    setTimeout(function () {
      focusHubTarget(document.getElementById("deskShare") || document.getElementById("shareCard"));
    }, 80);
  }

  function revealDocsCard() {
    try { history.replaceState(null, "", location.pathname + "#docs"); } catch (e) {}
    showTab("parade", { skipScroll: true });
    setTimeout(function () {
      focusHubTarget(document.getElementById("docs"));
    }, 80);
  }

  function openDirectoryFromHome() {
    try { history.replaceState(null, "", location.pathname + "#directory"); } catch (e) {}
    showTab("krewe", { skipScroll: true });
    setTimeout(function () {
      var card = document.getElementById("hubMemberDirectory") || document.getElementById("dirGrid");
      focusHubTarget(card, document.getElementById("dirSearch"));
    }, 80);
  }

  function openEventStudioFromHome() {
    if (!state.officer && !state.canManageEvents) return;
    try { history.replaceState(null, "", location.pathname + "#event-studio"); } catch (e) {}
    showTab("officer", { skipScroll: true });
    try { wireOfficerDeskPicker(); } catch (e) {}
    openOfficerTool("tool:hubEventStudio", true);
    setTimeout(function () {
      var card = document.getElementById("hubEventStudio");
      focusHubTarget(card, document.getElementById("hubEventName"));
    }, 80);
  }

  var roleFixture = null;

  /* Test fixture: inject announcements and re-render the Home tab, mirroring
     __kosHubSetRole below. Lets the offline Playwright suite exercise the
     Krewe Tidings card and its archive without a live database. */
  window.__kosHubSetAnnouncements = function (list) {
    state.announcements = Array.isArray(list) ? list : [];
    renderHome();
  };

  window.__kosHubSetRole = function (flags) {
    flags = flags || {};
    roleFixture = flags;
    if ("officer" in flags) state.officer = !!flags.officer;
    if ("canManageEvents" in flags) state.canManageEvents = !!flags.canManageEvents;
    syncOfficerChip();
    renderHome();
    if (state.officer || state.canManageEvents) {
      try { wireOfficerDeskPicker(); } catch (e) {}
    }
  };

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
    var title = (p.officer_title || "").toString().trim();
    who.classList.add("hub-signed-pill");
    if (!who.querySelector(".dot")) {
      who.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="hub-signed-label"></span>';
    }
    var label = who.querySelector(".hub-signed-label");
    if (label) {
      if (nm && title) label.textContent = "Signed in as " + nm + " · " + title;
      else if (nm) label.textContent = "Signed in as " + nm;
      else label.textContent = "Signed in";
    }
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
    if (roleFixture) {
      if ("officer" in roleFixture) state.officer = !!roleFixture.officer;
      if ("canManageEvents" in roleFixture) state.canManageEvents = !!roleFixture.canManageEvents;
    }
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
      var ann = await client.rpc("list_board_announcements", { p_limit: 3 });
      var annPayload = ann.data || {};
      state.announcements = (annPayload.ok && Array.isArray(annPayload.messages)) ? annPayload.messages : [];
    } catch (e) { state.announcements = []; }
    try {
      var evSelect = "id,name,start_time,location,member_address,members_only,status,source";
      var evs = await client.from("events")
        .select(evSelect)
        .eq("source", "krewe")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(20);
      if (evs.error) {
        evs = await client.from("events")
          .select("id,name,start_time,location,status,source")
          .eq("source", "krewe")
          .gte("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(20);
      }
      var list = (evs.data || []).filter(function (e) {
        var st = String(e.status || "published").toLowerCase();
        var src = String(e.source || "").toLowerCase();
        return src === "krewe" && (st === "published" || st === "live");
      });
      state.hubEvents = list.slice(0, 12);
      renderHubMemberEvents(state.hubEvents);
      var open = list.slice();
      var meId = (window.kosProfile || {}).member_id || null;
      if (meId && open.length) {
        try {
          var signed = await client.from("event_signups")
            .select("event_id,status")
            .eq("member_id", meId)
            .in("status", ["registered", "confirmed", "attended", "waitlisted"]);
          var taken = {};
          (signed.data || []).forEach(function (r) { if (r.event_id) taken[r.event_id] = true; });
          open = open.filter(function (e) { return !taken[e.id]; });
        } catch (signupErr) { /* keep unfiltered krewe list */ }
      }
      state.nextEvents = open.slice(0, 4);
      state.nextEvent = state.nextEvents[0] || null;
    } catch (e) {
      state.nextEvents = [];
      state.nextEvent = null;
      state.hubEvents = [];
      renderHubMemberEvents([]);
    }
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
    var wantDocs = false;
    var wantShare = false;
    try {
      var hash = (location.hash || "").replace(/^#/, "").toLowerCase();
      if (wantHours) {
        hoursDeepLink = true;
        saved = "parade";
      } else if (hash === "parade" || hash === "desk") saved = "parade";
      else if (hash === "officer") saved = "officer";
      else if (hash === "krewe" || hash === "directory") saved = "krewe";
      else if (hash === "docs") { saved = "parade"; wantDocs = true; }
      else if (hash === "share") { saved = "parade"; wantShare = true; }
      else if (hash === "events") saved = "events";
      else if (hash === "fun") saved = "fun";
      else if (hash === "home") saved = TAB_HOME;
      else {
        // Always land on Home after login/refresh unless the URL asks for a tab.
        saved = TAB_HOME;
      }
    } catch (e) {
      if (wantHours) saved = "parade";
    }
    if (saved === "officer" && !state.officer && !state.canManageEvents) saved = TAB_HOME;
    try {
      var already = document.querySelector("[data-hub-panel].hub-on");
      var alreadyTab = already && already.getAttribute("data-hub-panel");
      if (alreadyTab && alreadyTab !== TAB_HOME) saved = alreadyTab;
    } catch (e) {}

    syncSignedInPill();
    syncOfficerChip();

    // One settle: pick the tab once, skip scroll on first paint, then optionally
    // deep-link hours after layout is stable (prevents Home <-> desk snap).
    showTab(saved, { skipScroll: true });
    if (saved !== "hub") renderHome();
    if (wantHours) {
      setTimeout(function () { openVolunteerHoursForm(false); }, 280);
    } else if (wantDocs) {
      setTimeout(function () { revealDocsCard(); }, 280);
    } else if (wantShare) {
      setTimeout(function () { revealShareGroup(); }, 280);
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
      '<p style="color:var(--muted);font-size:14px;margin:8px 0 0;">Fellow members see your birthday and anniversary as month and day only - never the year.</p>';
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
    if (!client) { if (msg) msg.textContent = "Still connecting - try again in a moment."; return; }
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
    { code: "attend_ikc_event", label: "Attend another IKC krewe's event", clovers: 25 },
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
    var cup = fun.querySelector(".game-head");
    if (cup) fun.insertBefore(card, cup.nextSibling);
    else fun.appendChild(card);
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
      '<p style="margin:0 0 8px;font-size:16px;color:var(--muted);">Pick an activity. Officers review and credit Clovers to your Craic Cup. RSVP to an event is already automatic, so it is not listed here. Went to another IKC krewe’s event? That one is worth <b>+25 🍀</b> - supporting the krewe family counts.</p>' +
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
        var titles = (q.answers && q.answers.titles && q.answers.titles.length)
          ? q.answers.titles.join(" · ")
          : (q.requested_roles || []).join(", ");
        var extra = [];
        if (q.answers && q.answers.committee) extra.push("Committee: " + esc(q.answers.committee));
        if (q.answers && q.answers.committees && q.answers.committees.length > 1) {
          extra.push("Committees: " + esc(q.answers.committees.join(", ")));
        }
        if (q.answers && q.answers.note) extra.push("Note: " + esc(q.answers.note));
        html += '<div class="hub-appr">' +
          '<div><b>' + esc(q.full_name || q.email) + '</b> <span class="muted">' + esc(q.email) + '</span>' +
          '<div class="muted">Requests: <b>' + esc(titles) + '</b>' + (q.linked ? " · matches the roster" : " · <b>no roster match</b>") + '</div>' +
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
      '<div class="app-head"><span class="ic">💵</span><div><h2>Payments</h2><small>Treasurer &amp; board - online payments recorded automatically</small></div></div>' +
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
    if (window.kosQR) kosQR.paint(slot, url, label);
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
      '<option value="online">Online</option>' +
      '<option value="fundraiser">Fundraiser</option><option value="other">Other</option></select></div>' +
      '<div><label for="hubEventStart">Start time *</label><input id="hubEventStart" type="datetime-local" required /></div>' +
      '<div><label for="hubEventEnd">End time</label><input id="hubEventEnd" type="datetime-local" /></div>' +
      '<div><label for="hubEventRegCloses">Close registrations on</label><input id="hubEventRegCloses" type="datetime-local" /></div>' +
      '<div class="wide" style="margin-top:-4px;"><p style="font-size:15px;color:var(--muted);margin:0 0 6px;line-height:1.4;">Optional. After this date/time, public signup shows Registration closed and blocks new RSVPs and ticket checkout. Leave blank to stay open. You can edit address, dates, and this close date. Saving stores a draft and does not publish.</p></div>' +
      '<div class="wide"><label for="hubEventLocation">Public location teaser</label><input id="hubEventLocation" placeholder="Members home, Tampa" />' +
      '<p class="hub-opt-hint" style="margin-top:6px;">Safe for the public site. For a house party, keep this vague. Do not put a street address here.</p></div>' +
      '<div class="wide"><label for="hubEventMemberAddress">Private / member address</label><input id="hubEventMemberAddress" placeholder="Full street address" autocomplete="off" />' +
      '<p class="hub-opt-hint" style="margin-top:6px;">Full address for signed-in members in the Member Hub and the RSVP confirmation email. Never shown on public pages.</p></div>' +
      '<div><label for="hubEventCapacity">Capacity</label><input id="hubEventCapacity" type="number" min="0" step="1" /></div>' +
      '<div class="wide"><label for="hubEventDescription">Description</label><textarea id="hubEventDescription"></textarea></div></div>' +
      '<div class="hub-event-checks"><label><input type="checkbox" id="hubEventPublic" checked /> Public event</label>' +
      '<label><input type="checkbox" id="hubEventMembersOnly" /> Members only</label>' +
      '<label><input type="checkbox" id="hubEventMandatory" /> Mandatory meeting</label>' +
      '<label><input type="checkbox" id="hubEventFeatured" /> Featured Event</label></div>' +
      '<p class="hub-opt-hint" style="margin:-4px 0 10px;">Members only: public pages show title, date, and the teaser, plus a sign-in note. Uncheck Public event to hide it from the public calendar. The street address stays off public pages either way.</p>' +
      '<div class="hub-event-grid">' +
      '<div><label for="hubEventStatus">Status</label><select id="hubEventStatus"><option value="draft">Draft</option><option value="cancelled">Cancelled</option></select></div>' +
      '<div><label for="hubEventTicketLabel">Ticket label</label><input id="hubEventTicketLabel" placeholder="e.g. Member ticket" /></div>' +
      '<div><label for="hubEventTicketPrice">Ticket price (dollars)</label><input id="hubEventTicketPrice" type="number" min="0" step="0.01" placeholder="0.00" /></div>' +
      '<div><label for="hubEventPaymentUrl">Ticket payment URL</label><input id="hubEventPaymentUrl" type="url" placeholder="https://www.zeffy.com/en-US/ticketing/..." /></div>' +
      '<div class="wide" style="grid-column:1/-1;"><div class="hub-event-checks" style="margin:0;">' +
      '<label><input type="checkbox" id="hubEventCollectGuests" checked /> Ask for guest count</label>' +
      '<label><input type="checkbox" id="hubEventCollectGuestNames" checked /> Ask for guest names</label></div>' +
      '<p style="font-size:15px;color:var(--muted);margin:6px 0 0;line-height:1.4;">Guest fields default on. Uncheck to hide them on public signup.</p></div>' +
      '<div class="wide hub-event-optional" id="hubEventRaffleBox">' +
      '<h4>Raffle tickets (optional)</h4>' +
      '<p class="hub-opt-hint">Uses the existing Raffles tool (raffle_events) plus signup qty. Uncheck to leave this event without raffle tickets. If a price is needed, enter it. Do not leave a made-up amount.</p>' +
      '<div class="hub-event-checks" style="margin:0 0 8px;">' +
      '<label><input type="checkbox" id="hubEventCollectRaffle" /> Offer raffle tickets</label></div>' +
      '<div class="hub-event-optional-fields" id="hubEventRaffleFields" hidden>' +
      '<div><label for="hubEventRaffleOptions">Raffle qty choices</label><input id="hubEventRaffleOptions" placeholder="0,1,5,15" value="0,1,5,15" /></div>' +
      '<div><label for="hubEventRafflePrice">Raffle ticket price (dollars)</label><input id="hubEventRafflePrice" type="number" min="0" step="0.01" placeholder="Officer enters the price" /></div>' +
      '<div style="grid-column:1/-1;"><label for="hubEventRaffleEvent">Attach existing raffle</label>' +
      '<select id="hubEventRaffleEvent"><option value="">None (qty only, or enter a price to create one)</option></select>' +
      '<p class="hub-opt-hint" style="margin-top:6px;">Qty is saved with the signup. A price or an existing raffle links raffle_events.ticket_price. There is no hardcoded dollar amount.</p></div></div></div>' +
      '<div class="wide hub-event-optional" id="hubEventMealBox">' +
      '<h4>Meal choice (optional)</h4>' +
      '<p class="hub-opt-hint">Off unless you turn it on. Members only see meal choices on events that have them.</p>' +
      '<div class="hub-event-checks" style="margin:0 0 8px;">' +
      '<label><input type="checkbox" id="hubEventCollectMeals" /> Ask members to choose a meal</label></div>' +
      '<div id="hubEventMealFields" hidden>' +
      '<label for="hubEventMealOptions">Meal options (one per line)</label>' +
      '<textarea id="hubEventMealOptions" placeholder="Chicken piccata&#10;Vegetarian pasta&#10;Kids meal"></textarea>' +
      '</div></div>' +
      '<div class="wide hub-event-optional" id="hubEventOnlineBox">' +
      '<h4>Online meeting (optional)</h4>' +
      '<p class="hub-opt-hint">When this is an online event, save the open meeting join link. Signup emails that link only to the member who just registered.</p>' +
      '<div class="hub-event-checks" style="margin:0 0 8px;">' +
      '<label><input type="checkbox" id="hubEventOnline" /> This is an online event</label></div>' +
      '<div id="hubEventOnlineFields" hidden>' +
      '<label for="hubEventMeetingUrl">Meeting join URL</label>' +
      '<input id="hubEventMeetingUrl" type="url" inputmode="url" autocomplete="url" placeholder="https://..." />' +
      '</div></div>' +
      '<div class="wide hub-event-optional" id="hubEventEmailsBox">' +
      '<h4>Scheduled krewe emails (optional)</h4>' +
      '<p class="hub-opt-hint">Queue up to three automatic emails to active members about this event: an announcement, a buy-your-tickets reminder, and a last-call warning sent two days before registration closes. Nothing sends while the event is a draft; an email that comes due goes out shortly after you publish. Save the event to store the schedule.</p>' +
      '<div class="hub-event-checks" style="margin:0 0 8px;">' +
      '<label><input type="checkbox" id="hubEventEmails" /> Schedule krewe emails for this event</label></div>' +
      '<div id="hubEventEmailFields" hidden>' +
      '<div class="hub-event-checks" style="margin:0 0 8px;">' +
      '<label><input type="checkbox" id="hubEventEmailAnnounce" /> 1) Announcement email</label></div>' +
      '<div class="hub-event-optional-fields" id="hubEventEmailAnnounceFields" hidden>' +
      '<div><label for="hubEventEmailAnnounceAt">Send announcement on</label><input id="hubEventEmailAnnounceAt" type="datetime-local" /></div>' +
      '<div><label for="hubEventEmailAnnounceSubject">Subject (optional)</label><input id="hubEventEmailAnnounceSubject" placeholder="New Krewe event: …" /></div></div>' +
      '<div class="hub-event-checks" style="margin:8px 0 8px;">' +
      '<label><input type="checkbox" id="hubEventEmailTicket" /> 2) Buy-your-tickets reminder</label></div>' +
      '<div class="hub-event-optional-fields" id="hubEventEmailTicketFields" hidden>' +
      '<div><label for="hubEventEmailTicketAt">Send reminder on</label><input id="hubEventEmailTicketAt" type="datetime-local" /></div>' +
      '<div><label for="hubEventEmailTicketSubject">Subject (optional)</label><input id="hubEventEmailTicketSubject" placeholder="Reminder: get your tickets" /></div>' +
      '<div style="grid-column:1/-1;"><p class="hub-opt-hint" style="margin:0;">Skips members who already paid for this event.</p></div></div>' +
      '<div class="hub-event-checks" style="margin:8px 0 8px;">' +
      '<label><input type="checkbox" id="hubEventEmailClosing" /> 3) Registration-closing warning</label></div>' +
      '<div class="hub-event-optional-fields" id="hubEventEmailClosingFields" hidden>' +
      '<div style="grid-column:1/-1;"><p class="hub-opt-hint" style="margin:0 0 6px;" id="hubEventEmailClosingWhen">Sends automatically two days before the &ldquo;Close registrations on&rdquo; date above. Set that date first to use this email.</p></div>' +
      '<div><label for="hubEventEmailClosingSubject">Subject (optional)</label><input id="hubEventEmailClosingSubject" placeholder="Last call: registration closes soon" /></div>' +
      '<div style="grid-column:1/-1;"><p class="hub-opt-hint" style="margin:0;">Skips members who already signed up for this event.</p></div></div>' +
      '<p class="hub-event-msg" id="hubEventEmailStatus" aria-live="polite" style="margin:6px 0 0;"></p>' +
      '</div></div>' +
      '<div class="wide"><label for="hubEventFlyerUrl">Event image / PDF URL</label><input id="hubEventFlyerUrl" type="url" placeholder="https://… or upload a file below" /></div>' +
      '<div class="wide"><label for="hubEventFlyerFile">Upload event image or PDF</label>' +
      '<input id="hubEventFlyerFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" />' +
      '<p class="hub-flyer-note" id="hubEventFlyerNote" aria-live="polite">Upload fills the URL above. Then press Save event to attach it. Published public events show on the Events page. Check Featured Event to pin one in the Featured spot (only one at a time).</p>' +
      '<div class="hub-flyer-preview" id="hubEventFlyerPreview"></div>' +
      '<button class="btn" type="button" id="hubEventFlyerClear" style="margin-top:8px;">Clear image / PDF</button></div></div>' +
      '<p style="font-size:15px;color:var(--muted);margin:10px 0 0;">For paid tickets, create a Zeffy ticketing campaign and paste the public share link here. Sign me up / RSVP will open that checkout. Save stores a draft and does not publish. After a successful save, review the saved name, date and time, location, and ticket price. Publish appears only after you confirm those details. Cancel that review and the event is not published and nobody is notified. If the event was already public, saving moves it back to a draft until you publish again. Each paid event needs its own Zeffy link.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;"><button class="btn btn-primary" type="submit" id="hubEventSave">☘ Save event</button>' +
      '<button class="btn btn-primary" type="button" id="hubEventPublish" hidden style="display:none">Publish</button>' +
      '<button class="btn" type="button" id="hubEventNew">New / clear</button>' +
      '<button class="btn btn-danger" type="button" id="hubEventDelete" hidden style="display:none">Delete permanently</button></div>' +
      '<p class="hub-flyer-note" id="hubEventDeleteHint" hidden>To hide this event without removing it, set Status to Cancelled. Delete permanently is only for mistaken events.</p>' +
      '<p class="hub-event-msg" id="hubEventMsg" aria-live="polite"></p></form>' +
      eventDeletePanelHtml() + '</div>';
  }

  function eventDeletePanelHtml() {
    return '<div class="hub-event-delete-panel" id="hubEventDeletePanel" hidden>' +
      '<h4>Delete this event permanently?</h4>' +
      '<p id="hubEventDeleteSummary"></p>' +
      '<p>This removes the event from Event Studio and the public calendar. RSVPs for this event are deleted. Payment records stay; the event link on them is cleared. Linked raffles are unlinked, not deleted. Cancelled status hides an event without destroying it.</p>' +
      '<label for="hubEventDeleteTyped">Type the event name or Delete permanently to confirm</label>' +
      '<input id="hubEventDeleteTyped" autocomplete="off" />' +
      '<div class="hub-appr-btns" style="margin-top:10px;">' +
      '<button class="btn" type="button" id="hubEventDeleteCancel">Cancel</button>' +
      '<button class="btn btn-danger" type="button" id="hubEventDeleteGo" disabled>Delete permanently</button></div>' +
      '<p class="hub-event-msg" id="hubEventDeleteErr" aria-live="polite"></p></div>';
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

  var eventRaffles = [];
  var pendingDelete = null;

  function showEl(id, on) {
    var el = document.getElementById(id);
    if (!el) return;
    if (on) { el.hidden = false; el.style.display = ""; }
    else { el.hidden = true; el.style.display = "none"; }
  }

  function fillRaffleEventSelect(selectedId) {
    var sel = document.getElementById("hubEventRaffleEvent");
    if (!sel) return;
    var html = '<option value="">None (qty only, or enter a price to create one)</option>';
    eventRaffles.forEach(function (r) {
      if (!r || !r.id) return;
      var label = (r.name || "Raffle") + (r.is_active === false ? " (inactive)" : "");
      if (r.ticket_price != null && r.ticket_price !== "") label += " · $" + Number(r.ticket_price).toFixed(2);
      html += '<option value="' + esc(r.id) + '"' + (String(r.id) === String(selectedId || "") ? " selected" : "") + ">" + esc(label) + "</option>";
    });
    sel.innerHTML = html;
    if (selectedId) sel.value = selectedId;
  }

  // ---- Scheduled krewe emails: announcement / ticket reminder / closing warning ----
  var eventStudioClient = null;
  var eventEmailHadRows = false;
  var EVENT_EMAIL_KINDS = {
    announcement: { check: "hubEventEmailAnnounce", at: "hubEventEmailAnnounceAt", subject: "hubEventEmailAnnounceSubject", label: "Announcement" },
    ticket_reminder: { check: "hubEventEmailTicket", at: "hubEventEmailTicketAt", subject: "hubEventEmailTicketSubject", label: "Ticket reminder" },
    closing_warning: { check: "hubEventEmailClosing", at: null, subject: "hubEventEmailClosingSubject", label: "Closing warning" }
  };

  function syncClosingEmailHint() {
    var hint = document.getElementById("hubEventEmailClosingWhen");
    if (!hint) return;
    var fallback = 'Sends automatically two days before the “Close registrations on” date above. Set that date first to use this email.';
    var rc = document.getElementById("hubEventRegCloses");
    var raw = rc ? rc.value : "";
    var d = raw ? new Date(raw) : null;
    if (!d || isNaN(d.getTime())) { hint.textContent = fallback; return; }
    var sendAt = new Date(d.getTime() - 2 * 24 * 60 * 60 * 1000);
    hint.textContent = "Sends automatically two days before registrations close: " +
      sendAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) + ".";
  }

  function resetEventEmailFields() {
    eventEmailHadRows = false;
    var master = document.getElementById("hubEventEmails");
    if (master) master.checked = false;
    Object.keys(EVENT_EMAIL_KINDS).forEach(function (kind) {
      var m = EVENT_EMAIL_KINDS[kind];
      var check = document.getElementById(m.check); if (check) check.checked = false;
      if (m.at) { var at = document.getElementById(m.at); if (at) at.value = ""; }
      var subject = document.getElementById(m.subject); if (subject) subject.value = "";
    });
    var status = document.getElementById("hubEventEmailStatus");
    if (status) status.textContent = "";
  }

  function emailScheduleNotes(rows) {
    var notes = [];
    (rows || []).forEach(function (row) {
      var m = EVENT_EMAIL_KINDS[row.email_kind];
      if (!m || row.status === "cancelled") return;
      if (row.status === "sent") {
        notes.push(m.label + " email sent " + eventLocalDisplay(row.sent_at) +
          (row.recipient_count != null ? " to " + row.recipient_count + " members." : "."));
      } else {
        notes.push(m.label + " email scheduled for " + eventLocalDisplay(row.send_at) + ".");
      }
    });
    return notes;
  }

  async function loadEventEmailSchedule(client, eventId) {
    var status = document.getElementById("hubEventEmailStatus");
    try {
      var res = await client.rpc("officer_list_event_scheduled_emails", { p_event_id: eventId });
      if (res.error) throw res.error;
      var data = res.data || {};
      if (data.ok === false) throw new Error(data.message || "Not authorized.");
      var rows = Array.isArray(data.emails) ? data.emails : [];
      // The officer may have opened a different event while this loaded.
      var idEl = document.getElementById("hubEventId");
      if (!idEl || String(idEl.value) !== String(eventId)) return;
      var live = rows.filter(function (row) { return row.status !== "cancelled"; });
      eventEmailHadRows = rows.length > 0;
      if (live.length) {
        var master = document.getElementById("hubEventEmails");
        if (master) master.checked = true;
      }
      live.forEach(function (row) {
        var m = EVENT_EMAIL_KINDS[row.email_kind];
        if (!m) return;
        var check = document.getElementById(m.check); if (check) check.checked = true;
        if (m.at) { var at = document.getElementById(m.at); if (at) at.value = eventLocalInput(row.send_at); }
        var subject = document.getElementById(m.subject); if (subject) subject.value = row.subject || "";
      });
      if (status) status.textContent = emailScheduleNotes(rows).join(" ");
      syncOptionalEventFields();
    } catch (e) {
      // Schedule RPC missing or unreachable; the rest of the form still works.
      if (status) status.textContent = "";
    }
  }

  async function saveEventEmailSchedule(client, eventId, cfg) {
    function value(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
    if (!cfg.emailsOn && !eventEmailHadRows) return "";
    var status = document.getElementById("hubEventEmailStatus");
    try {
      var res = await client.rpc("officer_set_event_scheduled_emails", { p: {
        event_id: eventId,
        announcement: {
          enabled: cfg.announceOn,
          send_at: cfg.announceAt ? cfg.announceAt.toISOString() : null,
          subject: value("hubEventEmailAnnounceSubject") || null
        },
        ticket_reminder: {
          enabled: cfg.ticketOn,
          send_at: cfg.ticketAt ? cfg.ticketAt.toISOString() : null,
          subject: value("hubEventEmailTicketSubject") || null
        },
        closing_warning: {
          enabled: cfg.closingOn,
          subject: value("hubEventEmailClosingSubject") || null
        }
      } });
      if (res.error) throw res.error;
      var data = res.data || {};
      if (data.ok === false) throw new Error(data.message || "Could not save the email schedule.");
      var rows = Array.isArray(data.emails) ? data.emails : [];
      eventEmailHadRows = rows.length > 0;
      var notes = emailScheduleNotes(rows);
      if (status) status.textContent = notes.join(" ");
      if (!cfg.emailsOn) return "";
      return notes.length ? "Krewe emails: " + notes.join(" ") : "";
    } catch (e) {
      var note = "Krewe email schedule not saved: " + ((e && e.message) || e);
      if (status) status.textContent = note;
      return note;
    }
  }

  function syncOptionalEventFields() {
    var typeEl = document.getElementById("hubEventType");
    var onlineBox = document.getElementById("hubEventOnline");
    if (typeEl && onlineBox && typeEl.value === "online") onlineBox.checked = true;
    var raffleOn = !!(document.getElementById("hubEventCollectRaffle") && document.getElementById("hubEventCollectRaffle").checked);
    var mealOn = !!(document.getElementById("hubEventCollectMeals") && document.getElementById("hubEventCollectMeals").checked);
    var onlineOn = !!(onlineBox && onlineBox.checked) || (typeEl && typeEl.value === "online");
    showEl("hubEventRaffleFields", raffleOn);
    showEl("hubEventMealFields", mealOn);
    showEl("hubEventOnlineFields", onlineOn);
    function emailChecked(id) { var el = document.getElementById(id); return !!(el && el.checked); }
    var emailsOn = emailChecked("hubEventEmails");
    showEl("hubEventEmailFields", emailsOn);
    showEl("hubEventEmailAnnounceFields", emailsOn && emailChecked("hubEventEmailAnnounce"));
    showEl("hubEventEmailTicketFields", emailsOn && emailChecked("hubEventEmailTicket"));
    showEl("hubEventEmailClosingFields", emailsOn && emailChecked("hubEventEmailClosing"));
    syncClosingEmailHint();
    var loc = document.getElementById("hubEventLocation");
    var membersOnly = !!(document.getElementById("hubEventMembersOnly") && document.getElementById("hubEventMembersOnly").checked);
    if (loc) {
      if (onlineOn) loc.placeholder = "Optional for online events";
      else if (membersOnly) loc.placeholder = "Members home, Tampa";
      else loc.placeholder = "Venue name or city (public)";
    }
  }

  function onRaffleEventPicked() {
    var sel = document.getElementById("hubEventRaffleEvent");
    var price = document.getElementById("hubEventRafflePrice");
    if (!sel || !price || !sel.value) return;
    var row = eventRaffles.find(function (r) { return String(r.id) === String(sel.value); });
    if (row && row.ticket_price != null && row.ticket_price !== "" && !price.value) {
      price.value = Number(row.ticket_price).toFixed(2);
    }
  }

  async function loadEventRaffles(client) {
    try {
      var res = await client.rpc("officer_list_event_raffles");
      if (res.error) throw res.error;
      var data = res.data || {};
      eventRaffles = Array.isArray(data.raffles) ? data.raffles : [];
    } catch (e) {
      eventRaffles = [];
    }
    var current = document.getElementById("hubEventRaffleEvent");
    fillRaffleEventSelect(current ? current.value : "");
  }

  function confirmDeleteTextMatches(typed, name) {
    var t = String(typed || "").trim().toLowerCase();
    if (!t) return false;
    if (t === "delete permanently") return true;
    return t === String(name || "").trim().toLowerCase();
  }

  function showEventDeleteButton(on) {
    var btn = document.getElementById("hubEventDelete");
    var hint = document.getElementById("hubEventDeleteHint");
    if (btn) {
      btn.hidden = !on;
      btn.style.display = on ? "" : "none";
      btn.disabled = false;
    }
    if (hint) {
      hint.hidden = !on;
      hint.style.display = on ? "" : "none";
    }
  }

  function hideDeletePanel() {
    pendingDelete = null;
    var panel = document.getElementById("hubEventDeletePanel");
    var typed = document.getElementById("hubEventDeleteTyped");
    var err = document.getElementById("hubEventDeleteErr");
    var go = document.getElementById("hubEventDeleteGo");
    if (typed) typed.value = "";
    if (err) err.textContent = "";
    if (go) {
      go.disabled = true;
      go.textContent = "Delete permanently";
    }
    if (panel) {
      panel.hidden = true;
      panel.style.display = "none";
    }
  }

  function syncDeleteGoEnabled() {
    var go = document.getElementById("hubEventDeleteGo");
    var typed = document.getElementById("hubEventDeleteTyped");
    if (!go) return;
    go.disabled = !pendingDelete || !confirmDeleteTextMatches(typed && typed.value, pendingDelete.name);
  }

  function showDeletePanel(event) {
    var row = event || {};
    if (!row.id) return;
    pendingDelete = {
      id: row.id,
      name: row.name || "",
      start_time: row.start_time || ""
    };
    var panel = document.getElementById("hubEventDeletePanel");
    var summary = document.getElementById("hubEventDeleteSummary");
    var typed = document.getElementById("hubEventDeleteTyped");
    var err = document.getElementById("hubEventDeleteErr");
    var when = eventLocalDisplay(pendingDelete.start_time);
    if (summary) {
      summary.textContent = (pendingDelete.name || "This event") + (when ? " — " + when : "");
    }
    if (typed) typed.value = "";
    if (err) err.textContent = "";
    syncDeleteGoEnabled();
    if (panel) {
      panel.hidden = false;
      panel.style.display = "";
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (typed) typed.focus();
  }

  function eventFromFormForDelete() {
    var idEl = document.getElementById("hubEventId");
    var nameEl = document.getElementById("hubEventName");
    var startEl = document.getElementById("hubEventStart");
    var startVal = startEl ? startEl.value.trim() : "";
    var startIso = "";
    if (startVal) {
      var d = new Date(startVal);
      startIso = isNaN(d.getTime()) ? startVal : d.toISOString();
    }
    return {
      id: idEl ? idEl.value.trim() : "",
      name: nameEl ? nameEl.value.trim() : "",
      start_time: startIso
    };
  }

  async function runDeleteEvent(client) {
    var err = document.getElementById("hubEventDeleteErr");
    var go = document.getElementById("hubEventDeleteGo");
    var typed = document.getElementById("hubEventDeleteTyped");
    var msg = document.getElementById("hubEventMsg");
    var confirm = typed ? typed.value.trim() : "";
    if (!pendingDelete || !pendingDelete.id) {
      if (err) err.textContent = "Choose an event to delete.";
      return;
    }
    if (!confirmDeleteTextMatches(confirm, pendingDelete.name)) {
      if (err) err.textContent = "Type the event name or Delete permanently to confirm.";
      return;
    }
    if (go) {
      go.disabled = true;
      go.textContent = "Deleting…";
    }
    if (err) err.textContent = "";
    try {
      var res = await client.rpc("officer_delete_event", {
        p_event_id: pendingDelete.id,
        p_confirm: confirm
      });
      if (res.error) throw res.error;
      if (res.data && res.data.ok === false) throw new Error(res.data.message || "Could not delete event.");
      var name = (res.data && res.data.name) || pendingDelete.name || "the event";
      var id = String(pendingDelete.id);
      hideDeletePanel();
      var idEl = document.getElementById("hubEventId");
      if (idEl && String(idEl.value) === id) clearEventForm();
      if (msg) msg.textContent = "Deleted " + name + ".";
      await refreshEventStudio(client);
    } catch (e) {
      var text = (e && e.message) || String(e);
      if (err) err.textContent = text;
      if (msg) msg.textContent = "Couldn't delete: " + text;
      if (go) go.textContent = "Delete permanently";
      syncDeleteGoEnabled();
    }
  }

  function wireEventDelete(client) {
    var formBtn = document.getElementById("hubEventDelete");
    if (formBtn) {
      formBtn.addEventListener("click", function () {
        showDeletePanel(eventFromFormForDelete());
      });
    }
    var cancel = document.getElementById("hubEventDeleteCancel");
    if (cancel) {
      cancel.addEventListener("click", function () {
        hideDeletePanel();
        var msg = document.getElementById("hubEventMsg");
        if (msg) msg.textContent = "Delete cancelled. Nothing was removed.";
      });
    }
    var go = document.getElementById("hubEventDeleteGo");
    if (go) {
      go.addEventListener("click", function () { runDeleteEvent(client); });
    }
    var typed = document.getElementById("hubEventDeleteTyped");
    if (typed) {
      typed.addEventListener("input", syncDeleteGoEnabled);
      typed.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          runDeleteEvent(client);
        }
      });
    }
  }

  function clearEventForm() {
    var form = document.getElementById("hubEventForm");
    if (!form) return;
    form.reset();
    document.getElementById("hubEventId").value = "";
    document.getElementById("hubEventPublic").checked = true;
    var moOnly = document.getElementById("hubEventMembersOnly"); if (moOnly) moOnly.checked = false;
    var ma = document.getElementById("hubEventMemberAddress"); if (ma) ma.value = "";
    document.getElementById("hubEventMandatory").checked = false;
    document.getElementById("hubEventFeatured").checked = false;
    var cg = document.getElementById("hubEventCollectGuests"); if (cg) cg.checked = true;
    var cn = document.getElementById("hubEventCollectGuestNames"); if (cn) cn.checked = true;
    var cr = document.getElementById("hubEventCollectRaffle"); if (cr) cr.checked = false;
    var ro = document.getElementById("hubEventRaffleOptions"); if (ro) ro.value = "0,1,5,15";
    var rp = document.getElementById("hubEventRafflePrice"); if (rp) rp.value = "";
    fillRaffleEventSelect("");
    var cm = document.getElementById("hubEventCollectMeals"); if (cm) cm.checked = false;
    var mo = document.getElementById("hubEventMealOptions"); if (mo) mo.value = "";
    var onl = document.getElementById("hubEventOnline"); if (onl) onl.checked = false;
    var mu = document.getElementById("hubEventMeetingUrl"); if (mu) mu.value = "";
    var rcClear = document.getElementById("hubEventRegCloses"); if (rcClear) rcClear.value = "";
    resetEventEmailFields();
    document.getElementById("hubEventStatus").value = "draft";
    var payClear = document.getElementById("hubEventPaymentUrl"); if (payClear) payClear.value = "";
    document.getElementById("hubEventType").value = "social";
    document.getElementById("hubEventFormTitle").textContent = "New event";
    document.getElementById("hubEventMsg").textContent = "";
    hidePublishButton();
    showEventDeleteButton(false);
    hideDeletePanel();
    var note = document.getElementById("hubEventFlyerNote");
    if (note) note.textContent = "Upload fills the URL above. Then press Save event to attach it. Published public events show on the Events page.";
    syncFlyerPreview();
    syncOptionalEventFields();
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
    var maFill = get("hubEventMemberAddress"); if (maFill) maFill.value = event.member_address || "";
    get("hubEventCapacity").value = event.capacity == null ? "" : event.capacity;
    get("hubEventDescription").value = event.description || "";
    get("hubEventPublic").checked = event.is_public !== false;
    var monly = get("hubEventMembersOnly"); if (monly) monly.checked = !!event.members_only;
    get("hubEventMandatory").checked = !!event.is_mandatory;
    get("hubEventFeatured").checked = !!event.is_featured;
    get("hubEventStatus").value = String(event.status || "").toLowerCase() === "cancelled" ? "cancelled" : "draft";
    get("hubEventTicketLabel").value = event.ticket_label || "";
    get("hubEventTicketPrice").value = event.ticket_price_cents == null ? "" : (Number(event.ticket_price_cents) / 100).toFixed(2);
    get("hubEventPaymentUrl").value = event.ticket_payment_url || "";
    var cg = get("hubEventCollectGuests"); if (cg) cg.checked = event.collect_guests !== false;
    var cn = get("hubEventCollectGuestNames"); if (cn) cn.checked = event.collect_guest_names !== false;
    var cr = get("hubEventCollectRaffle"); if (cr) cr.checked = !!event.collect_raffle || !!event.raffle_event_id;
    var ro = get("hubEventRaffleOptions"); if (ro) ro.value = event.raffle_options || "0,1,5,15";
    fillRaffleEventSelect(event.raffle_event_id || "");
    var rp = get("hubEventRafflePrice");
    if (rp) {
      rp.value = event.raffle_ticket_price == null || event.raffle_ticket_price === ""
        ? ""
        : Number(event.raffle_ticket_price).toFixed(2);
    }
    var cm = get("hubEventCollectMeals"); if (cm) cm.checked = !!event.collect_meals;
    var mo = get("hubEventMealOptions"); if (mo) mo.value = event.meal_options || "";
    var typeVal = event.event_type || "other";
    get("hubEventType").value = typeVal;
    if (get("hubEventType").value !== typeVal && typeVal) get("hubEventType").value = "other";
    var onl = get("hubEventOnline"); if (onl) onl.checked = !!event.is_online || typeVal === "online";
    var mu = get("hubEventMeetingUrl"); if (mu) mu.value = event.meeting_url || "";
    get("hubEventFlyerUrl").value = event.flyer_url || "";
    resetEventEmailFields();
    if (event.id && eventStudioClient) loadEventEmailSchedule(eventStudioClient, event.id);
    syncFlyerPreview();
    syncOptionalEventFields();
    get("hubEventFormTitle").textContent = "Edit event";
    get("hubEventMsg").textContent = "";
    showEventDeleteButton(!!event.id);
    hideDeletePanel();
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
      if (event.member_address) details.push("Member address set");
      if (event.members_only) details.push("Members only");
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
        (event.collect_raffle || event.raffle_event_id ? " · raffle" : "") +
        (event.collect_meals ? " · meals" : "") +
        (event.members_only ? " · members only" : "") +
        (event.is_online || event.event_type === "online" ? " · online" : "") +
        (flyer ? " · has image/PDF" : " · add image/PDF") +
        (readOnly ? " · IKC event (read-only)" : "") + '</div></div>' +
        (readOnly ? "" : '<div class="hub-appr-btns">' +
          '<button class="btn btn-primary" type="button" data-event-edit="' + eid + '">Edit event</button>' +
          '<button class="btn" type="button" data-event-rsvp-qr="' + eid + '">▦ RSVP QR</button>' +
          '<button class="btn btn-primary" type="button" data-event-checkin-qr="' + eid + '">▦ Door check-in QR</button>' +
          '<button class="btn btn-danger" type="button" data-event-delete="' + eid + '">Delete permanently</button>' +
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
    target.querySelectorAll("[data-event-delete]").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-event-delete");
        var event = list.find(function (row) { return String(row.id) === String(id); });
        if (event && String(event.source || "").toLowerCase() !== "ikc") showDeletePanel(event);
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
    var memberAddr = row.member_address && String(row.member_address).trim() ? String(row.member_address).trim() : "Not set";
    var note = clearedNote ? "\n" + clearedNote + "\n" : "";
    return window.confirm(
      "Review the saved event. Confirm these details are correct.\n\n" +
      "Name: " + (row.name || "Not set") + "\n" +
      "Date and time: " + when + "\n" +
      "Public location teaser: " + where + "\n" +
      "Private member address: " + memberAddr + "\n" +
      (row.members_only ? "Members only: yes\n" : "") +
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
      member_address: payload.member_address,
      members_only: payload.members_only,
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
    var rafflePriceValue = value("hubEventRafflePrice");
    var raffleDollars = rafflePriceValue === "" ? null : Number(rafflePriceValue);
    if (rafflePriceValue !== "" && (isNaN(raffleDollars) || raffleDollars < 0)) {
      if (msg) msg.textContent = "Raffle ticket price must be zero or more. Enter the amount or leave it blank.";
      return;
    }
    var collectRaffle = !!(document.getElementById("hubEventCollectRaffle") && document.getElementById("hubEventCollectRaffle").checked);
    var collectMeals = !!(document.getElementById("hubEventCollectMeals") && document.getElementById("hubEventCollectMeals").checked);
    var mealOptions = value("hubEventMealOptions");
    if (collectMeals && !mealOptions) {
      if (msg) msg.textContent = "List at least one meal option, or turn meal choice off.";
      return;
    }
    var isOnline = !!(document.getElementById("hubEventOnline") && document.getElementById("hubEventOnline").checked)
      || value("hubEventType") === "online";
    var meetingUrl = value("hubEventMeetingUrl");
    if (isOnline && meetingUrl && !/^https?:\/\//i.test(meetingUrl)) {
      if (msg) msg.textContent = "Meeting join link must start with http:// or https://.";
      return;
    }
    function boxChecked(id) { var el = document.getElementById(id); return !!(el && el.checked); }
    var emailsOn = boxChecked("hubEventEmails");
    var emailCfg = {
      emailsOn: emailsOn,
      announceOn: emailsOn && boxChecked("hubEventEmailAnnounce"),
      ticketOn: emailsOn && boxChecked("hubEventEmailTicket"),
      closingOn: emailsOn && boxChecked("hubEventEmailClosing"),
      announceAt: null,
      ticketAt: null
    };
    if (emailCfg.announceOn) {
      var annValue = value("hubEventEmailAnnounceAt");
      emailCfg.announceAt = annValue ? new Date(annValue) : null;
      if (!emailCfg.announceAt || isNaN(emailCfg.announceAt.getTime())) {
        if (msg) msg.textContent = "Pick a send date/time for the announcement email.";
        return;
      }
    }
    if (emailCfg.ticketOn) {
      var tickValue = value("hubEventEmailTicketAt");
      emailCfg.ticketAt = tickValue ? new Date(tickValue) : null;
      if (!emailCfg.ticketAt || isNaN(emailCfg.ticketAt.getTime())) {
        if (msg) msg.textContent = "Pick a send date/time for the ticket reminder email.";
        return;
      }
    }
    if (emailCfg.closingOn && !regClose) {
      if (msg) msg.textContent = "Set “Close registrations on” above to schedule the registration-closing warning email.";
      return;
    }
    var payload = {
      id: value("hubEventId") || null, name: value("hubEventName"), start_time: start.toISOString(),
      end_time: end ? end.toISOString() : null, location: value("hubEventLocation") || null,
      member_address: value("hubEventMemberAddress") || null,
      description: value("hubEventDescription") || null, event_type: value("hubEventType") || "other",
      capacity: capacity, is_public: !!document.getElementById("hubEventPublic").checked,
      members_only: !!(document.getElementById("hubEventMembersOnly") && document.getElementById("hubEventMembersOnly").checked),
      is_mandatory: !!document.getElementById("hubEventMandatory").checked,
      is_featured: !!document.getElementById("hubEventFeatured").checked,
      status: value("hubEventStatus") === "cancelled" ? "cancelled" : "draft",
      ticket_label: value("hubEventTicketLabel") || null,
      ticket_price_cents: ticketValue === "" ? null : Math.round(dollars * 100),
      ticket_payment_url: value("hubEventPaymentUrl") || null, flyer_url: value("hubEventFlyerUrl") || null,
      collect_guests: !!(document.getElementById("hubEventCollectGuests") && document.getElementById("hubEventCollectGuests").checked),
      collect_guest_names: !!(document.getElementById("hubEventCollectGuestNames") && document.getElementById("hubEventCollectGuestNames").checked),
      collect_raffle: collectRaffle,
      raffle_options: value("hubEventRaffleOptions") || "0,1,5,15",
      raffle_event_id: collectRaffle ? (value("hubEventRaffleEvent") || null) : null,
      raffle_ticket_price: collectRaffle && rafflePriceValue !== "" ? raffleDollars : null,
      collect_meals: collectMeals,
      meal_options: collectMeals ? mealOptions : null,
      is_online: isOnline,
      meeting_url: isOnline ? (meetingUrl || null) : null,
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
      await loadEventRaffles(client);
      var savedEventId = (res.data && res.data.event && res.data.event.id) || payload.id;
      var emailNote = "";
      if (savedEventId) {
        emailNote = await saveEventEmailSchedule(client, savedEventId, emailCfg);
      } else if (emailCfg.emailsOn) {
        emailNote = "Krewe email schedule not saved: the saved event id was not returned. Edit the event and save again.";
      }
      if (save) { save.disabled = false; save.textContent = "☘ Save event"; }
      finishSavedReview(msg, res, payload, cleared,
        "You can make an RSVP QR or a Door check-in QR from the list above." + (emailNote ? " " + emailNote : ""));
    } catch (e) { if (msg) msg.textContent = "Couldn't save: " + ((e && e.message) || e); }
    if (save) { save.disabled = false; save.textContent = "☘ Save event"; }
  }
  async function loadEventStudio(client) {
    window.__kosHubOwnsEventStudio = true;
    if (!state.canManageEvents) return;
    eventStudioClient = client;
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
      '<div class="app-head"><span class="ic">📅</span><div><h2>Event Studio</h2><small>Add or edit events, then make RSVP and door check-in QR codes. Save stores a draft. Publish only after you review.</small></div></div>' +
      '<div class="app-body">' +
      '<p style="font-size:16px;color:var(--muted);margin:0 0 12px;">Tap <b>Edit event</b> on any published row to change address, start/end, or registration close. How QR works: <b>save the event</b>, then tap <b>RSVP QR</b> (flyer/table tent) or <b>Door check-in QR</b> (projector at the door). The square is just that link. Saving stores a draft and does not publish.</p>' +
      '<div class="hub-event-list"><h3>Events</h3><div id="hubEventList"><p class="empty">Loading events…</p></div></div>' +
      eventStudioFormHtml() + '</div>';
    document.getElementById("hubEventForm").addEventListener("submit", function (e) {
      e.preventDefault(); saveEventStudio(client);
    });
    document.getElementById("hubEventNew").addEventListener("click", clearEventForm);
    wireEventDelete(client);
    var publishBtn = document.getElementById("hubEventPublish");
    if (publishBtn) publishBtn.addEventListener("click", function () { publishReviewedEvent(client); });
    var eventForm = document.getElementById("hubEventForm");
    if (eventForm) {
      eventForm.addEventListener("input", onEventFormEdited);
      eventForm.addEventListener("change", onEventFormEdited);
    }
    ["hubEventType", "hubEventCollectRaffle", "hubEventCollectMeals", "hubEventOnline", "hubEventMembersOnly",
      "hubEventEmails", "hubEventEmailAnnounce", "hubEventEmailTicket", "hubEventEmailClosing"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("change", syncOptionalEventFields);
    });
    var regClosesEl = document.getElementById("hubEventRegCloses");
    if (regClosesEl) {
      regClosesEl.addEventListener("input", syncClosingEmailHint);
      regClosesEl.addEventListener("change", syncClosingEmailHint);
    }
    var rafflePick = document.getElementById("hubEventRaffleEvent");
    if (rafflePick) rafflePick.addEventListener("change", onRaffleEventPicked);
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
    await loadEventRaffles(client);
    await refreshEventStudio(client);
    wireOfficerDeskPicker();
  }

  // Hub tabs are "pages": every tab click adds a history entry, so the
  // browser's Back and Forward buttons walk between hub sections instead of
  // dumping members out of the hub. Back/Forward changes the hash, the
  // hashchange listener below re-shows the matching tab.
  var HASH_TABS = { home: "hub", hub: "hub", krewe: "krewe", events: "events", parade: "parade", desk: "parade", fun: "fun", officer: "officer" };

  function pushTabHistory(tab) {
    try {
      var want = "#" + (tab === "hub" ? "home" : tab);
      if (location.hash === want) return;
      history.pushState({ kosHubTab: tab }, "", want);
    } catch (e) {}
  }

  function bindTabs() {
    document.querySelectorAll("[data-hub-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tab = btn.getAttribute("data-hub-tab");
        if (tab !== "parade") clearHoursIntent();
        showTab(tab);
        pushTabHistory(tab);
      });
    });
    if (!window.__hubDocsHashBound) {
      window.__hubDocsHashBound = true;
      window.addEventListener("hashchange", function () {
        var hash = (location.hash || "").replace(/^#/, "").toLowerCase();
        if (hash === "docs") revealDocsCard();
        else if (hash === "directory") openDirectoryFromHome();
        else if (hash === "event-studio") openEventStudioFromHome();
        else if (hash.indexOf("craic") === 0) return; /* the Craic Cup handles its own hashes */
        else if (HASH_TABS[hash]) showTab(HASH_TABS[hash]);
        else if (hash === "") showTab(TAB_HOME); /* backed past the first tab entry */
      });
    }
    if (!window.__hubSamePageBound) {
      window.__hubSamePageBound = true;
      document.addEventListener("click", function (ev) {
        var a = ev.target && ev.target.closest ? ev.target.closest("a") : null;
        if (!a) return;
        var href = (a.getAttribute("href") || "").trim();
        if (!href) return;
        var hash = "";
        if (href.charAt(0) === "#") hash = href.slice(1).toLowerCase();
        else {
          var m = href.match(/(?:^|\/)members\.html#(.+)$/i);
          if (m) hash = m[1].toLowerCase();
        }
        if (hash === "docs") {
          ev.preventDefault();
          revealDocsCard();
        } else if (hash === "directory") {
          ev.preventDefault();
          openDirectoryFromHome();
        } else if (hash === "event-studio") {
          ev.preventDefault();
          openEventStudioFromHome();
        }
      });
    }
  }

  
  var OFFICER_TOOL_ORDER = [
    "hubApprovals",
    "hubPayments",
    "hubEventStudio",
    "hubShopStudio",
    "hubQrStudio",
    "hubDocStudio",
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
    hubDocStudio: { title: "Document Studio", desc: "Upload, publish, and hide library documents", icon: "📜", section: "Documents" },
    hubReports: { title: "Reports", desc: "Attendance, fundraising, and live event numbers", icon: "📊", section: "Reports" },
    hubAllKrewe: { title: "All Krewe Messages", desc: "Email the full membership", icon: "✉️", section: "Reports" },
    hubEmailMembers: { title: "Email members", desc: "Choose audience, write, preview, and send", icon: "✉️", section: "Email & invoices" },
    hubSendInvoices: { title: "Send invoices", desc: "Create dues invoices and email pay links", icon: "🧾", section: "Email & invoices" }
  };

  var OFFICER_SECTION_ORDER = [
    "Events",
    "Approvals",
    "Documents",
    "Shop",
    "Money",
    "Email & invoices",
    "Reports"
  ];

  /* Masthead chips and illuminated headers for each launcher section. The
     sub line tells an officer what the counter holds before they open it. */
  var OFFICER_SECTION_META = {
    "Events": { icon: "📅", sub: "Event Studio, QR check-in, and the calendar." },
    "Approvals": { icon: "✅", sub: "Members' photos and videos, clover claims, roles, and record merges." },
    "Documents": { icon: "📜", sub: "Upload, publish, and hide library documents." },
    "Shop": { icon: "🛍️", sub: "Products, Zeffy links, and the shop QR." },
    "Money": { icon: "💳", sub: "Dues and payment records." },
    "Email & invoices": { icon: "✉️", sub: "Write the membership and send dues invoices." },
    "Reports": { icon: "📊", sub: "Attendance, fundraising, and live event numbers." },
    "More tools": { icon: "☘", sub: "Everything else on the desk." }
  };

  function officerSectionSlug(sec) {
    return "deskOff-" + String(sec).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

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
      hero.className = "desk-hero desk-officer";
      hero.innerHTML =
        '<p class="desk-kicker">Céad míle fáilte - a hundred thousand welcomes</p>' +
        "<h2>🎖️ Your Officer Desk</h2>" +
        "<p>Everything the krewe trusts you with, on one desk: run events and check-ins, " +
        "approve members' photos, videos, and clover claims, publish documents, mind the shop " +
        "and the money, write the membership, and read the numbers. Pick one tool at a time - " +
        "the desk stays tidy.</p>" +
        '<nav class="desk-nav" id="hubOfficerDeskNav" aria-label="Officer desk sections"></nav>';
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
    function sectionHtml(sec) {
      var meta = OFFICER_SECTION_META[sec] || { icon: "☘", sub: "" };
      var h = '<div class="hub-officer-section" id="' + officerSectionSlug(sec) + '">' +
        '<header class="desk-group-head"><span class="dg-ic" aria-hidden="true">' + meta.icon + "</span>" +
        "<div><h3>" + sec + "</h3>" +
        (meta.sub ? '<span class="dg-sub">' + meta.sub + "</span>" : "") +
        "</div></header>" +
        '<div class="desk-group-rule"></div>' +
        '<div class="hub-officer-tiles">';
      bySection[sec].forEach(function (item) {
        h +=
          '<button type="button" class="hub-officer-tile" data-tool="tool:' + item.id + '">' +
          '<span class="tic" aria-hidden="true">' + (item.meta.icon || "☘") + "</span>" +
          "<b>" + item.meta.title + "</b>" +
          "<span>" + (item.meta.desc || "") + "</span></button>";
      });
      return h + "</div></div>";
    }

    var html = "";
    var rendered = [];
    OFFICER_SECTION_ORDER.forEach(function (sec) {
      if (!bySection[sec] || !bySection[sec].length) return;
      rendered.push(sec);
      html += sectionHtml(sec);
    });
    Object.keys(bySection).forEach(function (sec) {
      if (rendered.indexOf(sec) !== -1) return;
      rendered.push(sec);
      html += sectionHtml(sec);
    });
    launcher.innerHTML = html;
    launcher.querySelectorAll(".hub-officer-tile").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openOfficerTool(btn.getAttribute("data-tool"), true);
      });
    });

    // Masthead jump chips mirror whichever sections this officer actually
    // sees (committee roles get a shorter desk). A chip first returns to the
    // overview - the launcher must be visible before the scroll lands.
    var nav = document.getElementById("hubOfficerDeskNav");
    if (nav) {
      nav.innerHTML = rendered.map(function (sec) {
        var meta = OFFICER_SECTION_META[sec] || { icon: "☘" };
        return '<button type="button" data-desk-goto="' + officerSectionSlug(sec) + '">' + meta.icon + " " + sec + "</button>";
      }).join("");
      nav.querySelectorAll("[data-desk-goto]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          try { sessionStorage.removeItem("kosOfficerTool"); } catch (e) {}
          var sel = document.getElementById("officerToolSelect");
          if (sel) { sel.value = ""; sel.selectedIndex = -1; }
          showOfficerOverview();
          setTimeout(function () {
            focusHubTarget(document.getElementById(btn.getAttribute("data-desk-goto")));
          }, 60);
        });
      });
    }
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
    // here - loadHubData settles the tab and defers the hours deep-link.
    setTimeout(boot, 40);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

