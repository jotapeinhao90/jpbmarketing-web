// Guarda solo el "cascarón" de la app para que abra rápido; los datos (/api) siempre van a la red.
const CACHE = "barberias-app-v2";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Solo la app propia: los mapas (tiles) y librerías externas no se guardan.
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  // Red primero (para ver siempre la última versión); cache si no hay conexión.
  e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; }).catch(() => caches.match(e.request)));
});

// ---- Notificaciones push: el aviso llega cifrado con {titulo, cuerpo, url, tag} ----
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = {}; }
  const titulo = d.titulo || "Nuevo cliente fidelizado";
  event.waitUntil((async () => {
    await self.registration.showNotification(titulo, {
      body: d.cuerpo || "Un cliente se unió a tu programa de fidelización",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: d.tag || "fidelizado",
      renotify: true,
      vibrate: [80, 40, 80],
      data: { url: d.url || "/?vista=clientes" },
    });
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    ventanas.forEach((v) => v.postMessage({ tipo: "push", titulo: d.cuerpo || titulo }));
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || "/?vista=clientes", self.registration.scope).href;
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const v of ventanas) {
      if ("focus" in v) { await v.focus(); if ("navigate" in v) v.navigate(destino).catch(() => {}); return; }
    }
    if (self.clients.openWindow) await self.clients.openWindow(destino);
  })());
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((vs) => vs.forEach((v) => v.postMessage({ tipo: "resuscribir" }))));
});
