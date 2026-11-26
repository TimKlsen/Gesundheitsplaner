#!/usr/bin/env bash
# =====================================================================
#  start.sh – startet "Meine Werte" nur auf diesem Rechner (Linux/macOS)
#
#  - Der Server hört nur auf 127.0.0.1, ist also aus dem Netzwerk
#    NICHT erreichbar.
#  - Benutze immer denselben Port (7070). Die Daten im Browser gehören
#    zur Adresse http://localhost:7070 – bei einem anderen Port
#    startet die App leer.
#  - Terminal-Fenster offen lassen, solange du die App nutzt.
#    Beenden mit Strg+C.
# =====================================================================
cd "$(dirname "$0")" || exit 1
PORT=7070
URL="http://localhost:${PORT}/index.html"

command -v python3 >/dev/null 2>&1 || { echo "python3 wird benötigt (sudo apt install python3)."; exit 1; }

echo "Meine Werte läuft auf ${URL}  (beenden mit Strg+C)"
( sleep 1; xdg-open "$URL" >/dev/null 2>&1 || open "$URL" >/dev/null 2>&1 ) &
export PORT
exec python3 server.py
