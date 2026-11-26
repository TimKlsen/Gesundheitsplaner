# Meine Werte – private Gesundheits-App

Blutdruck, Puls, Gewicht, Symptome und Kommentare eintragen.
Alles bleibt **lokal im Browser** und wird mit deinem Passwort **verschlüsselt**. Es gibt keinen Server und keine
Netzwerkanfragen (außer dem Laden der App-Dateien selbst). Tailwind CSS ist fest eingebaut, die App läuft also auch offline.

## So startest du die App

Beim ersten Start erscheint „Neues Profil anlegen“: Profilname und Passwort (mindestens 12 Zeichen) eingeben.
Tipp: ein Satz aus mehreren Wörtern (Passphrase) ist leicht zu merken und stark. Eine Stärkeanzeige hilft dabei.
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
Fehlersuche: In der Eingabeaufforderung im Ordner `py server.py` eingeben und
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
server.py               kleiner, abgesicherter lokaler Server (liefert nur die App-Dateien aus)
_headers                Sicherheits-Header für Cloudflare Pages / Netlify (GitHub Pages ignoriert sie)
```

## In Phoenix Code (Linux) öffnen und ausprobieren

1. Ordner `meine-werte` in Phoenix Code öffnen.
2. `index.html` öffnen und **Live-Vorschau** starten (läuft über http://localhost – nötig für die Verschlüsselung).
   Alternative im Terminal: `python3 server.py` und dann http://localhost:7070 im Browser öffnen.
   Falls die Live-Vorschau wegen der Netzwerksperre (`Content-Security-Policy` in `index.html`) nicht funktioniert:
   diese eine `<meta>`-Zeile nur zum Entwickeln auskommentieren.

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

- Passwort → PBKDF2 (SHA-256, 600 000 Runden) → getrennte Schlüssel per HKDF: ein Prüfwert und ein AES-256-GCM-Schlüssel.
- Das Passwort wird nie gespeichert, der Schlüssel nur im Arbeitsspeicher während du angemeldet bist.
- Passwortregeln: mindestens 12 Zeichen, keine sehr häufigen Wörter/Muster, nicht den Profilnamen enthalten, Stärkeanzeige (grobe Schätzung).
- Ältere Profile mit weniger PBKDF2-Runden werden beim nächsten Login automatisch aufgewertet.
- Beim Abmelden (und bei der automatischen Abmeldung) werden Passwort-Eingaben und alle angezeigten Gesundheitsdaten aus der Seite entfernt.
- Automatische Abmeldung nach 10 Minuten ohne Bedienung (`AUTO_LOCK_MINUTES` in `js/app.js`).
- „SSH“ ist ein Protokoll für Fernzugriffe und nicht für Passwörter in Apps; verwendet wird der Standard SHA-256 über die Web Crypto API.
- **Kein Passwort-Reset möglich.** Passwort vergessen = Daten unlesbar.
- Der Anmeldename steht unverschlüsselt im Speicher (sonst gäbe es keine Profilauswahl). Alles andere ist verschlüsselt.
- Wer Zugriff auf das entsperrte Gerät hat, während du angemeldet bist, kann die Daten sehen.
- Sicherungen (Profil → Sicherung) sind verschlüsselt und lassen sich auf der Anmeldeseite wieder importieren.
- CSV-Exporte sind **nicht** verschlüsselt.

### Weitere Schutzmaßnahmen

- **Schutz vor Raten:** Ab dem 3. falschen Passwort wächst die Wartezeit (5, 10, 20 … höchstens 15 Minuten). Der Zähler liegt im Speicher und überlebt ein Neuladen. Gilt auch für „Passwort ändern“ und „Profil löschen“. Das ersetzt kein starkes Passwort: Wer den gestohlenen Speicher offline angreift, wird dadurch nicht gebremst.
- **Profilnamen verbergen (optional):** Profil → „Datenschutz auf diesem Gerät“. Dann zeigt die Anmeldeseite keine Profilliste, du tippst den Namen ein. Bei unbekanntem Namen und falschem Passwort erscheint dieselbe Meldung, auch die Antwortzeit ist gleich.
- **Sichtschutz:** Sobald die App im Hintergrund ist (App-Umschalter, Tab-Wechsel), deckt ein Schutzschirm den Inhalt ab. Nach 2 Minuten im Hintergrund wird automatisch abgemeldet (`HIDDEN_LOCK_MINUTES`).
- **Aufräumen beim Abmelden:** Passwörter und alle angezeigten Gesundheitsdaten werden aus der Seite entfernt.
- **Datensatz fester gebunden:** Die Verschlüsselung ist an Profil-ID, Name, Rundenzahl und Salt gebunden. Vertauschte oder veränderte Datensätze führen zu einer Fehlermeldung statt zu falschen Daten. Die Daten werden auf Vielfache von 4 KB aufgefüllt, Zeitstempel werden nicht gespeichert.
- **Grenze:** Wer den kompletten Speicher kontrolliert, kann einen *älteren, gültigen* Stand desselben Profils zurückspielen (Rollback). Das lässt sich ohne externen Speicher nicht verhindern.
- **Daten werden beim Öffnen geprüft:** Jedes Feld wird auf Typ und Länge geprüft, unerwartete Schlüssel fallen weg. Texte werden vor der Anzeige maskiert.
- **Sicherungen importieren:** Streng geprüft (Format, Längen, Rundenzahl, Version), Zusatzfelder werden verworfen. Eine Sicherung bleibt mit dem Passwort lesbar, mit dem sie erstellt wurde, auch nach einem Passwortwechsel. Alte Sicherungen deshalb löschen.
- **Keine Autovervollständigung** und keine Cloud-Rechtschreibprüfung für Gesundheitsfelder (`autocomplete="off"`, `spellcheck="false"`).
- **Netzwerksperre:** `index.html` verbietet der App jede Verbindung zu anderen Servern (`connect-src 'none'`). Über `start.sh` / `start.bat` (`server.py`) gilt zusätzlich eine strenge Richtlinie als echter HTTP-Header, mit Schutz vor Einbettung in fremde Seiten.
- **`server.py`:** liefert nur die App-Dateien aus (keine Verzeichnisliste, nichts aus `node_modules`, `.git`, Sicherungen), hört nur auf 127.0.0.1 und weist falsche Hostnamen ab.
- **Offline-Speicher:** Der Service Worker legt nur einwandfreie Antworten ab und liefert bei fehlenden Dateien keine falsche Seite aus.

## Hosting absichern (GitHub Pages)

Bei einer Web-App wird der Programmcode bei jedem Laden vom Server geholt. Wer dein GitHub-Konto übernimmt, könnte den
Code so ändern, dass er dein Passwort mitliest. Deine Daten selbst liegen nicht auf GitHub, aber der Code, der sie
entschlüsselt. Darum:

1. **Zwei-Faktor-Anmeldung** für das GitHub-Konto aktivieren (Passkey oder Authenticator-App).
2. Im Repository **Branch-Schutz** für `main` einschalten und Commits **signieren** (Settings → Branches / SSH- oder GPG-Signatur).
3. **Eigene (Sub-)Domain nur für diese App** verwenden. Alle Seiten unter derselben `*.github.io`-Adresse teilen sich
   den Browser-Speicher; die App zeigt bei `github.io` deshalb einen Warnhinweis.
4. Keine weiteren fremden Skripte oder Seiten auf derselben Adresse betreiben.
5. Wer maximale Sicherheit will, nutzt die App **nur lokal** (`start.sh` / `start.bat`): Dann wird kein Code aus dem
   Internet nachgeladen.
6. Bei **Cloudflare Pages** oder **Netlify** gilt die Datei `_headers` (strenge Sicherheits-Header, Schutz vor Einbettung in fremde Seiten). GitHub Pages kann keine eigenen Header senden – dort gilt nur die Meta-Richtlinie in `index.html`.
7. Vor dem Übernehmen neuer Versionen die Änderungen ansehen (`git diff`) und bei Änderungen an den Dateien
   `CACHE_VERSION` in `sw.js` erhöhen.

## Wo ändere ich was?

| Wunsch | Datei / Stelle |
|---|---|
| Symptom-Liste, Grenzwerte, Auto-Abmeldung | `js/app.js`, oben: `CONFIG` |
| Neue Eingabefelder bei Vitalwerten | `js/app.js`: `entryVitals()` und `forms['vitals-save']` |
| Weitere Reiter / Ansichten | `js/app.js`: `viewEntry()`, `viewHistory()` |
| Aussehen der Buttons, Karten | `src/input.css` (danach `npm run build:css`) |
| Diagramm-Farben | `css/app.css` |
| Anzahl PBKDF2-Runden | `js/vault.js`: `ITERATIONS` |
| Wartezeit nach Fehlversuchen, Zeit im Hintergrund | `js/app.js`: `CONFIG.FREE_ATTEMPTS`, `CONFIG.HIDDEN_LOCK_MINUTES` |
| Mindestlänge / Regeln fürs Passwort | `js/app.js`: `CONFIG.MIN_PASSWORD_LENGTH`, `js/util.js`: `passwordCheck()` |
| Offline-Cache aktualisieren | `sw.js`: `CACHE_VERSION` erhöhen |

## Datenstruktur (entschlüsselt)

```
{ profile:  { displayName, birthYear, heightCm, notes },
  settings: { customSymptoms: [] },
  vitals:   [ { id, date, time, sys, dia, pulse, weight } ],      // mehrere pro Tag
  daily:    { "JJJJ-MM-TT": { mood, symptoms, comment, updated } } // genau einer pro Tag
}
```
