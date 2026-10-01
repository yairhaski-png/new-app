// App-shell cache so the app opens fast. Data and AI calls always go to the network.
const CACHE = "lookmax-v2";
const SHELL = ["./", "index.html", "css/app.css", "js/app.js", "js/auth.js", "js/backend.js", "js/calc.js", "js/config.js", "js/data.js", "js/food.js", "js/looks.js", "js/settings.js", "js/ui.js", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // network first so updates show up, cache as the offline fallback
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});
