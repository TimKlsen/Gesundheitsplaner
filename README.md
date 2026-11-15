# Gesundheitsplaner
In dieser Web App kann der User lokal seine Gesundheitsdaten speichern

Gesundheitstagebuch: Installation auf dem iPhone (Manifest und Service Worker)
Mit diesen zwei neuen Dateien und drei Zeilen in der index.html wird die App auf dem iPhone installierbar und läuft offline. Alle drei Dateien liegen im selben Ordner.
Schritt 1: Drei Zeilen in den Kopf der index.html
Im Bereich head der index.html, direkt unter der Zeile mit dem title, diese Zeilen einfügen:
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Tagebuch">
<meta name="theme-color" content="#2563eb">
Unten in der index.html, direkt vor dem schließenden Script-Tag, diesen Block ergänzen:
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}
Schritt 2: Neue Datei manifest.json
Diese Datei beschreibt die App für das iPhone:
{
  "name": "Gesundheitstagebuch",
  "short_name": "Tagebuch",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f1f5f9",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
Schritt 3: Neue Datei service-worker.js
Der Service Worker legt die App-Dateien beim ersten Besuch auf dem Gerät ab, danach läuft alles ohne Internet. Deine Gesundheitsdaten fasst er nicht an, die bleiben in IndexedDB.
const CACHE = 'tagebuch-v1';
const DATEIEN = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './tailwind.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(treffer => treffer || fetch(e.request))
  );
});
Schritt 4: Tailwind lokal ablegen
Bisher lädt die App Tailwind über das Internet, offline wäre das Design weg, und es wäre ein Fremdcode, der bei jedem Start nachgeladen wird. Besser ist eine lokale Kopie:
1.  Im Browser die Adresse https://cdn.tailwindcss.com öffnen.
2.  Den angezeigten Text komplett kopieren und in eine neue Datei namens tailwind.js im Projektordner einfügen.
3.  In der index.html die Zeile mit dem Script-Tag von cdn.tailwindcss.com ersetzen durch: <script src="tailwind.js"></script>
Damit läuft die App komplett ohne Fremdserver. Für eine spätere, schlankere Version kann man Tailwind auch vorab zu einer kleinen CSS-Datei bauen, das ist aber nicht nötig.
Schritt 5: Zwei Icons
Du brauchst zwei quadratische PNG-Bilder im Projektordner: icon-192.png mit 192 mal 192 Pixeln und icon-512.png mit 512 mal 512 Pixeln. Ein einfaches Symbol auf einfarbigem Hintergrund reicht, zum Beispiel ein Herz. Ohne Icons funktioniert die App trotzdem, das iPhone zeigt dann nur ein Standardbild an.
Schritt 6: Auf GitHub Pages veröffentlichen
Die Verschlüsselung funktioniert nur über HTTPS. GitHub Pages liefert das automatisch.
1.  Ein neues Repository auf GitHub anlegen. Hinweis: Repositories auf GitHub Pages sind öffentlich einsehbar, es darf also nur der Programmcode drin liegen und niemals ein Backup oder echte Daten.
2.  Alle Dateien hochladen: index.html, manifest.json, service-worker.js, tailwind.js und die beiden Icons.
3.  Im Repository auf Settings gehen, dann auf Pages, bei Branch den Hauptzweig main und den Ordner root wählen und speichern.
4.  Nach ein bis zwei Minuten ist die Seite unter einer Adresse erreichbar, die so aussieht: dein-benutzername.github.io/repository-name.
Schritt 7: Auf dem iPhone installieren
1.  Die Adresse in Safari öffnen. Wichtig: Es muss Safari sein, andere Browser können Web-Apps auf dem iPhone nicht installieren.
2.  Unten auf das Teilen-Symbol tippen, das Quadrat mit dem Pfeil nach oben.
3.  Nach unten scrollen und Zum Home-Bildschirm wählen.
4.  Den Namen bestätigen und auf Hinzufügen tippen.
5.  Die App ab sofort über das neue Symbol auf dem Home-Bildschirm starten.
Wichtige Hinweise
1.  Datenspeicher getrennt: Die installierte App vom Home-Bildschirm hat auf iOS einen eigenen Speicher, getrennt von Safari. Lege dein Profil und deine Einträge deshalb erst in der installierten App an, nicht vorher im Browser.
2.  Zwei Adressen, zwei Datenbanken: Daten, die du lokal in Visual Studio Code testest, sind nicht in der Version auf GitHub Pages. Zum Umziehen nutzt du das verschlüsselte Backup.
3.  Aktualisieren: Wenn du den Code änderst, erhöhe in der service-worker.js die Versionsnummer, also tagebuch-v2 statt tagebuch-v1, sonst zeigt das iPhone weiter die alte Fassung.
4.  Speicher-Risiko: iOS kann Web-Daten löschen, wenn eine App sehr lange nicht benutzt wird. Mach deshalb regelmäßig ein Backup, zum Beispiel einmal im Monat.
5.  Repository-Name: Bei GitHub Pages liegt die App in einem Unterordner. Die relativen Pfade mit Punkt und Schrägstrich im Code sind deshalb absichtlich so gesetzt.
Noch offen
1.  Passkey mit Touch ID als zweiter Faktor
2.  Auswertung mit Mittelwerten und Auffälligkeiten
3.  Automatische Sperre nach Inaktivität
