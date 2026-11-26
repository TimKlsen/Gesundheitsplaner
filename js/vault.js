/* =====================================================================
 *  vault.js – Passwortschutz und Verschlüsselung (alles lokal)
 *
 *  Ablauf, vereinfacht:
 *   1. Aus Passwort + zufälligem Salt entsteht mit PBKDF2-SHA-256
 *      (viele Wiederholungen) ein Hauptschlüssel.
 *   2. Aus dem Hauptschlüssel werden per HKDF zwei getrennte Werte
 *      abgeleitet:
 *        - "verifier": wird gespeichert und dient nur zur Prüfung,
 *                      ob das Passwort stimmt (das Passwort selbst
 *                      wird NIE gespeichert).
 *        - AES-Schlüssel: bleibt nur im Arbeitsspeicher und
 *                      verschlüsselt alle Gesundheitsdaten mit AES-256-GCM.
 *   3. Ohne das richtige Passwort sind die gespeicherten Daten
 *      nicht lesbar. Es gibt keine "Passwort vergessen"-Funktion!
 *
 *  Zusätzlicher Schutz (Datensatz-Version 2):
 *   - Die Verschlüsselung ist per "Additional Authenticated Data" an
 *     Profil-Kennung, Profilname, Rundenzahl und Salt gebunden. Wer
 *     im Speicher Datensätze vertauscht oder Angaben ändert, bekommt
 *     einen Fehler statt falscher Daten.
 *   - Die Klartext-Daten werden vor dem Verschlüsseln auf ein
 *     Vielfaches von 4 KB aufgefüllt, damit man von außen nicht
 *     erkennt, wie viele Einträge ein Profil hat.
 *   - Es werden keine Zeitstempel im Datensatz gespeichert.
 *   - Grenze: Wer den kompletten Speicher kontrolliert, kann einen
 *     ÄLTEREN, gültigen Stand desselben Profils zurückspielen
 *     (Rollback). Das lässt sich ohne externen Speicher nicht verhindern.
 *
 *  Hinweis zu "SSH": SSH ist ein Protokoll für Fernzugriffe, nicht für
 *  Passwörter in einer App. Hier wird stattdessen der Standard
 *  SHA-256 (PBKDF2) aus dem Browser (Web Crypto API) verwendet.
 *  Es werden keine Daten über ein Netzwerk gesendet.
 * ===================================================================== */
const Vault = (() => {
  'use strict';

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  // Anzahl der PBKDF2-Wiederholungen. Höher = sicherer, aber langsamer.
  // 600 000 entspricht der aktuellen OWASP-Empfehlung für PBKDF2-HMAC-SHA256.
  // Der Wert wird pro Profil mitgespeichert. Ältere Profile mit weniger
  // Runden werden beim nächsten Login automatisch aufgewertet (siehe app.js).
  const ITERATIONS = 600000;
  const MAX_ITERATIONS = 2000000; // Obergrenze beim Import fremder Dateien

  // Datensatz-Version: 1 = ohne Bindung, 2 = mit Bindung (AAD) und Auffüllung.
  const VERSION = 2;

  // Auffüllung der Klartext-Daten (Bytes)
  const PAD_BLOCK = 4096;

  /** Gibt es die Verschlüsselungsfunktionen? (nur über https oder localhost) */
  function available() {
    return typeof crypto !== 'undefined' && !!crypto.subtle && !!crypto.getRandomValues;
  }

  /* ---------- Umwandlung Bytes <-> Text (Base64) ---------- */
  function toB64(buffer) {
    const bytes = new Uint8Array(buffer);
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function fromB64(str) {
    const s = atob(str);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function randomBytes(n) {
    return crypto.getRandomValues(new Uint8Array(n));
  }

  /** Vergleich zweier Texte ohne vorzeitigen Abbruch. */
  function sameString(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  /**
   * Leitet aus Passwort + Salt den Prüfwert und den AES-Schlüssel ab.
   * Der AES-Schlüssel ist "nicht exportierbar": Der Browser gibt ihn
   * nicht heraus, man kann ihn nur zum Ver-/Entschlüsseln benutzen.
   */
  async function deriveKeys(password, salt, iterations) {
    const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const master = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, 256);

    const hkdf = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveBits', 'deriveKey']);
    const zeroSalt = new Uint8Array(32);

    const verifierBits = await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: zeroSalt, info: enc.encode('meine-werte/verifier') }, hkdf, 256);

    const key = await crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: zeroSalt, info: enc.encode('meine-werte/daten') },
      hkdf, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);

    return { verifier: toB64(verifierBits), key };
  }

  /**
   * Zusätzlich beglaubigte Daten (AAD): bindet die Verschlüsselung an die
   * Angaben des Datensatzes. Nur für Version 2; ältere Datensätze: keine.
   */
  function aadFor(record) {
    if (record.v !== 2) return undefined;
    return enc.encode(['meine-werte', record.id, record.username, record.iterations, record.salt].join('|'));
  }

  /** Füllt Bytes mit Leerzeichen auf ein Vielfaches von PAD_BLOCK auf (JSON ignoriert Leerraum am Ende). */
  function pad(bytes) {
    const size = Math.ceil((bytes.length + 1) / PAD_BLOCK) * PAD_BLOCK;
    const out = new Uint8Array(size).fill(0x20);
    out.set(bytes);
    return out;
  }

  /** Verschlüsselt ein Objekt (als JSON). Jedes Mal mit neuem IV. */
  async function encryptJson(key, obj, aad) {
    const iv = randomBytes(12);
    const params = { name: 'AES-GCM', iv };
    if (aad) params.additionalData = aad;
    const plain = aad ? pad(enc.encode(JSON.stringify(obj))) : enc.encode(JSON.stringify(obj));
    const ct = await crypto.subtle.encrypt(params, key, plain);
    return { iv: toB64(iv), ct: toB64(ct) };
  }

  /** Entschlüsselt. Schlägt fehl, wenn Schlüssel falsch oder Daten verändert wurden. */
  async function decryptJson(key, iv, ct, aad) {
    const params = { name: 'AES-GCM', iv: fromB64(iv) };
    if (aad) params.additionalData = aad;
    const buf = await crypto.subtle.decrypt(params, key, fromB64(ct));
    return JSON.parse(dec.decode(buf));
  }

  /** Entfernt alte Zeitstempel-Felder (frühere Versionen speicherten created/updated). */
  function stripLegacy(record) {
    const { created, updated, ...rest } = record;
    return rest;
  }

  /* ---------- Öffentliche Funktionen ---------- */

  /** Legt einen neuen, verschlüsselten Profil-Datensatz an. */
  async function createRecord(username, password, data) {
    const salt = randomBytes(16);
    const { verifier, key } = await deriveKeys(password, salt, ITERATIONS);
    const head = {
      id: Util.uid(),
      v: VERSION,
      username,                 // Anmeldename (unverschlüsselt; auf Wunsch wird er auf der Anmeldeseite nicht angezeigt)
      iterations: ITERATIONS,
      salt: toB64(salt),
      verifier,
    };
    const sealed = await encryptJson(key, data, aadFor(head));
    return { record: { ...head, iv: sealed.iv, ct: sealed.ct }, key };
  }

  /** Prüft das Passwort. Gibt true/false zurück. */
  async function verify(record, password) {
    const { verifier } = await deriveKeys(password, fromB64(record.salt), record.iterations);
    return sameString(verifier, record.verifier);
  }

  /** Rechnet genauso lange wie eine echte Prüfung (gegen Rückschlüsse aus der Antwortzeit). */
  async function dummy(password) {
    await deriveKeys(password, new Uint8Array(16), ITERATIONS);
  }

  /** Entsperrt ein Profil. Wirft bei falschem Passwort einen Fehler mit code 'BAD_PASSWORD'. */
  async function unlock(record, password) {
    const { verifier, key } = await deriveKeys(password, fromB64(record.salt), record.iterations);
    if (!sameString(verifier, record.verifier)) {
      const err = new Error('Das Passwort ist falsch.');
      err.code = 'BAD_PASSWORD';
      throw err;
    }
    try {
      const data = await decryptJson(key, record.iv, record.ct, aadFor(record));
      return { key, data };
    } catch (e) {
      throw new Error('Die Daten konnten nicht entschlüsselt werden (beschädigt oder verändert?).');
    }
  }

  /** Verschlüsselt die aktuellen Daten neu und liefert den aktualisierten Datensatz. */
  async function reseal(record, key, data) {
    const sealed = await encryptJson(key, data, aadFor(record));
    return { ...stripLegacy(record), iv: sealed.iv, ct: sealed.ct };
  }

  /**
   * Neues Passwort (oder Aufwertung eines alten Datensatzes mit gleichem Passwort):
   * neues Salt, neuer Schlüssel, aktuelle Version, Daten neu verschlüsseln.
   */
  async function changePassword(record, newPassword, data) {
    const salt = randomBytes(16);
    const { verifier, key } = await deriveKeys(newPassword, salt, ITERATIONS);
    const head = { ...stripLegacy(record), v: VERSION, iterations: ITERATIONS, salt: toB64(salt), verifier };
    const sealed = await encryptJson(key, data, aadFor(head));
    return { record: { ...head, iv: sealed.iv, ct: sealed.ct }, key };
  }

  return { available, createRecord, verify, dummy, unlock, reseal, changePassword, ITERATIONS, MAX_ITERATIONS, VERSION };
})();
