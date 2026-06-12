/* Service worker — makes the hub installable and fully offline-capable.
   Strategy:
   • same-origin (index.html, data .js, crests): NETWORK-FIRST so fresh deploys
     and the daily data commits always win; cache is the offline fallback.
   • cross-origin (Plotly CDN, Wikimedia photos): CACHE-FIRST — immutable-ish,
     and the big Plotly bundle is the main repeat-visit cost.
   Bump VER on breaking changes to drop old caches. */
const VER = "wc26-v1";
const CORE = ["./", "index.html", "schedule.js", "players.js", "images.js",
              "player-img.js", "history.js", "manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const sameOrigin = new URL(req.url).origin === location.origin;
  if (sameOrigin) {
    e.respondWith(
      fetch(req).then(r => {
        const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); return r;
      }).catch(() => caches.match(req, { ignoreSearch: true }))
    );
  } else {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); return r;
      }))
    );
  }
});
