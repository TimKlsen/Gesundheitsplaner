@echo off
rem =====================================================================
rem  start.bat - startet "Meine Werte" nur auf diesem Rechner (Windows)
rem
rem  - Der Server hoert nur auf 127.0.0.1, ist also aus dem Netzwerk
rem    NICHT erreichbar.
rem  - Immer denselben Port (7070) benutzen. Die Daten im Browser gehoeren
rem    zur Adresse http://localhost:7070 - bei einem anderen Port startet
rem    die App leer.
rem  - Dieses Fenster offen lassen, solange die App genutzt wird.
rem    Beenden mit Strg+C oder Fenster schliessen.
rem  - Benoetigt Python (https://www.python.org/downloads/).
rem =====================================================================
cd /d "%~dp0"
set PORT=7070
set PY=

where py >nul 2>nul
if %errorlevel%==0 set PY=py
if not defined PY (
  where python >nul 2>nul
  if %errorlevel%==0 set PY=python
)
if not defined PY (
  echo Python wurde nicht gefunden. Bitte von https://www.python.org/downloads/ installieren.
  pause
  exit /b 1
)

echo Meine Werte laeuft auf http://localhost:%PORT%/index.html  (beenden mit Strg+C)
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:%PORT%/index.html"
%PY% server.py
