const CACHE_NAME = "gibush-cache-v1";
const urlsToCache = [
  "./index.html",
  "./manifest.json",
  "./styles.css",
  "./script.js",
  "./icons/thumbnail_gibush_192.png",
  "./icons/thumbnail_gibush_512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});