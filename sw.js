/* Service worker — makes the hub installable and fully offline-capable.
   Strategy:
   • same-origin (index.html, data .js, crests): NETWORK-FIRST so fresh deploys
     and the daily data commits always win; cache is the offline fallback.
     Cache keys are normalized to the pathname so ?nocache=/?fresh= probes
     don't pile up variants.
   • cross-origin (Plotly CDN, Wikimedia photos): CACHE-FIRST — immutable-ish,
     and the big Plotly bundle is the main repeat-visit cost.
   Only successful (or opaque cross-origin) responses are cached — a transient
   404/500 must never become the permanent offline copy.
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
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    const key = url.origin + url.pathname;          // strip query → one cache entry per file
    e.respondWith(
      fetch(req).then(r => {
        if (r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put(key, cp)); }
        return r;
      }).catch(() => caches.match(key))
    );
  } else {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        if (r.ok || r.type === "opaque") { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); }
        return r;
      }))
    );
  }
});
