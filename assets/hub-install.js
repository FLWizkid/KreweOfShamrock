/* Member Hub home-screen install (existing website, not a store app).
   Display name default is "Shamrock". To rename the Home Screen label later, change:
     1. KOS_HUB_APP_NAME below
     2. name and short_name in /manifest.webmanifest
     3. apple-mobile-web-app-title on members.html
   Registers a tiny service worker so Android Chrome can offer Install.
   Does not add an install banner to the public homepage. */
(function () {
  "use strict";
  window.KOS_HUB_APP_NAME = "Shamrock";
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/hub-sw.js").catch(function () {});
  });
})();
