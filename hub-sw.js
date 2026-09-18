/* Krewe of Shamrock Member Hub
   Tiny service worker so Android Chrome can offer Install.
   Network-only: no offline mode, and no app-shell cache that could serve a stale hub. */
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function () {
  // Intentionally empty. Pages and assets always come from the network.
});
