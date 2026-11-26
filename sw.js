/* =====================================================================
 *  sw.js – Service Worker: macht die App offline nutzbar
 *
 *  Strategie "Netz zuerst": Ist eine Verbindung da (z. B. beim
 *  Entwickeln), kommen immer die neuesten Dateien. Ohne Verbindung
 *  werden die zuletzt gespeicherten Dateien aus dem Cache geladen.
 *
 *  Nach Änderungen an den Dateien CACHE_VERSION erhöhen, damit alte
 *  Zwischenspeicher gelöscht werden.
 * ===================================================================== */
const CACHE_VERSION = 'meine-werte-v3';

const FILES = [
  './',
  'index.html',
  'css/tailwind.css',
  'css/app.css',
  'js/theme-init.js',
  'js/util.js',
  'js/vault.js',
  'js/store.js',
  'js/charts.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Nur eigene Dateien (GET) – nie etwas von fremden Servern anfassen
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Nur einwandfreie Antworten zwischenspeichern (keine 404-/Fehlerseiten)
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) =>
        // Ohne Verbindung: gespeicherte Datei; nur beim Öffnen der Seite selbst ersatzweise index.html
        hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
