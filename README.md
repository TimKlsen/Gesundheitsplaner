# Gesundheitstagebuch
 
Eine kleine, verschlüsselte Web-App als persönliches Gesundheitstagebuch. Sie läuft komplett im Browser, speichert alle Daten **nur lokal auf dem Gerät** und ist für das iPhone (Safari, Installation auf den Home-Bildschirm) ausgelegt. Es gibt keinen Server, keine Cloud und kein Tracking.
 
> **Hinweis:** Das Tagebuch ist ein privates Notizbuch und kein Medizinprodukt. Es stellt keine Diagnosen und ersetzt keine ärztliche Beratung.
 
## Funktionen
 
- **Profil:** Vorname, Nachname, Geburtsdatum, Geschlecht und optional Erkrankungen mit Diagnose und Datum
- **Tageseinträge:**
  - Blutdruck (oben und unten) und Puls
  - Tagesbefinden (Dropdown von sehr gut bis sehr schlecht)
  - Herzrasen (Ja oder Nein, bei Ja Dauer in Minuten und Uhrzeit)
  - Erkältung (Dropdown, zum Beispiel Schnupfen, Husten, Halskratzen)
  - Kopfschmerzen (Ja oder Nein, bei Ja Stärke von 1 bis 10 und Uhrzeit)
  - Getrunkene Menge in Millilitern
  - Freitext: Was hat meinen Tag geprägt?
- **Verlauf:** alle Einträge, neueste zuerst, mit Löschen-Knopf
- **Auswertung:** Durchschnittswerte, Kopfschmerztage, Herzrasen-Übersicht und ein Vergleich der Trinkmenge an Tagen mit und ohne Kopfschmerzen, jeweils für 7 Tage, 30 Tage oder alles
- **Diagramme:** Blutdruck, Puls und Kopfschmerzstärke, selbst gezeichnet mit SVG, ohne Diagramm-Bibliothek
- **Backup:** verschlüsselter Export und Import als Datei
- **Zwischenspeicher:** ein halbfertiges Formular geht beim Wechsel in eine andere App nicht verloren
## Sicherheitskonzept
 
| Baustein | Umsetzung |
| --- | --- |
| Verschlüsselung | AES-GCM mit 256 Bit über die Web Crypto API des Browsers, mit eigenem Zufallswert (IV) pro Eintrag |
| Schlüsselableitung | PBKDF2 mit SHA-256, 600.000 Durchläufen und zufälligem Salt. SHA ist hier nur ein Baustein der Ableitung, nicht die Verschlüsselung selbst |
| Passwort | wird nie gespeichert, der Schlüssel liegt nur im Arbeitsspeicher, solange die App entsperrt ist |
| Fehlversuche | nach 10 falschen Passwörtern werden alle Daten samt Salt gelöscht |
| Automatische Sperre | nach 120 Sekunden ohne Eingabe sowie sofort, wenn die App in den Hintergrund geht oder das Handy gesperrt wird |
| Backup | die Backup-Datei enthält nur verschlüsselte Daten und den Salt und ist ohne Passwort nicht lesbar |
| Zwischenspeicher | der Formular-Entwurf wird mit demselben Schlüssel verschlüsselt abgelegt und nach dem Speichern gelöscht |
| Fremdcode | keine externen Bibliotheken zur Laufzeit, wenn Tailwind lokal eingebunden wird (siehe Installation) |
 
### Grenzen, die du kennen solltest
 
- **Kein Passwort-Reset.** Ist das Passwort vergessen, sind die Daten unwiederbringlich verloren.
- **Der Fehlversuch-Zähler ist eine Zusatzschicht, kein Allheilmittel.** Wer die verschlüsselten Daten kopiert und außerhalb der App offline weiter probiert, umgeht ihn. Den eigentlichen Schutz bietet ein langes, starkes Passwort, am besten eine Passphrase aus mehreren Wörtern.
- **Ein übernommenes Gerät schützt keine App vollständig.** Schadsoftware kann mitlesen, während die App entsperrt ist. Setze deshalb auf dem iPhone einen langen Code und halte iOS aktuell.
- **Safari kann lokale Webdaten löschen**, wenn eine Seite sehr lange nicht genutzt wird. Erstelle regelmäßig ein Backup.
- **Die Backup-Datei gehört nie in ein öffentliches Repository.** Auch verschlüsselt ist sie nur so sicher wie dein Passwort.
## Technik
 
- HTML, CSS mit Tailwind und JavaScript, alles in einer `index.html`
- Speicherung: IndexedDB im Browser
- Verschlüsselung: Web Crypto API (AES-GCM, PBKDF2 mit SHA-256)
- Installierbar als Progressive Web App über Manifest und Service Worker
- Kein PHP und kein SQL-Server nötig, weil die Daten lokal bleiben
## Projektstruktur
 
```
gesundheitstagebuch/
├── index.html          App mit Oberfläche und gesamter Logik
├── manifest.json       Beschreibung der App für das iPhone
├── service-worker.js   Offline-Betrieb
├── tailwind.js         lokale Kopie von Tailwind
├── icon-192.png        App-Symbol
└── icon-512.png        App-Symbol
```
 
Für den ersten Test reicht die `index.html` allein.
 
## Lokal ausprobieren
 
1. Projektordner in Visual Studio Code öffnen.
2. Die Erweiterung **Live Preview** von Microsoft installieren.
3. Rechtsklick auf `index.html`, dann **Show Preview**.
Die Verschlüsselung funktioniert nur über `localhost` oder HTTPS, die Vorschau läuft über `localhost`. Eine direkt per Doppelklick geöffnete Datei funktioniert nicht zuverlässig.
 
**Zum Zurücksetzen beim Testen:** im Browser `F12`, dann **Application** und **IndexedDB**, die Datenbank `gesundheitstagebuch` löschen und die Seite neu laden.
 
## Installation auf dem iPhone
 
1. Alle Dateien in ein GitHub-Repository hochladen. **Es darf nur Programmcode darin liegen, niemals Backups oder echte Daten**, weil GitHub Pages öffentlich ist.
2. Im Repository unter **Settings**, **Pages** den Branch `main` und den Ordner `root` wählen.
3. Die erzeugte Adresse (`benutzername.github.io/repository-name`) in **Safari** auf dem iPhone öffnen.
4. Teilen-Symbol antippen, dann **Zum Home-Bildschirm**.
5. Profil und Passwort **erst in der installierten App** anlegen. Die Home-Bildschirm-App hat auf iOS einen eigenen Speicher, getrennt von Safari.
### Tailwind lokal einbinden
 
Damit die App offline gut aussieht und kein Fremdcode nachgeladen wird:
 
1. `https://cdn.tailwindcss.com` im Browser öffnen, den Text kopieren und als `tailwind.js` im Projektordner speichern.
2. In der `index.html` den Script-Tag von `cdn.tailwindcss.com` ersetzen durch `<script src="tailwind.js"></script>`.
### Aktualisieren
 
Nach Code-Änderungen in `service-worker.js` die Cache-Version erhöhen (`tagebuch-v2` statt `tagebuch-v1`), sonst zeigt das iPhone weiter die alte Fassung.
 
## Backup und Wiederherstellung
 
- **Backup erstellen:** lädt eine verschlüsselte JSON-Datei herunter. In der Dateien-App und zusätzlich an einem zweiten Ort sichern.
- **Backup einspielen:** ersetzt alle aktuellen Daten. Die App fragt zuerst das Backup-Passwort ab und prüft es, bevor etwas überschrieben wird. Bei falschem Passwort bleibt alles unverändert.
## Status und Roadmap
 
Die App ist ein Prototyp in Entwicklung. Der Code wurde bisher nicht automatisiert getestet, bitte mit Testeinträgen ausprobieren, bevor echte Daten hineinkommen.
 
Geplant:
 
- [ ] Einträge bearbeiten (bisher nur löschen)
- [ ] PDF-Bericht für den Arzt, mit Passwortschutz
- [ ] Passkey mit Touch ID als zweiter Faktor (optional, wird am Ende entschieden)
## Haftungsausschluss
 
Die Berechnungen in der Auswertung sind reine Rechenwerte für das persönliche Tagebuch und keine medizinische Bewertung. Bei auffälligen Werten oder Beschwerden, zum Beispiel wiederkehrendem Herzrasen, wende dich bitte an deine Ärztin oder deinen Arzt.
 
