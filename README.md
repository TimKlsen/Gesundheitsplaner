# Meine Werte – private Gesundheits-App

Blutdruck, Puls, Gewicht, Symptome und Kommentare eintragen.
Alles bleibt **lokal im Browser** und wird mit deinem Passwort **verschlüsselt**. Es gibt keinen Server und keine
Netzwerkanfragen (außer dem Laden der App-Dateien selbst). Tailwind CSS ist fest eingebaut, die App läuft also auch offline.

## So startest du die App

Beim ersten Start erscheint „Neues Profil anlegen“: Profilname und Passwort (mindestens 8 Zeichen) eingeben.
**Das Passwort lässt sich nicht wiederherstellen.** Die Daten bleiben auf dem jeweiligen Gerät.

### Linux
1. ZIP entpacken, im Ordner ein Terminal öffnen.
2. Einmalig: `chmod +x start.sh`
3. Starten: `./start.sh`
4. Der Browser öffnet `http://localhost:7070/index.html`. Terminal offen lassen, beenden mit **Strg+C**.

Voraussetzung: `python3` (meist vorinstalliert, sonst `sudo apt install python3`).

### Windows
1. ZIP entpacken.
2. Doppelklick auf `start.bat`.
3. Der Browser öffnet `http://localhost:7070/index.html`. Das Fenster offen lassen, beenden mit **Strg+C** oder Fenster schließen.

Voraussetzung: Python von https://www.python.org/downloads/ (bei der Installation „Add Python to PATH“ ankreuzen).
Fehlersuche: In der Eingabeaufforderung im Ordner `py -m http.server 7070 --bind 127.0.0.1` eingeben und
http://localhost:7070 im Browser öffnen.

### Android
Die App muss einmal über **https://** erreichbar sein (z. B. GitHub Pages, siehe unten).
1. Adresse in **Chrome** öffnen.
2. Menü (⋮) → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
3. Ab jetzt über das App-Symbol starten – das funktioniert danach auch ohne Internet.

### iPhone / iPad (iOS)
Die App muss einmal über **https://** erreichbar sein (z. B. GitHub Pages, siehe unten).
1. Adresse in **Safari** öffnen (nicht in einem anderen Browser).
2. Teilen-Symbol → „Zum Home-Bildschirm“ → „Hinzufügen“.
3. Ab jetzt **immer über das Symbol** starten – auch ohne Internet.

Wichtig: Nur die installierte App behält ihre Daten dauerhaft. Safari löscht Daten normaler Webseiten nach
7 Tagen ohne Nutzung.

### Handy-Zugriff über GitHub Pages (kurz)
1. Projekt in ein **öffentliches** GitHub-Repository hochladen (`node_modules/` nicht mit hochladen,
   `css/tailwind.css` schon).
2. Repository → Settings → Pages → Branch `main`, Ordner `/ (root)`.
3. Nach 1–2 Minuten ist die App unter `https://DEIN-NAME.github.io/meine-werte/` erreichbar.
4. Deine Gesundheitsdaten landen nie auf GitHub – dort liegt nur der Programmcode.

### Daten übertragen / sichern
Jedes Gerät und jeder Browser hat seinen eigenen Datenspeicher. Zum Übertragen oder Sichern:
Profil → „Verschlüsselte Sicherung herunterladen“. Auf dem anderen Gerät auf der Anmeldeseite
„Sicherung importieren“ wählen und mit dem gleichen Passwort anmelden.

## Ordner

```
index.html              Gerüst der Seite
css/tailwind.css        von Tailwind erzeugt (nicht von Hand bearbeiten)
css/app.css             eigene CSS-Ergänzungen (direkt bearbeitbar)
src/input.css           Tailwind-Quelle mit eigenen Bausteinen (.card, .btn-primary ...)
tailwind.config.js      Tailwind-Einstellungen
js/util.js              Hilfsfunktionen
js/vault.js             Passwort + Verschlüsselung
js/store.js             lokale Speicherung
js/charts.js            Diagramme
js/app.js               Oberfläche und Logik  <-- hier ändert man am meisten
sw.js                   Service Worker (Offline-Betrieb)
manifest.webmanifest    Installation als App
icons/                  App-Symbole
start.sh / start.bat    lokaler Start (Linux / Windows) auf Port 7070
```

## In Phoenix Code (Linux) öffnen und ausprobieren

1. Ordner `meine-werte` in Phoenix Code öffnen.
2. `index.html` öffnen und **Live-Vorschau** starten (läuft über http://localhost – nötig für die Verschlüsselung).
   Alternative im Terminal: `python3 -m http.server 7070` und dann http://localhost:7070 im Browser öffnen.

## Offline nutzen

**Desktop (immer lokal über localhost):**
```
./start.sh
```
Startet einen kleinen Server nur auf deinem Rechner (nicht aus dem Netzwerk erreichbar) und öffnet
http://localhost:7070. Immer denselben Port verwenden, sonst startet die App leer. Wenn du die Seite einmal in
Chrome/Edge über das Installieren-Symbol als App installierst, öffnet sie sich danach meist auch ohne laufenden Server
(der Service Worker liefert die Dateien aus dem Zwischenspeicher).

**Windows:** Doppelklick auf `start.bat` (macht dasselbe wie `start.sh`; Python muss installiert sein).

**iPhone / Android:** Einmal mit Internet über https öffnen und installieren, danach läuft die App ohne Verbindung.

## Tailwind neu bauen (nur nötig, wenn du Tailwind-Klassen änderst oder neue verwendest)

`css/tailwind.css` enthält nur die Klassen, die in `index.html` und `js/*.js` vorkommen.
Wenn du neue Klassen einbaust, einmal neu bauen (Node.js nötig):

```
npm install          # einmalig
npm run build:css    # baut css/tailwind.css neu
npm run watch:css    # optional: baut bei jeder Änderung automatisch
```

Aussehen ändern: Bausteine in `src/input.css`, Farben in `css/app.css`.

## Die drei Bereiche: iOS, Android, Desktop

Es ist **eine** Web-App (PWA), die sich anpasst:

- **Desktop** (ab 768 px Breite): Seitenleiste links.
- **iOS / Android**: Navigationsleiste unten, Rücksicht auf Notch und Home-Balken.
- Die Plattform wird erkannt (`data-platform` am `<html>`-Element, siehe `Util.detectPlatform()`),
  im Profil-Reiter steht die passende Installationsanleitung markiert.

Für die Installation auf dem Handy muss die App über **https://** erreichbar sein
(zum Beispiel eigener Webspace, GitHub Pages oder Nextcloud-Webserver). Danach:
iOS: Safari → Teilen → „Zum Home-Bildschirm“. Android: Chrome → Menü → „App installieren“.
Wichtig auf iOS: Nur die installierte App behält ihre Daten dauerhaft – Safari löscht die Daten normaler
Webseiten nach 7 Tagen ohne Nutzung.

## Sicherheit – was die App tut und was nicht

- Passwort → PBKDF2 (SHA-256, 250 000 Runden) → getrennte Schlüssel per HKDF: ein Prüfwert und ein AES-256-GCM-Schlüssel.
- Das Passwort wird nie gespeichert, der Schlüssel nur im Arbeitsspeicher während du angemeldet bist.
- Automatische Abmeldung nach 10 Minuten ohne Bedienung (`AUTO_LOCK_MINUTES` in `js/app.js`).
- „SSH“ ist ein Protokoll für Fernzugriffe und nicht für Passwörter in Apps; verwendet wird der Standard SHA-256 über die Web Crypto API.
- **Kein Passwort-Reset möglich.** Passwort vergessen = Daten unlesbar.
- Der Anmeldename steht unverschlüsselt im Speicher (sonst gäbe es keine Profilauswahl). Alles andere ist verschlüsselt.
- Wer Zugriff auf das entsperrte Gerät hat, während du angemeldet bist, kann die Daten sehen.
- Sicherungen (Profil → Sicherung) sind verschlüsselt und lassen sich auf der Anmeldeseite wieder importieren.
- CSV-Exporte sind **nicht** verschlüsselt.

## Wo ändere ich was?

| Wunsch | Datei / Stelle |
|---|---|
| Symptom-Liste, Grenzwerte, Auto-Abmeldung | `js/app.js`, oben: `CONFIG` |
| Neue Eingabefelder bei Vitalwerten | `js/app.js`: `entryVitals()` und `forms['vitals-save']` |
| Weitere Reiter / Ansichten | `js/app.js`: `viewEntry()`, `viewHistory()` |
| Aussehen der Buttons, Karten | `src/input.css` (danach `npm run build:css`) |
| Diagramm-Farben | `css/app.css` |
| Anzahl PBKDF2-Runden | `js/vault.js`: `ITERATIONS` |
| Port ändern | `start.sh` / `start.bat`: `PORT` |
| Offline-Cache aktualisieren | `sw.js`: `CACHE_VERSION` erhöhen |

## Datenstruktur (entschlüsselt)

```
{ profile:  { displayName, birthYear, heightCm, notes },
  settings: { customSymptoms: [] },
  vitals:   [ { id, date, time, sys, dia, pulse, weight } ],      // mehrere pro Tag
  daily:    { "JJJJ-MM-TT": { mood, symptoms, comment, updated } } // genau einer pro Tag
}
```
