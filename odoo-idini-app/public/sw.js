// Service worker: deja la app instalable y permite abrirla sin conexión con el "cascarón" cacheado.
// Estrategia "red primero": con internet siempre se obtiene la versión más nueva; sin internet, la última guardada.
// Los datos de Odoo (/api/*) nunca se cachean aquí: la app guarda su último resumen en localStorage.
const CACHE = "idini-v10";
const SHELL = ["/", "/styles.css", "/app.js", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/favicon.png", "/logo-idini.png", "/logo-jpb-blanco.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("/")))
  );
});
