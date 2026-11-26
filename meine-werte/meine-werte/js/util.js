/* =====================================================================
 *  util.js – kleine Hilfsfunktionen ohne Abhängigkeiten
 *  Wird als Erstes geladen; alle anderen Dateien dürfen `Util` nutzen.
 * ===================================================================== */
const Util = (() => {
  'use strict';

  const pad = (n) => String(n).padStart(2, '0');

  /**
   * Macht Text für die Ausgabe in HTML unschädlich.
   * WICHTIG: Alles, was der Nutzer eintippt (Kommentare, Namen, eigene
   * Symptome), muss vor dem Einfügen per innerHTML durch esc() laufen.
   */
  function esc(value) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value ?? '').replace(/[&<>"']/g, (c) => map[c]);
  }

  /** Heutiges Datum als 'JJJJ-MM-TT' (lokale Zeit, nicht UTC). */
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /** Datum von vor n Tagen als 'JJJJ-MM-TT'. */
  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /** Aktuelle Uhrzeit als 'HH:MM'. */
  function nowTime() {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /** '2026-11-24' -> 'Di., 24.11.2026' */
  function formatDate(iso) {
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  /** Text -> Zahl (akzeptiert Komma und Punkt). Leer/ungültig -> null. */
  function num(value) {
    if (value === null || value === undefined) return null;
    const s = String(value).trim().replace(',', '.');
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  /** Zahl für die Anzeige mit Komma: 75.5 -> '75,5' */
  function fmtNum(n) {
    return String(n).replace('.', ',');
  }

  /** Zufällige ID (hex) für Profile und Messungen. */
  function uid() {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  /** Startet den Download einer Datei im Browser (ohne Server). */
  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Erkennt den Bereich: 'ios' | 'android' | 'desktop'. */
  function detectPlatform() {
    const ua = navigator.userAgent || '';
    // iPadOS meldet sich als Mac, hat aber einen Touchscreen
    const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'desktop';
  }

  /** true, wenn die App bereits als installierte App läuft. */
  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      || navigator.standalone === true;
  }

  /** Dateinamen-sicherer Text. */
  function slug(text) {
    return String(text).replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) || 'profil';
  }

  /* ---------- Passwortprüfung ---------- */

  // Sehr häufige Wörter/Muster, die in Passwörtern nichts verloren haben
  const WEAK_PARTS = [
    'passwort', 'password', 'passw0rd', 'qwert', 'asdf', '12345', 'abcdef', 'letmein',
    'welcome', 'willkommen', 'geheim', 'admin', 'iloveyou', 'fussball', 'master',
  ];

  /**
   * Grobe Einschätzung der Passwortstärke (kein Ersatz für ein gutes Passwort!).
   * Gibt zurück: { ok, level (0-3), bits, problems[] }
   *  - level 1 = schwach, 2 = mittel, 3 = stark
   *  - ok = true, wenn alle Mindestanforderungen erfüllt sind
   * Tipp: Mehrere zufällige Wörter hintereinander (Passphrase) sind
   * leichter zu merken und trotzdem stark.
   */
  function passwordCheck(pw, username, minLength) {
    const problems = [];
    const lower = pw.toLowerCase();
    const unique = new Set(pw).size;

    if (pw.length < minLength) problems.push(`mindestens ${minLength} Zeichen nötig`);
    if (WEAK_PARTS.some((p) => lower.includes(p))) problems.push('enthält ein sehr häufiges Wort oder Muster');
    const u = String(username || '').trim().toLowerCase();
    if (u.length >= 3 && lower.includes(u)) problems.push('darf den Profilnamen nicht enthalten');
    if (pw.length > 0 && unique < 6) problems.push('zu wenige verschiedene Zeichen');

    // Schätzung: Anzahl verschiedener Zeichen x Größe des genutzten Zeichenvorrats
    let pool = 0;
    if (/[a-zäöüß]/.test(pw)) pool += 26;
    if (/[A-ZÄÖÜ]/.test(pw)) pool += 26;
    if (/\d/.test(pw)) pool += 10;
    if (/[^A-Za-z0-9äöüÄÖÜß]/.test(pw)) pool += 33;
    const bits = Math.round(unique * Math.log2(pool || 1));
    if (pw.length >= minLength && bits < 40 && !problems.length) problems.push('zu leicht zu erraten – nimm mehrere Wörter oder mehr Zeichenarten');

    let level = 0;
    if (pw.length) level = bits < 40 ? 1 : bits < 60 ? 2 : 3;
    if (problems.length) level = Math.min(level, 1);
    return { ok: problems.length === 0, level, bits, problems };
  }

  return { esc, today, daysAgo, nowTime, formatDate, num, fmtNum, uid, download, detectPlatform, isStandalone, slug, passwordCheck };
})();
