/* =====================================================================
 *  theme-init.js – setzt Hell/Dunkel, BEVOR die Seite gezeichnet wird
 *  (verhindert kurzes Aufblitzen des falschen Modus).
 *  Regel: gespeicherte Wahl gewinnt, sonst die Systemeinstellung.
 * ===================================================================== */
(function () {
  try {
    var saved = localStorage.getItem('mw2:theme'); // 'dark' | 'light' | null
    var dark = saved
      ? saved === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) { /* ohne Speicher einfach hell lassen */ }
})();
