/* =====================================================================
 *  store.js – lokale Speicherung im Browser (localStorage)
 *
 *  Gespeichert wird NUR auf diesem Gerät. Die Gesundheitsdaten liegen
 *  verschlüsselt im Profil-Datensatz (siehe vault.js). Es gibt keine
 *  Server-Anfragen.
 *
 *  Schlüssel im localStorage:
 *    mw2:profiles  -> Liste aller (verschlüsselten) Profile
 *    mw2:theme     -> 'dark' | 'light' (fehlt = Systemeinstellung)
 *    mw2:settings  -> Geräteeinstellungen, z. B. { hideProfiles: true }
 *    mw2:fails     -> Zähler für Fehlversuche bei der Anmeldung (pro Profil)
 * ===================================================================== */
const Store = (() => {
  'use strict';

  const KEY_PROFILES = 'mw2:profiles';
  const KEY_THEME = 'mw2:theme';
  const KEY_SETTINGS = 'mw2:settings';
  const KEY_FAILS = 'mw2:fails';

  function readAll() {
    try {
      const raw = localStorage.getItem(KEY_PROFILES);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  /** Schreibt die Liste. Gibt false zurück, wenn der Browser das Speichern verweigert. */
  function writeAll(list) {
    try {
      localStorage.setItem(KEY_PROFILES, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Alle Profile (verschlüsselt). */
  function list() {
    return readAll();
  }

  function findById(id) {
    return readAll().find((p) => p.id === id) || null;
  }

  /** Anmeldenamen sind nicht von Groß-/Kleinschreibung abhängig. */
  function findByUsername(name) {
    const n = String(name).trim().toLowerCase();
    return readAll().find((p) => String(p.username).toLowerCase() === n) || null;
  }

  /** Legt ein Profil an oder aktualisiert es (anhand der id). */
  function upsert(record) {
    const all = readAll();
    const i = all.findIndex((p) => p.id === record.id);
    if (i >= 0) all[i] = record; else all.push(record);
    return writeAll(all);
  }

  function remove(id) {
    clearFail(id);
    return writeAll(readAll().filter((p) => p.id !== id));
  }

  /* ---------- Geräteeinstellungen (nicht verschlüsselt, enthalten keine Gesundheitsdaten) ---------- */
  function getSettings() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY_SETTINGS) || '{}');
      return o && typeof o === 'object' ? o : {};
    } catch (e) { return {}; }
  }
  function setSetting(name, value) {
    const s = getSettings();
    s[name] = value;
    try { localStorage.setItem(KEY_SETTINGS, JSON.stringify(s)); return true; } catch (e) { return false; }
  }

  /* ---------- Fehlversuche bei der Anmeldung ---------- */
  // Gespeichert (nicht nur im Arbeitsspeicher), damit ein Neuladen der Seite die Sperre nicht aufhebt.
  function readFails() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY_FAILS) || '{}');
      return o && typeof o === 'object' ? o : {};
    } catch (e) { return {}; }
  }
  function writeFails(o) {
    try { localStorage.setItem(KEY_FAILS, JSON.stringify(o)); } catch (e) { /* egal */ }
  }
  /** { n: Anzahl Fehlversuche, until: gesperrt bis (ms seit 1970) } */
  function getFail(key) {
    const f = readFails()[key];
    return f && typeof f === 'object'
      ? { n: Number(f.n) || 0, until: Number(f.until) || 0 }
      : { n: 0, until: 0 };
  }
  function setFail(key, value) {
    const all = readFails();
    all[key] = { n: value.n, until: value.until };
    writeFails(all);
  }
  function clearFail(key) {
    const all = readFails();
    if (key in all) { delete all[key]; writeFails(all); }
  }

  /* ---------- Hell/Dunkel ---------- */
  function getTheme() {
    try { return localStorage.getItem(KEY_THEME); } catch (e) { return null; }
  }
  function setTheme(value) {
    try { localStorage.setItem(KEY_THEME, value); } catch (e) { /* egal */ }
  }

  /** Bittet den Browser, die Daten nicht automatisch zu löschen (wo unterstützt). */
  function requestPersistence() {
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    } catch (e) { /* egal */ }
  }

  return {
    list, findById, findByUsername, upsert, remove, getTheme, setTheme, requestPersistence,
    getSettings, setSetting, getFail, setFail, clearFail,
  };
})();
