#!/usr/bin/env python3
"""
server.py – kleiner, abgesicherter lokaler Server für "Meine Werte"

Warum nicht einfach "python -m http.server"?
  - Dieser Server liefert NUR die App-Dateien aus (index.html, css/, js/, icons/ ...).
    Alles andere im Ordner (Sicherungen, README, .git, node_modules ...) bleibt unerreichbar.
  - Es gibt keine Verzeichnisliste.
  - Er hört nur auf 127.0.0.1 und akzeptiert nur Anfragen mit dem Host "localhost" /
    "127.0.0.1" (Schutz vor "DNS-Rebinding").
  - Er sendet strenge Sicherheits-Header (siehe HEADERS), u. a. Netzwerksperre,
    Schutz vor Einbettung in fremde Seiten und kein Referrer.

Start:   python3 server.py            (Port 7070)
         PORT=7071 python3 server.py   (anderer Port)
Beenden: Strg+C
"""
import http.server
import os
import socketserver
import sys
import urllib.parse

HOST = "127.0.0.1"
PORT = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 7070))
ROOT = os.path.dirname(os.path.abspath(__file__))

# Nur diese Dateien werden ausgeliefert ...
ALLOWED_FILES = {"index.html", "sw.js", "manifest.webmanifest"}
# ... und aus diesen Ordnern nur Dateien mit diesen Endungen
ALLOWED_DIRS = {"css": (".css",), "js": (".js",), "icons": (".png", ".svg")}

TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".webmanifest": "application/manifest+json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
}

HEADERS = {
    "Content-Security-Policy": (
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
        "font-src 'self'; connect-src 'none'; media-src 'none'; object-src 'none'; "
        "frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; "
        "manifest-src 'self'; worker-src 'self'"
    ),
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Cache-Control": "no-cache",
}

ALLOWED_HOSTS = {f"localhost:{PORT}", f"127.0.0.1:{PORT}", f"[::1]:{PORT}"}


def resolve(url_path):
    """Wandelt eine URL in einen Dateipfad um – nur für erlaubte Dateien, sonst None."""
    path = urllib.parse.unquote(url_path.split("?", 1)[0].split("#", 1)[0])
    if path in ("", "/"):
        path = "/index.html"
    rel = path.lstrip("/")
    if "\\" in rel or "\x00" in rel:
        return None
    parts = rel.split("/")
    if any(p in ("", ".", "..") or p.startswith(".") for p in parts):
        return None
    if len(parts) == 1 and parts[0] in ALLOWED_FILES:
        pass
    elif len(parts) == 2 and parts[0] in ALLOWED_DIRS and parts[1].lower().endswith(ALLOWED_DIRS[parts[0]]):
        pass
    else:
        return None
    full = os.path.realpath(os.path.join(ROOT, *parts))
    if not full.startswith(ROOT + os.sep) or not os.path.isfile(full):
        return None
    return full


class Handler(http.server.BaseHTTPRequestHandler):
    server_version = "MeineWerte"
    sys_version = ""

    def _send(self, code, body=b"", ctype="text/plain; charset=utf-8", head_only=False):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for name, value in HEADERS.items():
            self.send_header(name, value)
        self.end_headers()
        if not head_only:
            self.wfile.write(body)

    def _handle(self, head_only):
        if self.headers.get("Host", "") not in ALLOWED_HOSTS:
            return self._send(421, b"Falscher Host.", head_only=head_only)
        full = resolve(self.path)
        if full is None:
            return self._send(404, b"Nicht gefunden.", head_only=head_only)
        with open(full, "rb") as fh:
            body = fh.read()
        ctype = TYPES.get(os.path.splitext(full)[1].lower(), "application/octet-stream")
        return self._send(200, body, ctype, head_only)

    def do_GET(self):
        self._handle(False)

    def do_HEAD(self):
        self._handle(True)

    def _method_not_allowed(self):
        self._send(405, b"Nicht erlaubt.")

    do_POST = do_PUT = do_DELETE = do_PATCH = do_OPTIONS = _method_not_allowed

    def log_message(self, fmt, *args):  # ruhig bleiben; nur Fehler anzeigen
        if len(args) > 1 and str(args[1]).startswith(("4", "5")):
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    try:
        httpd = Server((HOST, PORT), Handler)
    except OSError as err:
        print(f"Port {PORT} konnte nicht geöffnet werden ({err}). Ist er schon belegt?")
        sys.exit(1)
    print(f"Meine Werte läuft auf http://localhost:{PORT}/index.html  (beenden mit Strg+C)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nBeendet.")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
