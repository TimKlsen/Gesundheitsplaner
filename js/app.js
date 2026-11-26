/* =====================================================================
 *  app.js – Oberfläche und Programmlogik
 *
 *  Aufbau dieser Datei:
 *    1. Einstellungen (CONFIG)         <- hier kannst du vieles anpassen
 *    2. Zustand und kleine Helfer
 *    3. Daten-Funktionen (Speichern, Auslesen)
 *    4. Ansichten (HTML-Vorlagen)
 *    5. Aktionen und Formulare (was passiert bei Klick/Absenden)
 *    6. Start
 *
 *  Prinzip: Jede Ansicht ist eine Funktion, die HTML als Text liefert.
 *  render() setzt dieses HTML ein. Klicks werden zentral über
 *  data-action="..." (Buttons) und data-form="..." (Formulare)
 *  verteilt – siehe Abschnitt 5.
 * ===================================================================== */
const App = (() => {
  'use strict';

  /* ===================================================================
   *  1. EINSTELLUNGEN
   * =================================================================== */
  const CONFIG = {
    // Nach so vielen Minuten ohne Bedienung wird automatisch abgemeldet (0 = aus)
    AUTO_LOCK_MINUTES: 10,
    MIN_PASSWORD_LENGTH: 12,
    MAX_COMMENT_LENGTH: 2000,
    MAX_USERNAME_LENGTH: 32,

    // Anmeldeschutz: Ab dem 3. falschen Passwort wächst die Wartezeit
    // (5 s, 10 s, 20 s ... höchstens 15 Minuten). Der Zähler wird gespeichert.
    FREE_ATTEMPTS: 3,

    // Nach so vielen Minuten im Hintergrund (App-Wechsel) wird automatisch abgemeldet (0 = aus)
    HIDDEN_LOCK_MINUTES: 2,

    // Vorgegebene Symptome. Eigene kann man in der App hinzufügen.
    DEFAULT_SYMPTOMS: [
      'Kopfschmerzen', 'Herzrasen', 'Schnupfen', 'Husten', 'Halsschmerzen',
      'Schwindel', 'Müdigkeit', 'Übelkeit', 'Fieber', 'Atemnot',
      'Brustschmerzen', 'Rückenschmerzen', 'Schlafprobleme',
    ],

    // Tagesbefinden (Index 0 = Wert 1)
    MOODS: [
      { emoji: '😞', label: 'Schlecht' },
      { emoji: '😕', label: 'Nicht so gut' },
      { emoji: '😐', label: 'Okay' },
      { emoji: '🙂', label: 'Gut' },
      { emoji: '😄', label: 'Sehr gut' },
    ],

    // Plausibilitätsgrenzen [min, max] für die Eingabe
    LIMITS: {
      sys: [50, 260],
      dia: [30, 160],
      pulse: [25, 220],
      weight: [20, 400],
    },
  };

  /* ===================================================================
   *  2. ZUSTAND UND HELFER
   * =================================================================== */

  // Angemeldete Sitzung – nur im Arbeitsspeicher, nie gespeichert:
  // { record: verschlüsselter Datensatz, key: AES-Schlüssel, data: Klartext-Daten }
  let session = null;

  // Zustand der Oberfläche
  const state = {
    view: 'entry',          // 'entry' | 'history' | 'profile'
    entryTab: 'vitals',     // 'vitals' | 'symptoms' | 'comment'
    historyTab: 'vitals',   // 'vitals' | 'symptoms' | 'comments'
    metric: 'bp',           // Diagramm: 'bp' | 'pulse' | 'weight'
    date: Util.today(),     // Tag, für den gerade eingetragen wird
    draft: { mood: null, symptoms: [] }, // Entwurf der Symptome (noch nicht gespeichert)
    authMode: 'login',      // 'login' | 'register'
  };

  let lockTimer = null;
  let hiddenSince = 0;      // Zeitpunkt, seit dem die App im Hintergrund ist
  let lastActivity = Date.now();
  let installPrompt = null; // Android/Desktop-Chrome: "App installieren"-Ereignis

  const $ = (selector, root = document) => root.querySelector(selector);
  const el = {
    auth: $('#view-auth'),
    authContent: $('#auth-content'),
    app: $('#view-app'),
    content: $('#content'),
    title: $('#page-title'),
    navSide: $('#nav-side'),
    navBottom: $('#nav-bottom'),
    sideUser: $('#side-user'),
    toast: $('#toast'),
    cover: $('#privacy-cover'),
  };

  // Kleine Symbole (Feather-Stil, als SVG-Text)
  const ICONS = {
    plus: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
    chart: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  };
  const icon = (name, cls = 'h-6 w-6') =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

  const VIEWS = {
    entry:   { title: 'Eintragen', icon: 'plus' },
    history: { title: 'Verlauf',   icon: 'chart' },
    profile: { title: 'Profil',    icon: 'user' },
  };

  /** Kurze Meldung oben am Bildschirm. type: 'ok' | 'error' */
  let toastTimer = null;
  function toast(message, type = 'ok') {
    const box = el.toast;
    box.textContent = message;
    box.className = 'mt-4 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ' +
      (type === 'error'
        ? 'bg-red-700 text-white'
        : 'bg-teal-700 text-white dark:bg-teal-400 dark:text-slate-900');
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.hidden = true; }, type === 'error' ? 6000 : 2500);
  }

  /** Fehler (auch unerwartete) einheitlich anzeigen. */
  function showError(err) {
    console.error(err);
    toast(err && err.message ? err.message : 'Es ist ein Fehler aufgetreten.', 'error');
  }

  /* ===================================================================
   *  3. DATEN
   *
   *  Aufbau der entschlüsselten Daten (session.data):
   *  {
   *    version: 1,
   *    profile:  { displayName, birthYear, heightCm, notes },
   *    settings: { customSymptoms: ['...'] },
   *    vitals:   [ { id, date, time, sys, dia, pulse, weight } ],  // mehrere pro Tag erlaubt
   *    daily:    { 'JJJJ-MM-TT': { mood, symptoms, comment, updated } } // genau EIN Eintrag pro Tag
   *  }
   * =================================================================== */

  function newData(profile = {}) {
    return {
      version: 1,
      profile: { displayName: '', birthYear: null, heightCm: null, notes: '', ...profile },
      settings: { customSymptoms: [] },
      vitals: [],
      daily: {},
    };
  }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_RE = /^\d{2}:\d{2}$/;

  /**
   * Prüft und bereinigt entschlüsselte Daten, bevor die App damit arbeitet:
   * Jedes Feld wird auf den erwarteten Typ geprüft, Texte werden gekürzt,
   * unerwartete Schlüssel (z. B. "__proto__") fallen weg. So können auch
   * manipulierte Sicherungen keine Schadwirkung entfalten.
   */
  function normalize(data) {
    const d = data && typeof data === 'object' ? data : {};
    const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
    const names = (list) => (Array.isArray(list)
      ? list.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.slice(0, 40)).slice(0, 100)
      : []);

    const p = d.profile && typeof d.profile === 'object' ? d.profile : {};
    const profile = {
      displayName: text(p.displayName, 40),
      birthYear: num(p.birthYear),
      heightCm: num(p.heightCm),
      notes: text(p.notes, 1000),
    };

    const vitals = [];
    (Array.isArray(d.vitals) ? d.vitals : []).forEach((v) => {
      if (!v || typeof v !== 'object' || !DATE_RE.test(String(v.date))) return;
      vitals.push({
        id: text(v.id, 40) || Util.uid(),
        date: String(v.date),
        time: TIME_RE.test(String(v.time)) ? String(v.time) : '00:00',
        sys: num(v.sys), dia: num(v.dia), pulse: num(v.pulse), weight: num(v.weight),
      });
    });

    const daily = {};
    const src = d.daily && typeof d.daily === 'object' ? d.daily : {};
    Object.keys(src).forEach((date) => {
      const e = src[date];
      if (!DATE_RE.test(date) || !e || typeof e !== 'object') return;
      daily[date] = {
        mood: Number.isInteger(e.mood) && e.mood >= 1 && e.mood <= CONFIG.MOODS.length ? e.mood : null,
        symptoms: Array.isArray(e.symptoms) ? names(e.symptoms) : null,
        comment: text(e.comment, CONFIG.MAX_COMMENT_LENGTH),
        updated: num(e.updated) || 0,
      };
    });

    return { version: 1, profile, settings: { customSymptoms: names(d.settings && d.settings.customSymptoms) }, vitals, daily };
  }

  /** Verschlüsselt und speichert die aktuellen Daten. */
  async function persist() {
    const next = await Vault.reseal(session.record, session.key, session.data);
    if (!Store.upsert(next)) {
      throw new Error('Speichern nicht möglich (Speicher voll oder vom Browser gesperrt).');
    }
    session.record = next;
  }

  const sortedVitals = () =>
    session.data.vitals.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const vitalsOn = (date) => sortedVitals().filter((v) => v.date === date);

  /** Alle auswählbaren Symptome: Vorgaben + eigene + evtl. bereits gewählte. */
  function allSymptoms() {
    const list = [...CONFIG.DEFAULT_SYMPTOMS, ...session.data.settings.customSymptoms];
    state.draft.symptoms.forEach((s) => { if (!list.includes(s)) list.push(s); });
    return list;
  }

  function loadDraft() {
    const day = session.data.daily[state.date];
    state.draft = {
      mood: day && day.mood ? day.mood : null,
      symptoms: day && Array.isArray(day.symptoms) ? [...day.symptoms] : [],
    };
  }

  function displayName() {
    return session.data.profile.displayName || session.record.username;
  }

  /* ===================================================================
   *  4. ANSICHTEN (HTML-Vorlagen)
   * =================================================================== */

  /* ---------- Wiederverwendbare Bausteine ---------- */

  function inputField({ id, label, name, type = 'text', value = '', attrs = '', help = '', after = '' }) {
    return `<div>
      <label class="label" for="${id}">${label}</label>
      <input class="input" id="${id}" name="${name}" type="${type}" value="${Util.esc(value)}" ${/autocomplete=/.test(attrs) ? '' : 'autocomplete="off"'} ${attrs}>
      ${after}
      ${help ? `<p class="hint">${help}</p>` : ''}
    </div>`;
  }

  /** Platzhalter für die Passwort-Stärkeanzeige (wird von updateMeter() gefüllt). */
  const METER = '<div data-meter class="mt-2" aria-live="polite"></div>';

  /**
   * Warnhinweis, wenn die App über github.io läuft: Alle Seiten unter derselben
   * *.github.io-Adresse teilen sich den Browser-Speicher (gleiche "Origin").
   */
  function sharedOriginNotice() {
    if (!/\.github\.io$/i.test(location.hostname)) return '';
    return `<div class="notice mb-4" role="note">
      <strong>Hinweis zum Speicher:</strong> Auf <code>${Util.esc(location.hostname)}</code> teilen sich alle deine
      GitHub-Seiten denselben Browser-Speicher. Betreibst du dort weitere Seiten, kann deren Code die (verschlüsselten)
      Profile dieser App lesen. Besser: eine eigene (Sub-)Domain nur für diese App verwenden.
    </div>`;
  }

  /** Umschalter (Reiter). items = [[id, Beschriftung], ...] */
  function tabBar(items, active, action) {
    return `<div class="mb-4 flex gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-800" role="tablist">
      ${items.map(([id, label]) => `
        <button type="button" role="tab" class="tab" aria-selected="${id === active}"
          data-action="${action}" data-value="${id}">${label}</button>`).join('')}
    </div>`;
  }

  /* ---------- Anmeldung ---------- */

  function renderAuth() {
    el.app.hidden = true;
    el.auth.hidden = false;

    if (!Vault.available()) {
      el.authContent.innerHTML = `<div class="card">
        <h2 class="text-xl font-bold">Verschlüsselung nicht verfügbar</h2>
        <p class="mt-2">Dein Browser stellt die Verschlüsselung nur über <strong>https://</strong> oder
        <strong>http://localhost</strong> bereit. Öffne die App bitte auf einem dieser Wege
        (zum Beispiel über die Live-Vorschau von Phoenix Code).</p></div>`;
      return;
    }

    const profiles = Store.list();
    const mode = profiles.length === 0 ? 'register' : state.authMode;

    const importLink = `<label class="link cursor-pointer">Sicherung importieren
        <input type="file" class="hidden" accept="application/json,.json" data-change="import-file"></label>`;

    if (mode === 'login') {
      el.authContent.innerHTML = `
        <form data-form="login" class="card space-y-4">
          <h2 class="text-xl font-bold">Anmelden</h2>
          ${Store.getSettings().hideProfiles
            ? inputField({ id: 'login-username', label: 'Profilname', name: 'username',
                attrs: 'required autocomplete="username" autocapitalize="none" spellcheck="false"' })
            : `<div>
                <label class="label" for="login-profile">Profil</label>
                <select class="input" id="login-profile" name="profile" autocomplete="username">
                  ${profiles.map((p) => `<option value="${Util.esc(p.id)}">${Util.esc(p.username)}</option>`).join('')}
                </select>
              </div>`}
          ${inputField({ id: 'login-password', label: 'Passwort', name: 'password', type: 'password',
            attrs: 'required autocomplete="current-password"' })}
          <button class="btn-primary w-full" type="submit">Entsperren</button>
        </form>
        <p class="mt-4 text-center text-sm">
          <button class="link" type="button" data-action="auth-mode" data-value="register">Neues Profil anlegen</button>
          &nbsp;·&nbsp; ${importLink}
        </p>`;
    } else {
      el.authContent.innerHTML = `
        <form data-form="register" class="card space-y-4" novalidate>
          <h2 class="text-xl font-bold">Neues Profil anlegen</h2>
          <p class="text-sm text-slate-600 dark:text-slate-300">Deine Daten bleiben ausschließlich auf diesem Gerät und
          werden mit deinem Passwort verschlüsselt. <strong>Es gibt keine Passwort-Wiederherstellung</strong> –
          bitte merke dir das Passwort gut.</p>
          ${inputField({ id: 'reg-username', label: 'Profilname (zum Anmelden)', name: 'username',
            attrs: 'required maxlength="32" autocomplete="username"' })}
          ${inputField({ id: 'reg-display', label: 'Anzeigename (optional)', name: 'displayName', attrs: 'maxlength="40"' })}
          <div class="grid grid-cols-2 gap-3">
            ${inputField({ id: 'reg-birth', label: 'Geburtsjahr (optional)', name: 'birthYear', type: 'number',
              attrs: 'inputmode="numeric" placeholder="1970"' })}
            ${inputField({ id: 'reg-height', label: 'Größe in cm (optional)', name: 'heightCm', type: 'number',
              attrs: 'inputmode="numeric" placeholder="175"' })}
          </div>
          ${inputField({ id: 'reg-pw1', label: 'Passwort', name: 'password1', type: 'password',
            attrs: `required autocomplete="new-password" data-pw-source`, after: METER,
            help: `Mindestens ${CONFIG.MIN_PASSWORD_LENGTH} Zeichen. Am besten ein Satz aus mehreren Wörtern (Passphrase).` })}
          ${inputField({ id: 'reg-pw2', label: 'Passwort wiederholen', name: 'password2', type: 'password',
            attrs: 'required autocomplete="new-password"' })}
          <button class="btn-primary w-full" type="submit">Profil anlegen</button>
        </form>
        <p class="mt-4 text-center text-sm">
          ${profiles.length ? '<button class="link" type="button" data-action="auth-mode" data-value="login">Zur Anmeldung</button> &nbsp;·&nbsp; ' : ''}
          ${importLink}
        </p>`;
    }

    el.authContent.insertAdjacentHTML('afterbegin', sharedOriginNotice());
  }

  /* ---------- Rahmen: Navigation ---------- */

  function renderNav() {
    const side = Object.entries(VIEWS).map(([id, v]) => `
      <button type="button" data-action="nav" data-value="${id}"
        class="nav-side" ${state.view === id ? 'aria-current="page"' : ''}>
        ${icon(v.icon)}<span>${v.title}</span>
      </button>`).join('');
    el.navSide.innerHTML = side;

    el.navBottom.innerHTML = Object.entries(VIEWS).map(([id, v]) => `
      <button type="button" data-action="nav" data-value="${id}"
        class="nav-bottom" ${state.view === id ? 'aria-current="page"' : ''}>
        ${icon(v.icon)}<span>${v.title}</span>
      </button>`).join('');

    const platformName = { ios: 'iOS', android: 'Android', desktop: 'Desktop' }[document.documentElement.dataset.platform] || '';
    el.sideUser.innerHTML = `<p class="font-semibold">${Util.esc(displayName())}</p>
      <p class="text-xs text-slate-500 dark:text-slate-400">Bereich: ${platformName}</p>`;
  }

  function updateThemeIcons() {
    const dark = document.documentElement.classList.contains('dark');
    document.querySelectorAll('[data-theme-icon]').forEach((node) => {
      node.innerHTML = icon(dark ? 'sun' : 'moon');
    });
  }

  /* ---------- Reiter "Eintragen" ---------- */

  function viewEntry() {
    const tabs = [['vitals', 'Vitalwerte'], ['symptoms', 'Symptome'], ['comment', 'Kommentar']];
    const body = { vitals: entryVitals, symptoms: entrySymptoms, comment: entryComment }[state.entryTab]();
    return `
      <div class="mb-4">
        <label class="label" for="entry-date">Für welchen Tag?</label>
        <input class="input" type="date" id="entry-date" value="${Util.esc(state.date)}" max="${Util.today()}" data-change="entry-date">
      </div>
      ${tabBar(tabs, state.entryTab, 'entry-tab')}
      ${body}`;
  }

  /** Eine Zeile mit den Werten einer Messung. */
  function vitalParts(v) {
    const parts = [];
    if (v.sys != null) parts.push(`${Util.esc(v.sys)}/${Util.esc(v.dia)} mmHg`);
    if (v.pulse != null) parts.push(`Puls ${Util.esc(v.pulse)}`);
    if (v.weight != null) parts.push(`${Util.esc(Util.fmtNum(v.weight))} kg`);
    return parts.join(' · ');
  }

  function vitalsList(list, withDelete = true) {
    return `<ul class="divide-y divide-slate-200 dark:divide-slate-700">
      ${list.map((v) => `
        <li class="flex items-center justify-between gap-3 py-2">
          <div><p class="text-sm text-slate-500 dark:text-slate-400">${Util.esc(v.time)} Uhr</p>
          <p class="font-semibold">${vitalParts(v)}</p></div>
          ${withDelete ? `<button type="button" class="btn-danger px-3 py-1.5 text-sm" data-action="vitals-delete"
            data-id="${Util.esc(v.id)}" aria-label="Messung von ${Util.esc(v.time)} Uhr löschen">Löschen</button>` : ''}
        </li>`).join('')}
    </ul>`;
  }

  // --- Reiter: Vitalwerte (Blutdruckmessgerät + Waage) ---
  function entryVitals() {
    const list = vitalsOn(state.date);
    return `
      <form data-form="vitals-save" class="card space-y-4" novalidate>
        <p class="text-sm text-slate-600 dark:text-slate-300">Werte vom Blutdruckmessgerät und von der Waage.
        Du kannst mehrmals am Tag eine Messung eintragen.</p>
        ${inputField({ id: 'v-time', label: 'Uhrzeit', name: 'time', type: 'time', value: Util.nowTime() })}
        <div class="grid grid-cols-3 gap-3">
          ${inputField({ id: 'v-sys', label: 'Oben (sys)', name: 'sys', type: 'number', attrs: 'inputmode="numeric" placeholder="120"' })}
          ${inputField({ id: 'v-dia', label: 'Unten (dia)', name: 'dia', type: 'number', attrs: 'inputmode="numeric" placeholder="80"' })}
          ${inputField({ id: 'v-pulse', label: 'Puls', name: 'pulse', type: 'number', attrs: 'inputmode="numeric" placeholder="70"' })}
        </div>
        ${inputField({ id: 'v-weight', label: 'Gewicht (kg)', name: 'weight', type: 'number',
          attrs: 'inputmode="decimal" step="0.1" placeholder="75,5"' })}
        <button class="btn-primary w-full" type="submit">Messung speichern</button>
      </form>
      <section class="card mt-4">
        <h2 class="mb-1 font-bold">Messungen am ${Util.formatDate(state.date)}</h2>
        ${list.length ? vitalsList(list) : '<p class="text-slate-500 dark:text-slate-400">Noch keine Messung für diesen Tag.</p>'}
      </section>`;
  }

  // --- Reiter: Symptome (nur ein Eintrag pro Tag) ---
  function entrySymptoms() {
    const exists = !!(session.data.daily[state.date] && session.data.daily[state.date].symptoms);
    const custom = session.data.settings.customSymptoms;
    return `
      <form data-form="symptoms-save" class="card space-y-5">
        <p class="text-sm text-slate-600 dark:text-slate-300">Symptome und Befinden werden <strong>nur einmal pro Tag</strong>
        gespeichert. ${exists ? 'Für diesen Tag gibt es schon einen Eintrag – Speichern aktualisiert ihn.' : ''}</p>

        <div>
          <p class="label">Wie fühlst du dich insgesamt?</p>
          <div class="grid grid-cols-5 gap-2">
            ${CONFIG.MOODS.map((m, i) => `
              <button type="button" class="mood-btn" data-action="set-mood" data-value="${i + 1}"
                aria-pressed="${state.draft.mood === i + 1}" aria-label="${m.label}">${m.emoji}</button>`).join('')}
          </div>
        </div>

        <div>
          <p class="label">Was trifft heute zu?</p>
          <div class="flex flex-wrap gap-2">
            ${allSymptoms().map((s) => `
              <span class="inline-flex items-center gap-1">
                <button type="button" class="chip" data-action="toggle-symptom" data-name="${Util.esc(s)}"
                  aria-pressed="${state.draft.symptoms.includes(s)}">${Util.esc(s)}</button>
                ${custom.includes(s) ? `<button type="button" class="px-1 text-slate-500 hover:text-red-600 dark:text-slate-400"
                  data-action="remove-custom" data-name="${Util.esc(s)}" aria-label="Eigenes Symptom ${Util.esc(s)} entfernen">✕</button>` : ''}
              </span>`).join('')}
          </div>
          <p class="hint">Nichts ausgewählt und gespeichert = „keine Beschwerden“.</p>
        </div>

        <div>
          <label class="label" for="custom-symptom">Eigenes Symptom hinzufügen</label>
          <div class="flex gap-2">
            <input class="input" id="custom-symptom" type="text" maxlength="40" placeholder="z. B. Sodbrennen" autocomplete="off" spellcheck="false">
            <button type="button" class="btn-ghost shrink-0" data-action="add-custom">Hinzufügen</button>
          </div>
        </div>

        <button class="btn-primary w-full" type="submit">${exists ? 'Tageseintrag aktualisieren' : 'Tageseintrag speichern'}</button>
      </form>`;
  }

  // --- Reiter: Kommentar (nur ein Eintrag pro Tag) ---
  function entryComment() {
    const day = session.data.daily[state.date];
    const text = day && day.comment ? day.comment : '';
    return `
      <form data-form="comment-save" class="card space-y-4">
        <p class="text-sm text-slate-600 dark:text-slate-300">Freies Kommentarfeld, ebenfalls einmal pro Tag
        (z. B. Medikamente, Stress, Besonderheiten).</p>
        <div>
          <label class="label" for="comment-text">Kommentar</label>
          <textarea class="input min-h-[10rem]" id="comment-text" name="comment" autocomplete="off" spellcheck="false"
            maxlength="${CONFIG.MAX_COMMENT_LENGTH}">${Util.esc(text)}</textarea>
        </div>
        <button class="btn-primary w-full" type="submit">${text ? 'Kommentar aktualisieren' : 'Kommentar speichern'}</button>
      </form>`;
  }

  /* ---------- Reiter "Verlauf" ---------- */

  function viewHistory() {
    const tabs = [['vitals', 'Vitalwerte'], ['symptoms', 'Symptome'], ['comments', 'Kommentare']];
    const body = { vitals: historyVitals, symptoms: historySymptoms, comments: historyComments }[state.historyTab]();
    return tabBar(tabs, state.historyTab, 'history-tab') + body;
  }

  function historyVitals() {
    const all = sortedVitals();
    if (!all.length) return '<div class="card"><p class="text-slate-500 dark:text-slate-400">Noch keine Messungen vorhanden.</p></div>';

    const metrics = [['bp', 'Blutdruck'], ['pulse', 'Puls'], ['weight', 'Gewicht']];
    const chart = `
      <div class="card mb-4">
        <div class="mb-3 flex flex-wrap gap-2">
          ${metrics.map(([id, label]) => `<button type="button" class="chip" data-action="metric" data-value="${id}"
            aria-pressed="${state.metric === id}">${label}</button>`).join('')}
        </div>
        ${Charts.line(all.slice(-60), state.metric)}
      </div>`;

    // Nach Tag gruppieren, neueste zuerst, höchstens 60 Tage
    const byDate = new Map();
    all.forEach((v) => { if (!byDate.has(v.date)) byDate.set(v.date, []); byDate.get(v.date).push(v); });
    const days = [...byDate.keys()].sort().reverse().slice(0, 60);

    const groups = days.map((d, i) => `
      <details class="card mb-3" ${i === 0 ? 'open' : ''}>
        <summary class="flex cursor-pointer items-center justify-between gap-2 font-semibold">
          <span>${Util.formatDate(d)}</span>
          <span class="text-sm font-normal text-slate-500 dark:text-slate-400">${byDate.get(d).length} Messung${byDate.get(d).length > 1 ? 'en' : ''}</span>
        </summary>
        <div class="mt-2">${vitalsList(byDate.get(d))}</div>
      </details>`).join('');

    return chart + groups;
  }

  /** Tage mit Symptom-Eintrag, neueste zuerst. */
  function symptomDays() {
    return Object.entries(session.data.daily)
      .filter(([, d]) => d && (Array.isArray(d.symptoms) || d.mood))
      .sort((a, b) => b[0].localeCompare(a[0]));
  }

  function historySymptoms() {
    const days = symptomDays();
    if (!days.length) return '<div class="card"><p class="text-slate-500 dark:text-slate-400">Noch keine Symptom-Einträge vorhanden.</p></div>';

    // Häufigste Symptome der letzten 30 Tage
    const since = Util.daysAgo(30);
    const counts = Object.create(null); // ohne Prototyp: Symptome wie "constructor" stören nicht
    days.forEach(([date, d]) => {
      if (date >= since && Array.isArray(d.symptoms)) d.symptoms.forEach((s) => { counts[s] = (counts[s] || 0) + 1; });
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const stats = `
      <div class="card mb-4">
        <h2 class="mb-2 font-bold">Häufigste Symptome (letzte 30 Tage)</h2>
        ${top.length
          ? `<ul class="space-y-1">${top.map(([name, n]) => `<li class="flex justify-between"><span>${Util.esc(name)}</span><span class="text-slate-500 dark:text-slate-400">${n} Tag${n > 1 ? 'e' : ''}</span></li>`).join('')}</ul>`
          : '<p class="text-slate-500 dark:text-slate-400">Keine Symptome in diesem Zeitraum.</p>'}
      </div>`;

    const list = days.slice(0, 60).map(([date, d], i) => {
      const mood = d.mood ? CONFIG.MOODS[d.mood - 1] : null;
      const symptoms = Array.isArray(d.symptoms) ? d.symptoms : [];
      return `
        <details class="card mb-3" ${i === 0 ? 'open' : ''}>
          <summary class="flex cursor-pointer items-center justify-between gap-2 font-semibold">
            <span>${Util.formatDate(date)}</span>
            <span class="text-sm font-normal text-slate-500 dark:text-slate-400">${mood ? mood.emoji + ' ' : ''}${symptoms.length} Symptom${symptoms.length === 1 ? '' : 'e'}</span>
          </summary>
          <div class="mt-3 space-y-2">
            ${mood ? `<p>Befinden: ${mood.emoji} ${mood.label}</p>` : ''}
            ${symptoms.length
              ? `<div class="flex flex-wrap gap-2">${symptoms.map((s) => `<span class="chip-static">${Util.esc(s)}</span>`).join('')}</div>`
              : '<p class="text-slate-500 dark:text-slate-400">Keine Beschwerden.</p>'}
          </div>
        </details>`;
    }).join('');

    return stats + list;
  }

  function historyComments() {
    const days = Object.entries(session.data.daily)
      .filter(([, d]) => d && d.comment)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 60);
    if (!days.length) return '<div class="card"><p class="text-slate-500 dark:text-slate-400">Noch keine Kommentare vorhanden.</p></div>';
    return days.map(([date, d], i) => `
      <details class="card mb-3" ${i === 0 ? 'open' : ''}>
        <summary class="cursor-pointer font-semibold">${Util.formatDate(date)}</summary>
        <p class="mt-2 whitespace-pre-wrap">${Util.esc(d.comment)}</p>
      </details>`).join('');
  }

  /* ---------- Reiter "Profil" ---------- */

  function viewProfile() {
    const p = session.data.profile;
    const currentYear = new Date().getFullYear();
    const platform = document.documentElement.dataset.platform;

    const guides = [
      ['ios', 'iOS (iPhone/iPad)',
        'In Safari öffnen, auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen. Danach die App immer über das Symbol starten. ' +
        'Wichtig: Safari löscht Daten normaler Webseiten nach 7 Tagen ohne Nutzung – installierte Apps sind davon ausgenommen.'],
      ['android', 'Android',
        'In Chrome das Menü (⋮) öffnen und „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen.'],
      ['desktop', 'Desktop (Windows, macOS, Linux)',
        'In Chrome oder Edge das Installieren-Symbol in der Adressleiste anklicken. In anderen Browsern die Seite als Lesezeichen speichern.'],
    ];

    return `
      ${sharedOriginNotice()}
      <form data-form="profile-save" class="card mb-4 space-y-4" novalidate>
        <h2 class="text-lg font-bold">Mein Profil</h2>
        <p class="text-sm text-slate-600 dark:text-slate-300">Angemeldet als <strong>${Util.esc(session.record.username)}</strong></p>
        ${inputField({ id: 'p-display', label: 'Anzeigename', name: 'displayName', value: p.displayName, attrs: 'maxlength="40"' })}
        <div class="grid grid-cols-2 gap-3">
          ${inputField({ id: 'p-birth', label: 'Geburtsjahr', name: 'birthYear', type: 'number', value: p.birthYear ?? '',
            attrs: `inputmode="numeric" min="1900" max="${currentYear}"` })}
          ${inputField({ id: 'p-height', label: 'Größe (cm)', name: 'heightCm', type: 'number', value: p.heightCm ?? '',
            attrs: 'inputmode="numeric" min="50" max="250"' })}
        </div>
        <div>
          <label class="label" for="p-notes">Notizen (z. B. Medikamente, Allergien)</label>
          <textarea class="input min-h-[6rem]" id="p-notes" name="notes" maxlength="1000" autocomplete="off" spellcheck="false">${Util.esc(p.notes)}</textarea>
        </div>
        <button class="btn-primary w-full" type="submit">Profil speichern</button>
      </form>

      <section class="card mb-4 space-y-3">
        <h2 class="text-lg font-bold">Datenschutz auf diesem Gerät</h2>
        <label class="flex items-start gap-3">
          <input type="checkbox" class="mt-1 h-5 w-5 shrink-0 accent-teal-700" data-change="hide-profiles"
            ${Store.getSettings().hideProfiles ? 'checked' : ''}>
          <span>Profilnamen auf der Anmeldeseite verbergen
            <span class="hint block">Statt der Profilliste tippst du deinen Profilnamen ein. So sieht niemand mit
            Zugriff auf das Gerät, welche Profile es gibt.</span></span>
        </label>
        <p class="hint">Schutz vor Raten: Ab dem 3. falschen Passwort wächst die Wartezeit bei der Anmeldung
        automatisch (5, 10, 20 … Sekunden).</p>
      </section>

      <section class="card mb-4 space-y-3">
        <h2 class="text-lg font-bold">Sicherung</h2>
        <p class="text-sm text-slate-600 dark:text-slate-300">Deine Daten liegen nur in diesem Browser. Wenn du die
        Browserdaten löschst oder das Gerät wechselst, sind sie weg – mach daher ab und zu eine Sicherung.</p>
        <button type="button" class="btn-ghost w-full" data-action="export-profile">Verschlüsselte Sicherung herunterladen</button>
        <button type="button" class="btn-ghost w-full" data-action="export-csv-vitals">Vitalwerte als CSV (unverschlüsselt)</button>
        <button type="button" class="btn-ghost w-full" data-action="export-csv-days">Symptome &amp; Kommentare als CSV (unverschlüsselt)</button>
        <p class="hint">Die CSV-Dateien sind nicht geschützt – gut für den Arzttermin, aber nicht weitergeben oder liegen lassen.</p>
      </section>

      <form data-form="password-change" class="card mb-4 space-y-4" novalidate>
        <h2 class="text-lg font-bold">Passwort ändern</h2>
        ${inputField({ id: 'pw-old', label: 'Aktuelles Passwort', name: 'old', type: 'password', attrs: 'autocomplete="current-password"' })}
        ${inputField({ id: 'pw-new1', label: 'Neues Passwort', name: 'new1', type: 'password', attrs: 'autocomplete="new-password" data-pw-source', after: METER,
          help: `Mindestens ${CONFIG.MIN_PASSWORD_LENGTH} Zeichen. Bereits heruntergeladene Sicherungen bleiben mit dem alten Passwort lesbar – lösche sie nach einem Wechsel.` })}
        ${inputField({ id: 'pw-new2', label: 'Neues Passwort wiederholen', name: 'new2', type: 'password', attrs: 'autocomplete="new-password"' })}
        <button class="btn-ghost w-full" type="submit">Passwort ändern</button>
      </form>

      <section class="card mb-4 space-y-3">
        <h2 class="text-lg font-bold">Installieren (iOS · Android · Desktop)</h2>
        ${installPrompt ? '<button type="button" class="btn-primary w-full" data-action="install">App jetzt installieren</button>' : ''}
        ${guides.map(([id, title, text]) => `
          <div class="rounded-xl border p-3 ${id === platform
            ? 'border-teal-600 bg-teal-50 dark:border-teal-400 dark:bg-teal-950/40'
            : 'border-slate-200 dark:border-slate-700'}">
            <p class="font-semibold">${title}${id === platform ? ' <span class="text-sm font-normal text-teal-700 dark:text-teal-300">(dein Gerät)</span>' : ''}</p>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">${text}</p>
          </div>`).join('')}
      </section>

      <form data-form="profile-delete" class="card space-y-4" novalidate>
        <h2 class="text-lg font-bold text-red-700 dark:text-red-300">Profil löschen</h2>
        <p class="text-sm text-slate-600 dark:text-slate-300">Löscht dieses Profil und alle Daten endgültig von diesem Gerät.</p>
        ${inputField({ id: 'del-pw', label: 'Passwort zur Bestätigung', name: 'password', type: 'password', attrs: 'autocomplete="current-password"' })}
        <button class="btn-danger w-full" type="submit">Profil endgültig löschen</button>
      </form>`;
  }

  /* ---------- Gesamtdarstellung ---------- */

  function render() {
    if (!session) { renderAuth(); return; }
    el.auth.hidden = true;
    el.app.hidden = false;
    el.title.textContent = VIEWS[state.view].title;
    renderNav();
    el.content.innerHTML = { entry: viewEntry, history: viewHistory, profile: viewProfile }[state.view]();
    updateThemeIcons();
  }

  /* ===================================================================
   *  5. AKTIONEN UND FORMULARE
   * =================================================================== */

  function checkRange(key, label, value) {
    if (value == null) return;
    const [min, max] = CONFIG.LIMITS[key];
    if (value < min || value > max) {
      throw new Error(`${label}: bitte einen Wert zwischen ${min} und ${max} eingeben.`);
    }
  }

  /** Prüft ein neues Passwort (Länge, häufige Muster, Stärke) und die Wiederholung. */
  function checkNewPassword(p1, p2, username) {
    const check = Util.passwordCheck(p1, username, CONFIG.MIN_PASSWORD_LENGTH);
    if (!check.ok) throw new Error(`Passwort zu schwach: ${check.problems[0]}.`);
    if (p1 !== p2) throw new Error('Die beiden Passwörter sind nicht gleich.');
  }

  /** Aktualisiert die Stärkeanzeige unter einem Passwortfeld. */
  function updateMeter(form) {
    const meter = form.querySelector('[data-meter]');
    const field = form.querySelector('[data-pw-source]');
    if (!meter || !field) return;
    if (!field.value) { meter.innerHTML = ''; return; }
    const usernameField = form.querySelector('input[name="username"]');
    const username = usernameField ? usernameField.value : (session ? session.record.username : '');
    const r = Util.passwordCheck(field.value, username, CONFIG.MIN_PASSWORD_LENGTH);
    const colors = ['bg-red-500', 'bg-amber-500', 'bg-teal-600'];
    const names = ['', 'Schwach', 'Mittel', 'Stark'];
    const bars = [1, 2, 3].map((i) =>
      `<span class="h-1.5 flex-1 rounded-full ${r.level >= i ? colors[r.level - 1] : 'bg-slate-300 dark:bg-slate-600'}"></span>`).join('');
    meter.innerHTML = `<div class="flex gap-1">${bars}</div>
      <p class="hint">${names[r.level]}${r.problems.length ? ' – ' + Util.esc(r.problems[0]) : ' – gut so'} <span class="opacity-70">(grobe Schätzung)</span></p>`;
  }

  /** Leert alle sichtbaren und versteckten Bereiche der App (nach Abmeldung). */
  function wipeUi() {
    el.content.innerHTML = '';
    el.navSide.innerHTML = '';
    el.navBottom.innerHTML = '';
    el.sideUser.innerHTML = '';
    el.title.textContent = '';
    state.draft = { mood: null, symptoms: [] };
    state.view = 'entry';
    state.entryTab = 'vitals';
    state.historyTab = 'vitals';
    state.date = Util.today();
  }

  function optionalInt(value, label, min, max) {
    const n = Util.num(value);
    if (n == null) return null;
    if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${label}: bitte eine ganze Zahl zwischen ${min} und ${max} eingeben.`);
    return n;
  }

  /** Meldet an: Sitzung setzen und App anzeigen. */
  function enterApp(newSession) {
    session = newSession;
    session.data = normalize(session.data);
    el.authContent.innerHTML = ''; // Anmeldeformular samt eingetipptem Passwort aus dem DOM entfernen
    state.view = 'entry';
    state.entryTab = 'vitals';
    state.historyTab = 'vitals';
    state.date = Util.today();
    loadDraft();
    resetLockTimer();
    Store.requestPersistence();
    render();
    window.scrollTo(0, 0);
  }

  function logout(message) {
    session = null;                 // Schlüssel und Daten verschwinden aus dem Speicher
    clearTimeout(lockTimer);
    wipeUi();                       // ... und auch aus der Seite (DOM)
    hiddenSince = 0;
    setCover(false);
    state.authMode = 'login';
    render();
    if (message) toast(message);
  }

  /* ---------- Schaltflächen (data-action) ---------- */
  const actions = {
    'nav': (t) => { state.view = t.dataset.value; render(); window.scrollTo(0, 0); },
    'entry-tab': (t) => { state.entryTab = t.dataset.value; render(); },
    'history-tab': (t) => { state.historyTab = t.dataset.value; render(); },
    'metric': (t) => { state.metric = t.dataset.value; render(); },
    'auth-mode': (t) => { state.authMode = t.dataset.value; render(); },
    'toggle-theme': toggleTheme,
    'logout': () => logout(),

    'set-mood': (t) => {
      const v = Number(t.dataset.value);
      state.draft.mood = state.draft.mood === v ? null : v; // zweiter Klick = abwählen
      render();
    },
    'toggle-symptom': (t) => {
      const name = t.dataset.name;
      const list = state.draft.symptoms;
      state.draft.symptoms = list.includes(name) ? list.filter((s) => s !== name) : [...list, name];
      render();
    },
    'add-custom': async () => {
      const input = $('#custom-symptom');
      const name = input.value.trim().slice(0, 40);
      if (!name) return;
      const known = allSymptoms().map((s) => s.toLowerCase());
      if (known.includes(name.toLowerCase())) throw new Error('Dieses Symptom gibt es schon.');
      session.data.settings.customSymptoms.push(name);
      state.draft.symptoms.push(name);
      await persist();
      render();
    },
    'remove-custom': async (t) => {
      const name = t.dataset.name;
      if (!confirm(`„${name}“ aus deiner Liste entfernen? Bereits gespeicherte Tage bleiben unverändert.`)) return;
      session.data.settings.customSymptoms = session.data.settings.customSymptoms.filter((s) => s !== name);
      state.draft.symptoms = state.draft.symptoms.filter((s) => s !== name);
      await persist();
      render();
    },
    'vitals-delete': async (t) => {
      if (!confirm('Diese Messung löschen?')) return;
      session.data.vitals = session.data.vitals.filter((v) => v.id !== t.dataset.id);
      await persist();
      render();
      toast('Messung gelöscht.');
    },

    'export-profile': () => {
      const text = JSON.stringify(session.record, null, 2);
      Util.download(`meine-werte-sicherung-${Util.slug(session.record.username)}-${Util.today()}.json`, text, 'application/json');
      toast('Sicherung heruntergeladen (verschlüsselt).');
    },
    'export-csv-vitals': () => {
      const rows = [['Datum', 'Uhrzeit', 'Oben', 'Unten', 'Puls', 'Gewicht (kg)']];
      sortedVitals().forEach((v) => rows.push([v.date, v.time, v.sys, v.dia, v.pulse, v.weight == null ? '' : Util.fmtNum(v.weight)]));
      Util.download(`vitalwerte-${Util.today()}.csv`, toCsv(rows), 'text/csv');
    },
    'export-csv-days': () => {
      const rows = [['Datum', 'Befinden (1-5)', 'Symptome', 'Kommentar']];
      Object.keys(session.data.daily).sort().forEach((date) => {
        const d = session.data.daily[date];
        rows.push([date, d.mood || '', Array.isArray(d.symptoms) ? d.symptoms.join(', ') : '', d.comment || '']);
      });
      Util.download(`symptome-${Util.today()}.csv`, toCsv(rows), 'text/csv');
    },

    'install': async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      render();
    },
  };

  /** CSV mit Semikolon (Excel in Deutschland). Schützt vor Formel-Einschleusung. */
  function toCsv(rows) {
    const cell = (value) => {
      let s = value == null ? '' : String(value);
      if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    return '\uFEFF' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
  }

  /* ---------- Anmeldeschutz (Wartezeit nach Fehlversuchen) ---------- */

  const GENERIC_LOGIN_ERROR = 'Profilname oder Passwort ist falsch.';

  /** Wirft einen Fehler, solange für diesen Schlüssel (Profil-ID oder '_unknown') eine Sperre läuft. */
  function assertNotLocked(key) {
    const f = Store.getFail(key);
    if (f.until > Date.now()) {
      const sec = Math.ceil((f.until - Date.now()) / 1000);
      throw new Error(`Zu viele Fehlversuche. Bitte warte noch ${sec} Sekunde${sec === 1 ? '' : 'n'}.`);
    }
  }

  /** Zählt einen Fehlversuch und setzt ggf. die Wartezeit (verdoppelt sich, max. 15 Minuten). */
  function registerFailure(key) {
    const n = Store.getFail(key).n + 1;
    const wait = n >= CONFIG.FREE_ATTEMPTS ? Math.min(900, 5 * 2 ** (n - CONFIG.FREE_ATTEMPTS)) : 0;
    Store.setFail(key, { n, until: wait ? Date.now() + wait * 1000 : 0 });
  }

  /** Passwortprüfung mit Wartezeit-Schutz (für Passwortwechsel und Profil löschen). */
  async function verifyGuarded(record, password) {
    assertNotLocked(record.id);
    const ok = await Vault.verify(record, password);
    if (ok) Store.clearFail(record.id); else registerFailure(record.id);
    return ok;
  }

  /* ---------- Import: Sicherungsdatei streng prüfen ---------- */

  /** Länge in Bytes eines Base64-Textes, oder -1 wenn es kein gültiges Base64 ist. */
  function b64Bytes(text) {
    if (typeof text !== 'string' || text.length === 0 || text.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(text)) return -1;
    try { return atob(text).length; } catch (e) { return -1; }
  }

  /** Prüft jede Angabe der Datei und gibt einen bereinigten Datensatz zurück (sonst Fehler). */
  function validateImportedRecord(rec) {
    const bad = () => new Error('Das ist keine gültige Sicherungsdatei.');
    if (!rec || typeof rec !== 'object' || Array.isArray(rec)) throw bad();
    if (!/^[0-9a-f]{16}$/.test(String(rec.id))) throw bad();
    const name = rec.username;
    if (typeof name !== 'string' || !name || name !== name.trim() || name.length > CONFIG.MAX_USERNAME_LENGTH
        || /[\u0000-\u001f\u007f]/.test(name)) throw bad();
    if (!(rec.v === undefined || rec.v === 1 || rec.v === 2)) throw bad();
    if (!Number.isInteger(rec.iterations) || rec.iterations < 200000 || rec.iterations > Vault.MAX_ITERATIONS) throw bad();
    if (b64Bytes(rec.salt) !== 16 || b64Bytes(rec.verifier) !== 32 || b64Bytes(rec.iv) !== 12) throw bad();
    const ctBytes = b64Bytes(rec.ct);
    if (ctBytes < 17 || ctBytes > 2 * 1024 * 1024) throw bad();
    return {
      id: rec.id, v: rec.v === 2 ? 2 : 1, username: name, iterations: rec.iterations,
      salt: rec.salt, verifier: rec.verifier, iv: rec.iv, ct: rec.ct,
    };
  }

  /* ---------- Sichtschutz beim App-Wechsel ---------- */

  function setCover(on) {
    if (el.cover) el.cover.hidden = !(on && session);
  }
  function onHide() {
    if (!session) return;
    setCover(true);                       // Vorschaubild im App-Umschalter zeigt nur den Schutzschirm
    if (!hiddenSince) hiddenSince = Date.now();
  }
  function onShow() {
    const away = hiddenSince ? Date.now() - hiddenSince : 0;
    hiddenSince = 0;
    if (session && CONFIG.HIDDEN_LOCK_MINUTES && away >= CONFIG.HIDDEN_LOCK_MINUTES * 60000) {
      logout('Aus Sicherheitsgründen abgemeldet (App war im Hintergrund).');
      return;
    }
    setCover(false);
    checkLock();
  }

  /* ---------- Formulare (data-form) ---------- */
  const forms = {
    // Anmelden
    async login(form) {
      const f = new FormData(form);
      const password = String(f.get('password'));
      const byName = !f.has('profile');                 // Profilnamen verborgen: Name wird eingetippt
      const record = byName
        ? Store.findByUsername(String(f.get('username')).trim())
        : Store.findById(String(f.get('profile')));

      const throttleKey = record ? record.id : '_unknown';
      assertNotLocked(throttleKey);

      if (!record) {
        await Vault.dummy(password);                    // gleiche Rechenzeit wie bei echtem Profil
        registerFailure(throttleKey);
        throw new Error(GENERIC_LOGIN_ERROR);
      }

      let unlocked;
      try {
        unlocked = await Vault.unlock(record, password);
      } catch (err) {
        if (err.code === 'BAD_PASSWORD') {
          registerFailure(throttleKey);
          throw new Error(byName ? GENERIC_LOGIN_ERROR : err.message);
        }
        throw err;
      }
      Store.clearFail(throttleKey);

      const { key, data } = unlocked;
      let current = { record, key };

      // Profile aus älteren Versionen (weniger PBKDF2-Runden oder ohne Bindung) automatisch aufwerten
      if (record.iterations < Vault.ITERATIONS || record.v !== Vault.VERSION) {
        try {
          const upgraded = await Vault.changePassword(record, password, data); // gleiches Passwort, neues Salt
          if (Store.upsert(upgraded.record)) current = upgraded;
        } catch (e) { /* Anmeldung trotzdem fortsetzen */ }
      }
      enterApp({ record: current.record, key: current.key, data });
    },

    // Profil anlegen
    async register(form) {
      const f = new FormData(form);
      const username = String(f.get('username')).trim();
      if (!username) throw new Error('Bitte einen Profilnamen eingeben.');
      if (username.length > CONFIG.MAX_USERNAME_LENGTH) throw new Error(`Der Profilname darf höchstens ${CONFIG.MAX_USERNAME_LENGTH} Zeichen lang sein.`);
      if (/[\u0000-\u001f\u007f]/.test(username)) throw new Error('Der Profilname enthält ungültige Zeichen.');
      if (Store.findByUsername(username)) throw new Error('Diesen Profilnamen gibt es schon.');
      const pw1 = String(f.get('password1'));
      checkNewPassword(pw1, String(f.get('password2')), username);

      const year = new Date().getFullYear();
      const data = newData({
        displayName: String(f.get('displayName')).trim().slice(0, 40),
        birthYear: optionalInt(f.get('birthYear'), 'Geburtsjahr', 1900, year),
        heightCm: optionalInt(f.get('heightCm'), 'Größe', 50, 250),
      });
      const { record, key } = await Vault.createRecord(username, pw1, data);
      if (!Store.upsert(record)) throw new Error('Speichern nicht möglich (Speicher voll oder vom Browser gesperrt).');
      enterApp({ record, key, data });
      toast('Profil angelegt. Willkommen!');
    },

    // Messung (Blutdruck, Puls, Gewicht) – darf mehrfach pro Tag vorkommen
    async 'vitals-save'(form) {
      const f = new FormData(form);
      const sys = Util.num(f.get('sys'));
      const dia = Util.num(f.get('dia'));
      const pulse = Util.num(f.get('pulse'));
      const weight = Util.num(f.get('weight'));

      if (sys == null && dia == null && pulse == null && weight == null) throw new Error('Bitte mindestens einen Wert eintragen.');
      if ((sys == null) !== (dia == null)) throw new Error('Blutdruck braucht den oberen und den unteren Wert.');
      checkRange('sys', 'Oberer Wert', sys);
      checkRange('dia', 'Unterer Wert', dia);
      checkRange('pulse', 'Puls', pulse);
      checkRange('weight', 'Gewicht', weight);
      if (sys != null && sys <= dia) throw new Error('Der obere Wert muss größer als der untere sein.');

      session.data.vitals.push({
        id: Util.uid(),
        date: state.date,
        time: String(f.get('time')) || Util.nowTime(),
        sys: sys == null ? null : Math.round(sys),
        dia: dia == null ? null : Math.round(dia),
        pulse: pulse == null ? null : Math.round(pulse),
        weight: weight == null ? null : Math.round(weight * 10) / 10,
      });
      await persist();
      render();
      toast('Messung gespeichert.');
    },

    // Symptome + Befinden – ein Eintrag pro Tag (wird bei erneutem Speichern ersetzt)
    async 'symptoms-save'() {
      const prev = session.data.daily[state.date] || { mood: null, symptoms: null, comment: '' };
      session.data.daily[state.date] = {
        ...prev,
        mood: state.draft.mood,
        symptoms: [...state.draft.symptoms],
        updated: Date.now(),
      };
      await persist();
      render();
      toast('Tageseintrag gespeichert.');
    },

    // Kommentar – ein Eintrag pro Tag
    async 'comment-save'(form) {
      const text = String(new FormData(form).get('comment')).trim().slice(0, CONFIG.MAX_COMMENT_LENGTH);
      const prev = session.data.daily[state.date] || { mood: null, symptoms: null, comment: '' };
      const next = { ...prev, comment: text, updated: Date.now() };
      // Ist der Tag komplett leer, entfernen wir ihn wieder
      if (!text && !next.mood && !Array.isArray(next.symptoms)) delete session.data.daily[state.date];
      else session.data.daily[state.date] = next;
      await persist();
      render();
      toast('Kommentar gespeichert.');
    },

    async 'profile-save'(form) {
      const f = new FormData(form);
      const year = new Date().getFullYear();
      session.data.profile = {
        displayName: String(f.get('displayName')).trim().slice(0, 40),
        birthYear: optionalInt(f.get('birthYear'), 'Geburtsjahr', 1900, year),
        heightCm: optionalInt(f.get('heightCm'), 'Größe', 50, 250),
        notes: String(f.get('notes')).slice(0, 1000),
      };
      await persist();
      render();
      toast('Profil gespeichert.');
    },

    async 'password-change'(form) {
      const f = new FormData(form);
      if (!(await verifyGuarded(session.record, String(f.get('old'))))) throw new Error('Das aktuelle Passwort ist falsch.');
      const pw = String(f.get('new1'));
      checkNewPassword(pw, String(f.get('new2')), session.record.username);
      const { record, key } = await Vault.changePassword(session.record, pw, session.data);
      if (!Store.upsert(record)) throw new Error('Speichern nicht möglich (Speicher voll oder vom Browser gesperrt).');
      session.record = record;
      session.key = key;
      form.reset();
      toast('Passwort geändert.');
    },

    async 'profile-delete'(form) {
      const pw = String(new FormData(form).get('password'));
      if (!(await verifyGuarded(session.record, pw))) throw new Error('Das Passwort ist falsch.');
      if (!confirm('Wirklich ALLE Daten dieses Profils von diesem Gerät löschen? Das kann nicht rückgängig gemacht werden.')) return;
      Store.remove(session.record.id);
      logout('Profil gelöscht.');
    },
  };

  /* ---------- Änderungen an Feldern (data-change) ---------- */
  const changes = {
    'entry-date': (input) => {
      if (!input.value) return;
      state.date = input.value;
      loadDraft();
      render();
    },
    'hide-profiles': (input) => {
      if (!Store.setSetting('hideProfiles', input.checked)) throw new Error('Einstellung konnte nicht gespeichert werden.');
      toast(input.checked
        ? 'Profilnamen werden auf der Anmeldeseite nicht mehr angezeigt.'
        : 'Profilnamen werden auf der Anmeldeseite wieder angezeigt.');
    },
    'import-file': async (input) => {
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) throw new Error('Die Datei ist zu groß (höchstens 5 MB).');
      let rec;
      try { rec = JSON.parse(await file.text()); } catch (e) { throw new Error('Das ist keine gültige Sicherungsdatei.'); }

      const clean = validateImportedRecord(rec);     // wirft bei ungültigen Dateien
      if (Store.findById(clean.id) || Store.findByUsername(clean.username)) {
        throw new Error('Dieses Profil (oder ein Profil mit gleichem Namen) ist schon vorhanden.');
      }
      if (!Store.upsert(clean)) throw new Error('Speichern nicht möglich (Speicher voll oder vom Browser gesperrt).');
      state.authMode = 'login';
      render();
      toast('Profil importiert. Du kannst dich jetzt anmelden.');
    },
  };

  /* ---------- Hell/Dunkel ---------- */
  function toggleTheme() {
    const root = document.documentElement;
    const dark = !root.classList.contains('dark');
    root.classList.toggle('dark', dark);
    Store.setTheme(dark ? 'dark' : 'light');
    updateThemeIcons();
  }

  /* ---------- Automatische Abmeldung ---------- */
  function resetLockTimer() {
    lastActivity = Date.now();
    clearTimeout(lockTimer);
    if (!session || !CONFIG.AUTO_LOCK_MINUTES) return;
    lockTimer = setTimeout(checkLock, CONFIG.AUTO_LOCK_MINUTES * 60000);
  }
  function checkLock() {
    if (!session || !CONFIG.AUTO_LOCK_MINUTES) return;
    if (Date.now() - lastActivity >= CONFIG.AUTO_LOCK_MINUTES * 60000) logout('Aus Sicherheitsgründen abgemeldet (keine Bedienung).');
    else resetLockTimer();
  }

  /* ===================================================================
   *  6. START
   * =================================================================== */

  /** Führt eine Aktion aus; Fehler werden als Meldung angezeigt. */
  async function run(task, button) {
    if (button) button.disabled = true;
    try {
      await task();
      return true;
    } catch (err) {
      showError(err);
      return false;
    } finally {
      if (button && button.isConnected) button.disabled = false;
    }
  }

  function init() {
    document.documentElement.dataset.platform = Util.detectPlatform();

    // Klicks auf Elemente mit data-action
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action]');
      if (!t || !actions[t.dataset.action]) return;
      run(() => actions[t.dataset.action](t, e), null);
    });

    // Formulare mit data-form
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('form[data-form]');
      if (!form || !forms[form.dataset.form]) return;
      e.preventDefault();
      const name = form.dataset.form;
      run(() => forms[name](form), form.querySelector('[type="submit"]')).then((ok) => {
        // Eingetippte Passwörter nicht im DOM liegen lassen (Ausnahme: Fehler beim Anlegen,
        // damit du nicht alles neu tippen musst)
        if (!form.isConnected || (name === 'register' && !ok)) return;
        form.querySelectorAll('input[type="password"]').forEach((input) => { input.value = ''; });
        updateMeter(form);
      });
    });

    // Stärkeanzeige beim Tippen
    document.addEventListener('input', (e) => {
      const t = e.target;
      if (!t || !t.matches || !t.matches('[data-pw-source], input[name="username"]')) return;
      const form = t.closest('form');
      if (form) updateMeter(form);
    });

    // Felder mit data-change
    document.addEventListener('change', (e) => {
      const t = e.target;
      if (t && t.dataset && changes[t.dataset.change]) run(() => changes[t.dataset.change](t), null);
    });

    // Aktivität für die automatische Abmeldung
    ['pointerdown', 'keydown', 'touchstart'].forEach((name) =>
      document.addEventListener(name, () => { if (session) resetLockTimer(); }, { passive: true }));
    document.addEventListener('visibilitychange', () => { if (document.hidden) onHide(); else onShow(); });
    window.addEventListener('pagehide', onHide);
    window.addEventListener('pageshow', onShow);
    // Auf Handy/Tablet schon beim Verlassen des Fensters abdecken (App-Umschalter)
    if (document.documentElement.dataset.platform !== 'desktop') {
      window.addEventListener('blur', onHide);
      window.addEventListener('focus', onShow);
    }

    // Systemwechsel Hell/Dunkel übernehmen, solange keine eigene Wahl gespeichert ist
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!Store.getTheme()) { document.documentElement.classList.toggle('dark', e.matches); updateThemeIcons(); }
      });
    }

    // "App installieren" (Chrome/Edge/Android)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installPrompt = e;
      if (session && state.view === 'profile') render();
    });

    // Offline-Fähigkeit (Service Worker) – nur über http(s)
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* nicht schlimm */ });
    }

    render();
  }

  init();
  return { CONFIG };
})();
